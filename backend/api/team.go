package api

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	cryptoRand "crypto/rand"

	"github.com/colecaccamise/go-backend/models"
	"github.com/colecaccamise/go-backend/util"
	"github.com/go-chi/chi"
	"github.com/google/uuid"
	"github.com/workos/workos-go/v4/pkg/organizations"
)

var RESERVED_TEAM_SLUGS = []string{"support", "help", "helpcenter", "banking", "account", "settings", "admin", "system", "faq", "docs", "documentation", "root", "profile", "billing", "login", "signin", "signup", "auth", "signout", "register", "api", "dashboard", "notifications", "team", "teams", "legal", "onboarding", "terms", "privacy"}

func (s *Server) handleCreateTeam(w http.ResponseWriter, r *http.Request) error {
	userSession, err := getUserSession(s, r)

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	user := userSession.User

	teamReq := new(models.CreateTeamRequest)

	if err := json.NewDecoder(r.Body).Decode(teamReq); err != nil {
		errorMsg := "invalid request"
		if err == io.EOF {
			errorMsg = "request body is empty"
		}
		return WriteJSON(w, http.StatusBadRequest, Error{Error: errorMsg, Code: "invalid_request"})
	}

	// validate team name

	// trim whitespace
	teamReq.Name = strings.TrimSpace(teamReq.Name)

	// check length
	if len(teamReq.Name) < 3 || len(teamReq.Name) > 32 {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Message: "invalid team name",
			Error:   "team name must be between 3 and 32 characters.",
			Code:    "team_name_length",
		})
	}

	// validate characters (allow alphanumeric, spaces, hyphens, underscores)
	if !regexp.MustCompile(`^[a-zA-Z0-9][-a-zA-Z0-9\s_]*[a-zA-Z0-9]$`).MatchString(teamReq.Name) {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Message: "invalid team name",
			Error:   "team name can only contain letters, numbers, spaces, hyphens and underscores, and must start and end with a letter or number.",
			Code:    "team_name_invalid",
		})
	}

	// check for consecutive special characters
	if regexp.MustCompile(`[-_\s]{2,}`).MatchString(teamReq.Name) {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Message: "invalid team name",
			Error:   "team name cannot contain consecutive special characters.",
			Code:    "team_name_consecutive",
		})
	}

	// create workos organization
	organizations.SetAPIKey(os.Getenv("WORKOS_API_KEY"))

	// todo later add/update domain data for an org
	org, err := organizations.CreateOrganization(
		context.Background(),
		organizations.CreateOrganizationOpts{
			Name: teamReq.Name,
		},
	)

	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error.",
			Code:  "internal_server_error",
		})
	}

	// create team
	team := models.NewTeam(&models.CreateTeamRequest{
		Name:        teamReq.Name,
		WorkosOrgID: org.ID,
	})

	// generate unique team slug
	i := 0
	for {
		var slugBase string
		if i == 0 {
			slugBase = strings.ToLower(team.Name)
		} else {
			slugBase = fmt.Sprintf("%s %d", strings.ToLower(team.Name), i)
		}

		team.Slug = util.GenerateSlug(slugBase)

		// check slug isn't reserved
		slugReserved := false

		for _, reserved := range RESERVED_TEAM_SLUGS {
			if team.Slug == reserved {
				slugReserved = true
			}
		}

		existingTeam, _ := s.store.GetTeamBySlug(team.Slug)
		if existingTeam == nil && !slugReserved {
			break
		}
		i++
	}

	// store team object in db
	if err = s.store.CreateTeam(team); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error.",
			Code:  "internal_server_error",
		})
	}

	// add logged-in user as created by
	team.CreatedBy = user.ID
	now := time.Now()

	// handle onboarding team creation requirement
	if user.TeamCreatedOrJoinedAt == nil {
		user.TeamCreatedOrJoinedAt = &now
	}

	user.DefaultTeamSlug = team.Slug

	// create workos org membership
	usermanagement.SetAPIKey(os.Getenv("WORKOS_API_KEY"))

	organizationMembership, err := usermanagement.CreateOrganizationMembership(
		context.Background(),
		usermanagement.CreateOrganizationMembershipOpts{
			UserID:         user.WorkosUserID,
			OrganizationID: org.ID,
			RoleSlug:       "owner",
		},
	)

	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error.",
			Code:  "internal_server_error",
		})
	}

	// add logged-in user as initial team owner
	teamMember := models.NewTeamMember(&models.CreateTeamMemberRequest{
		JoinedAt:      &now,
		InviterUserID: user.ID,
		TeamID:        team.ID,
		UserID:        user.ID,
		TeamRole:      "owner",
	})

	teamMember.Status = "active"
	teamMember.WorkosOrgMembershipID = organizationMembership.ID

	// store team member object in db
	if err = s.store.CreateTeamMember(teamMember); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error.",
			Code:  "internal_server_error",
		})
	}

	// generate initial team invite
	inviteToken, err := generateInviteToken()
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error.",
			Code:  "internal_server_error",
		})
	}

	teamInvite := models.NewTeamInvite(&models.CreateTeamInviteRequest{
		TeamID:   team.ID,
		TeamRole: "member",
	})

	err = s.store.CreateTeamInvite(teamInvite)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error.",
			Code:  "internal_server_error",
		})
	}

	teamInvite.Token = inviteToken
	teamInvite.InviteType = "shared"

	team.CurrentTeamInviteID = teamInvite.ID

	err = s.store.UpdateTeamInvite(teamInvite)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error.",
			Code:  "internal_server_error",
		})
	}

	// update team record
	err = s.store.UpdateTeam(team)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error.",
			Code:  "internal_server_error",
		})
	}

	// update user record
	err = s.store.UpdateUser(user)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error.",
			Code:  "internal_server_error",
		})
	}

	return WriteJSON(w, http.StatusCreated, Response{Message: "team created", Code: "team_created", Data: map[string]string{
		"slug": team.Slug,
	}})
}

