package util

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/colecaccamise/go-backend/models"
)

type WorkosInviteResponse struct {
	Object              string      `json:"object"`
	Id                  string      `json:"id"`
	Email               string      `json:"email"`
	State               string      `json:"state"`
	AcceptedAt          time.Time   `json:"accepted_at"`
	RevokedAt           interface{} `json:"revoked_at"`
	ExpiresAt           time.Time   `json:"expires_at"`
	Token               string      `json:"token"`
	AcceptInvitationUrl string      `json:"accept_invitation_url"`
	OrganizationId      string      `json:"organization_id"`
	InviterUserId       string      `json:"inviter_user_id"`
	AcceptedUserId      string      `json:"accepted_user_id"`
	CreatedAt           time.Time   `json:"created_at"`
	UpdatedAt           time.Time   `json:"updated_at"`
}

func AcceptWorkosInvite(inviteId string) (response *WorkosInviteResponse, err error) {
	acceptUrl := fmt.Sprintf("https://api.workos.com/user_management/invitations/%s/accept", inviteId)
	fmt.Println("Accepting invitation", acceptUrl)

	req, err := http.NewRequest(http.MethodPost, acceptUrl, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", os.Getenv("WORKOS_API_KEY")))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}

	defer func() {
		if err = resp.Body.Close(); err != nil {
			fmt.Printf("error closing response body: %v", err)
		}
	}()

	// check response status
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invitation accept failed with status code %d", resp.StatusCode)
	}

	if err = json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return response, nil
}

func TeamInviteValid(teamInvite models.TeamInvite) (response bool) {
	if teamInvite.State != models.Expired && teamInvite.State != models.Canceled && (teamInvite.CanceledAt == nil && teamInvite.ExpiresAt.After(time.Now()) && teamInvite.UsedTimes < teamInvite.MaxUses) {
		return true
	} else {
		return false
	}
}

func CheckRolePermission(currentRole models.TeamRole, requiredRole models.TeamRole) bool {
	// map roles to their hierarchy level
	roleHierarchy := map[models.TeamRole]int{
		models.TeamRole("owner"):  3,
		models.TeamRole("admin"):  2,
		models.TeamRole("member"): 1,
	}

	// check if current role has sufficient privileges
	return roleHierarchy[currentRole] >= roleHierarchy[requiredRole]
}