func (s *Server) handleGetTeamBySlug(w http.ResponseWriter, r *http.Request) error {
	slug := chi.URLParam(r, "slug")
	if !util.IsValidSlug(slug) {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid slug.", Code: "invalid_slug"})
	}

	team, err := s.store.GetTeamBySlug(slug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "team not found",
			Code:  "team_not_found",
		})
	}

	// todo verify user is a member OR on allowed list before returning data

	if team == nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "team not found",
			Code:  "team_not_found",
		})
	}

	inviteID := team.CurrentTeamInviteID
	invite, err := s.store.GetTeamInviteByID(inviteID)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error.",
			Code:  "internal_server_error",
		})
	}

	inviteLink := fmt.Sprintf("%s/%s/join/%s", os.Getenv("APP_URL"), team.Slug, invite.Token)

	teamResponse := models.NewTeamResponse(team, inviteLink)

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]interface{}{"team": teamResponse}})
}

func (s *Server) HandleGetTeamMember(w http.ResponseWriter, r *http.Request) error {
	slug := chi.URLParam(r, "slug")
	if !util.IsValidSlug(slug) {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "team not found.", Code: "team_not_found"})
	}

	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error.",
			Code:  "internal_server_error",
		})
	}

	user := userSession.User

	team, err := s.store.GetTeamBySlug(slug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "team not found",
			Code:  "team_not_found",
		})
	}

	teamMember, err := s.store.GetTeamMemberByTeamIDAndUserID(team.ID, user.ID)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "you are not a member of this team.",
			Code:  "team_member_not_found",
		})
	}

	teamMemberData := models.NewTeamMemberResponse(teamMember)
	return WriteJSON(w, http.StatusOK, Response{Data: map[string]interface{}{"team_member": teamMemberData}})

}

func (s *Server) handleGetUpsells(w http.ResponseWriter, r *http.Request) error {
	return WriteJSON(w, http.StatusNotImplemented, Error{
		Error: "not implemented",
		Code:  "not_implemented",
	})
}

func (s *Server) handleSendTeamInvites(w http.ResponseWriter, r *http.Request) error {
	slug := chi.URLParam(r, "slug")
	if !util.IsValidSlug(slug) {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid slug.", Code: "invalid_slug"})
	}

	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	user := userSession.User

	sendInvitesReq := new(models.SendTeamInvitesRequest)
	if err := json.NewDecoder(r.Body).Decode(sendInvitesReq); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request.", Error: "empty body.", Code: "empty_body"})
	}

	now := time.Now()

	if sendInvitesReq.SkipOnboarding {
		user.TeammatesInvitedAt = &now

		err = s.store.UpdateUser(user)
		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{
				Error: "internal server error",
				Code:  "internal_server_error",
			})
		}

		return WriteJSON(w, http.StatusOK, Response{Message: "skipped inviting teammates", Data: map[string]interface{}{"redirect_url": fmt.Sprintf("%s/%s/onboarding/welcome", os.Getenv("APP_URL"), slug)}})
	}

	// validate emails
	emails := sendInvitesReq.Emails

	if len(emails) == 0 {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "no emails provided", Code: "no_emails_provided"})
	}

	if len(emails) > 25 {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "you can only invite up to 25 people at a time.", Code: "too_many_invites"})
	}

	var invalidEmails []string
	invitedSelf := false
	for _, email := range emails {
		if !util.ValidateEmail(email) {
			invalidEmails = append(invalidEmails, email)
		} else if email == user.Email {
			invitedSelf = true
		}
	}

	if len(invalidEmails) > 0 {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Error: "Invalid email addresses provided",
			Code:  "invalid_email",
			Data:  map[string]interface{}{"invalid_emails": invalidEmails},
		})
	}

	var duplicateEmails []string
	emailCounts := make(map[string]int)
	for _, email := range emails {
		emailCounts[email]++
		if emailCounts[email] > 1 {
			duplicateEmails = append(duplicateEmails, email)
		}
	}

	if len(duplicateEmails) > 0 {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Error: "duplicate emails provided",
			Code:  "duplicate_emails",
			Data:  map[string]interface{}{"duplicate_emails": duplicateEmails},
		})
	}

	var alreadyInvited []string
	for _, email := range emails {
		existingInvite, existingInviteError := s.store.GetTeamInviteBySlugAndEmail(slug, email)
		if existingInvite != nil && existingInviteError == nil {
			alreadyInvited = append(alreadyInvited, email)
		}
	}
	if len(alreadyInvited) > 0 {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Error: "email(s) already invited",
			Data:  map[string]interface{}{"emails": alreadyInvited},
			Code:  "already_invited",
		})
	}

	if invitedSelf {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "you cannot invite yourself", Code: "invalid_self_invite"})
	}

	team, err := s.store.GetTeamBySlug(slug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "team not found.",
			Code:  "team_not_found",
		})
	}

	// create invites in work os
	usermanagement.SetAPIKey(os.Getenv("WORKOS_API_KEY"))

	var existingMembers []string
	for _, email := range emails {
		existingUser, _ := s.store.GetUserByEmail(email)
		if existingUser != nil {
			existingTeamMember, _ := s.store.GetTeamMemberByTeamIDAndUserID(team.ID, existingUser.ID)
			if existingTeamMember != nil {
				existingMembers = append(existingMembers, email)
			}
		}
	}

	if len(existingMembers) > 0 {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Error: "some users are already team members",
			Code:  "team_members_already_exist",
			Data:  map[string]interface{}{"existing_members": existingMembers},
		})
	}

	inviteExpiresInDays := 14

	// iterate over each member and construct invite
	for _, email := range emails {
		response, inviteErr := usermanagement.SendInvitation(
			context.Background(),
			usermanagement.SendInvitationOpts{
				Email:          email,
				OrganizationID: team.WorkosOrgID,
				ExpiresInDays:  inviteExpiresInDays,
				InviterUserID:  user.WorkosUserID,
			},
		)

		fmt.Printf("error sending invite email %s %s\n", email, inviteErr)

		if inviteErr != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{
				Error: "internal server error",
				Code:  "internal_server_error",
			})
		}

		token := response.Token
		state := response.State

		expiryTime := time.Now().Add(time.Hour * 24 * time.Duration(inviteExpiresInDays))

		teamInvite := &models.TeamInvite{
			ExpiresAt:      &expiryTime,
			TeamID:         team.ID,
			InviterUserID:  user.ID,
			WorkosInviteID: response.ID,
			Email:          email,
			Token:          token,
			State:          models.TeamInviteStatus(state),
		}
		err = s.store.CreateTeamInvite(teamInvite)

		// send invite
		inviteLink := fmt.Sprintf("%s/%s/join/%s", os.Getenv("APP_URL"), team.Slug, token)

		emailBody := fmt.Sprintf("You've been invited to join %s on %s. Click <a href=\"%s\">here</a> to accept the invite.", team.Name, os.Getenv("APP_NAME"), inviteLink)

		err = util.SendEmail(email, "You've been invited to join a team", emailBody)
		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{
				Error: "internal server error",
				Code:  "internal_server_error",
			})
		}
	}

	user.TeammatesInvitedAt = &now

	err = s.store.UpdateUser(user)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error",
			Code:  "internal_server_error",
		})
	}

	// create team member records
	for _, email := range emails {
		teamMember := models.NewTeamMember(&models.CreateTeamMemberRequest{
			TeamID:        team.ID,
			Email:         email,
			InviterUserID: user.ID,
			TeamRole:      "member",
		})

		teamMember.Status = "pending"

		memberUser, _ := s.store.GetUserByEmail(email)

		if memberUser != nil {
			teamMember.UserID = memberUser.ID
		}

		// store each member in DB
		err := s.store.CreateTeamMember(teamMember)
		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{
				Error: "internal server error",
				Code:  "internal_server_error",
			})
		}
	}

	return WriteJSON(w, http.StatusOK, Response{Message: "invites sent", Code: "invites_sent", Data: map[string]interface{}{"redirect_url": fmt.Sprintf("%s/%s/onboarding/welcome", os.Getenv("APP_URL"), slug)}})
}

func (s *Server) handleGetTeamInvite(w http.ResponseWriter, r *http.Request) error {
	slug := chi.URLParam(r, "slug")
	if !util.IsValidSlug(slug) {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "team not found.", Code: "team_not_found"})
	}

	token := chi.URLParam(r, "token")
	teamInvite, err := s.store.GetTeamInviteBySlugAndToken(slug, token)
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Error: "invite link is invalid or expired.",
			Code:  "invalid_invite_link",
		})
	}

	// validate link isn't expired
	expired := teamInvite.ExpiresAt != nil && *teamInvite.ExpiresAt != time.Time{}
	if expired {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Error: "invite link is invalid or expired.",
			Code:  "invalid_invite_link",
		})
	}

	// validate link isn't canceled
	if teamInvite.CanceledAt != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Error: "invite link is invalid or expired.",
			Code:  "invalid_invite_link",
		})
	}

	// validate number of uses
	if teamInvite.UsedTimes > teamInvite.MaxUses {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Error: "invite link is invalid or expired.",
			Code:  "invalid_invite_link",
		})
	}

	team, err := s.store.GetTeamBySlug(slug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "team not found.",
			Code:  "team_not_found",
		})
	}

	// check if user exists
	user, _ := s.store.GetUserByEmail(teamInvite.Email)
	if user != nil {
		// check if they're already on this team
		teamMember, _ := s.store.GetTeamMemberByTeamIDAndUserID(team.ID, user.ID)
		if teamMember != nil {
			return WriteJSON(w, http.StatusOK, Response{Data: map[string]interface{}{"redirect_url": fmt.Sprintf("%s/%s", os.Getenv("APP_URL"), team.Slug)}})
		}
	}
	return WriteJSON(w, http.StatusOK, Response{Data: map[string]interface{}{
		"team": map[string]interface{}{
			"name": team.Name,
			"slug": team.Slug,
		},
		"invite": map[string]interface{}{
			"token":     teamInvite.Token,
			"team_role": teamInvite.TeamRole,
		},
	}})

}

func (s *Server) handleGetTeamInviteLink(w http.ResponseWriter, r *http.Request) error {
	slug := chi.URLParam(r, "slug")
	if !util.IsValidSlug(slug) {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "invite link not found.", Code: "not_found"})
	}

	team, err := s.store.GetTeamBySlug(slug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "team not found",
			Code:  "team_not_found",
		})
	}

	if team.CurrentTeamInviteID == uuid.Nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "no invite link found",
			Code:  "invite_not_found",
		})
	}

	invite, err := s.store.GetTeamInviteByID(team.CurrentTeamInviteID)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error",
			Code:  "internal_server_error",
		})
	}

	inviteLink := fmt.Sprintf("%s/%s/join/%s", os.Getenv("APP_URL"), team.Slug, invite.Token)

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]interface{}{
		"inviteLink": inviteLink,
	}})
}

func (s *Server) handleRegenerateTeamInviteLink(w http.ResponseWriter, r *http.Request) error {
	slug := chi.URLParam(r, "slug")
	if !util.IsValidSlug(slug) {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "invite link not found.", Code: "not_found"})
	}

	team, err := s.store.GetTeamBySlug(slug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "team not found",
			Code:  "team_not_found",
		})
	}

	// get the old invite
	oldInvite, err := s.store.GetTeamInviteByID(team.CurrentTeamInviteID)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error",
			Code:  "internal_server_error",
		})
	}

	// expire the old invite
	now := time.Now()
	oldInvite.ExpiresAt = &now
	if err := s.store.UpdateTeamInvite(oldInvite); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error",
			Code:  "internal_server_error",
		})
	}

	// generate new invite token
	inviteToken, err := generateInviteToken()
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error",
			Code:  "internal_server_error",
		})
	}

	// create new team invite
	teamInvite := models.NewTeamInvite(&models.CreateTeamInviteRequest{
		TeamID:   team.ID,
		TeamRole: "member",
	})
	teamInvite.Token = inviteToken
	teamInvite.InviteType = "shared"

	if err := s.store.CreateTeamInvite(teamInvite); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error",
			Code:  "internal_server_error",
		})
	}

	// update team with new invite ID
	team.CurrentTeamInviteID = teamInvite.ID
	if err := s.store.UpdateTeam(team); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error",
			Code:  "internal_server_error",
		})
	}

	inviteLink := fmt.Sprintf("%s/%s/join/%s", os.Getenv("APP_URL"), team.Slug, teamInvite.Token)

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]interface{}{
		"inviteLink": inviteLink,
	}})
}

func (s *Server) handleVerifyInviteLink(w http.ResponseWriter, r *http.Request) error {
	slug := chi.URLParam(r, "slug")
	token := chi.URLParam(r, "token")

	team, err := s.store.GetTeamBySlug(slug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "team not found",
			Code:  "team_not_found",
		})
	}

	// check that user isn't already a team member
	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{
			Error: "unauthorized",
			Code:  "unauthorized",
		})
	}
	user := userSession.User

	if user != nil {
		existingMember, _ := s.store.GetTeamMemberByTeamIDAndUserID(team.ID, user.ID)
		if existingMember != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "user already a team member", Code: "user_already_a_team_member"})
		}
	}

	invite, err := s.store.GetTeamInviteBySlugAndToken(slug, token)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "invite link expired",
			Code:  "invite_link_expired",
			Data: map[string]interface{}{
				"team_name": team.Name,
			},
		})
	}

	// check invite isn't expired
	expired := invite.ExpiresAt != nil && *invite.ExpiresAt != time.Time{}

	if expired {
		return WriteJSON(w, http.StatusForbidden, Error{
			Error: "invite link expired",
			Code:  "invite_expired",
			Data: map[string]interface{}{
				"team_name": team.Name,
			},
		})
	}

	// check usage limit hasn't been hit
	if invite.UsedTimes >= invite.MaxUses && invite.MaxUses != 0 {
		return WriteJSON(w, http.StatusForbidden, Error{
			Error: "invite link expired",
			Code:  "invite_expired",
			Data: map[string]interface{}{
				"team_name": team.Name,
			},
		})
	}

	// check that email specified matches logged in user
	existingUser, _ := s.store.GetUserByEmail(invite.Email)
	if existingUser != nil {
		if existingUser.Email != invite.Email {
			return WriteJSON(w, http.StatusForbidden, Error{
				Error: "invite link expired",
				Code:  "invite_expired",
				Data: map[string]interface{}{
					"team_name": team.Name,
				},
			})
		}
	}

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]interface{}{
		"team_name": team.Name,
	}})
}

func (s *Server) handleUseInviteLink(w http.ResponseWriter, r *http.Request) error {
	slug := chi.URLParam(r, "slug")
	token := chi.URLParam(r, "token")

	var user *models.User
	userSession, err := getUserSession(s, r)
	if err == nil {
		user = userSession.User
	}

	team, err := s.store.GetTeamBySlug(slug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "team not found",
			Code:  "team_not_found",
		})
	}

	invite, err := s.store.GetTeamInviteBySlugAndToken(slug, token)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "invite link expired",
			Code:  "invite_link_expired",
			Data: map[string]interface{}{
				"team_name": team.Name,
			},
		})
	}

	// check invite isn't expired
	expired := invite.ExpiresAt != nil && *invite.ExpiresAt != time.Time{}

	if expired {
		return WriteJSON(w, http.StatusForbidden, Error{
			Error: "invite link expired",
			Code:  "invite_expired",
			Data: map[string]interface{}{
				"team_name": team.Name,
			},
		})
	}

	// check usage limit hasn't been hit
	if invite.UsedTimes >= invite.MaxUses && invite.MaxUses != 0 {
		return WriteJSON(w, http.StatusForbidden, Error{
			Error: "invite link expired",
			Code:  "invite_expired",
			Data: map[string]interface{}{
				"team_name": team.Name,
			},
		})
	}

	// check that email specified matches logged in user
	emailUser, _ := s.store.GetUserByEmail(invite.Email)
	if emailUser != nil && user != nil && invite.Email != "" {
		if user.Email != invite.Email {
			return WriteJSON(w, http.StatusForbidden, Error{
				Error: "invite link expired",
				Code:  "invite_expired",
				Data: map[string]interface{}{
					"team_name": team.Name,
				},
			})
		}
	}

	// check that user isn't already a team member
	if user != nil {
		existingMember, _ := s.store.GetTeamMemberByTeamIDAndUserID(team.ID, user.ID)
		if existingMember != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "user already a team member", Code: "user_already_a_team_member"})
		}
	}

	teamMember := models.NewTeamMember(&models.CreateTeamMemberRequest{
		TeamID:        team.ID,
		Email:         invite.Email,
		InviterUserID: invite.InviterUserID,
		TeamRole:      invite.TeamRole,
	})

	teamMember.Status = "active"

	if err = s.store.CreateTeamMember(teamMember); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "failed to create team member", Code: "failed_to_create_team_member"})
	}

	invite.UsedTimes = invite.UsedTimes + 1
	if err := s.store.UpdateTeamInvite(invite); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "failed to update invite", Code: "failed_to_update_invite"})
	}

	if user != nil {
		// todo validate if user has permission to join team

		teamMember.UserID = user.ID

		now := time.Now()
		user.TeammatesInvitedAt = &now
		user.DefaultTeamSlug = team.Slug

		if user.TeamCreatedOrJoinedAt == nil || user.TeamCreatedOrJoinedAt.IsZero() {
			user.TeamCreatedOrJoinedAt = &now
		}

		if err := s.store.UpdateUser(user); err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "failed to update user", Code: "failed_to_update_user"})
		}

		// return a redirect url so that logged in user can start onboarding
		return WriteJSON(w, http.StatusOK, Response{Data: map[string]interface{}{
			"redirect_url": fmt.Sprintf("%s/%s/onboarding/welcome", os.Getenv("APP_URL"), slug),
		}})
	}

	return WriteJSON(w, http.StatusOK, Response{
		Message: "success",
		Data: map[string]interface{}{
			"redirect_url": fmt.Sprintf("%s/auth/login?next=/%s/onboarding/welcome", os.Getenv("APP_URL"), slug),
		},
	})
}

func generateInviteToken() (string, error) {
	// generate 16 random bytes using crypto/rand
	randomBytes := make([]byte, 16)
	if _, err := cryptoRand.Read(randomBytes); err != nil {
		return "", err
	}

	// create MD5 hash
	hash := md5.Sum(randomBytes)

	// convert to hex string
	return hex.EncodeToString(hash[:]), nil
}

func (s *Server) handleCompleteOnboarding(w http.ResponseWriter, r *http.Request) error {
	slug := chi.URLParam(r, "slug")
	if !util.IsValidSlug(slug) {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "invite link not found.", Code: "not_found"})
	}

	team, err := s.store.GetTeamBySlug(slug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "team not found", Code: "team_not_found"})
	}

	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error", Code: "internal_server_error"})
	}

	user := userSession.User

	now := time.Now()
	user.OnboardingCompletedAt = &now
	team.OnboardingCompletedAt = &now

	err = s.store.UpdateTeam(team)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error", Code: "internal_server_error"})
	}

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error", Code: "internal_server_error"})
	}

	teamMember, err := s.store.GetTeamMemberByTeamIDAndUserID(team.ID, user.ID)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error", Code: "internal_server_error"})
	}

	teamMember.OnboardedAt = &now
	err = s.store.UpdateTeamMember(teamMember)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, Response{Message: "onboarding completed", Code: "onboarding_completed"})
}

func userIsTeamMember(s *Server, userID uuid.UUID, teamID uuid.UUID) (bool, error) {
	_, err := s.store.GetTeamMemberByTeamIDAndUserID(teamID, userID)

	if err != nil {
		return false, err
	}

	return true, nil
}
