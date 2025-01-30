package models

import (
	"time"

	"github.com/google/uuid"
)

type CreateUserRequest struct {
	Email          string `json:"email"`
	HashedPassword string `json:"hashed_password"`
}

type UpdateUserRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type UpdateUserEmailRequest struct {
	Email string `json:"email"`
}

type DeleteUserRequest struct {
	Password string `json:"password"`
}

type DeleteAccountRequest struct {
	Reason      string `json:"reason"`
	OtherReason string `json:"other_reason"`
	Email       string `json:"email"`
}

type ChangeUserPasswordRequest struct {
	OldPassword        string `json:"old_password"`
	NewPassword        string `json:"new_password"`
	ConfirmNewPassword string `json:"confirm_new_password"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ChangePasswordRequest struct {
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirm_password"`
	Token           string `json:"token"`
}

type AcceptTermsRequest struct {
	TermsAccepted bool `json:"terms_accepted"`
}

type User struct {
	ID                      uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	WorkosUserID            string     `json:"workos_user_id"`
	FirstName               string     `gorm:"" json:"first_name"`
	LastName                string     `gorm:"" json:"last_name"`
	Email                   string     `gorm:"unique;not null" json:"email"`
	EmailConfirmed          bool       `gorm:"default:false" json:"email_confirmed"`
	UpdatedEmail            string     `gorm:"" json:"updated_email"`
	CreatedAt               time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt               time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
	HashedPassword          string     `gorm:"" json:"hashed_password"`
	UpdatedEmailAt          *time.Time `gorm:"default:null" json:"updated_email_at"`
	UpdatedEmailConfirmedAt *time.Time `gorm:"default:null" json:"updated_email_confirmed_at"`
	EmailConfirmedAt        *time.Time `gorm:"default:null" json:"email_confirmed_at"`
	IsAdmin                 bool       `gorm:"default:false" json:"is_admin"`
	AvatarUrl               string     `gorm:"default:null" json:"avatar_url"`
	AvatarThumbnailUrl      string     `gorm:"default:null" json:"avatar_thumbnail_url"`
	DeletedAt               *time.Time `gorm:"default:null" json:"deleted_at"`
	RestoredAt              *time.Time `gorm:"default:null" json:"restored_at"`
	Version                 *time.Time `gorm:"default:null" json:"version"`
	TermsAcceptedAt         *time.Time `gorm:"default:null" json:"terms_accepted_at"`
	OnboardingCompletedAt   *time.Time `gorm:"default:null" json:"onboarding_completed_at"`
	TeamCreatedOrJoinedAt   *time.Time `gorm:"default:null" json:"team_created_or_joined_at"`
	TeammatesInvitedAt      *time.Time `gorm:"default:null" json:"teammates_invited_at"` // accepted or declined at
	DefaultTeamSlug         string     `gorm:"default:null" json:"default_team_slug"`
	DefaultTeamID           *uuid.UUID `gorm:"default:null" json:"default_team_id"`
	PendingTeamID           *uuid.UUID `gorm:"default:null" json:"pending_team_id"` // current team user is joining
	TokenRefreshedAt        *time.Time `gorm:"default:null" json:"token_refreshed_at"`
	DeletedReason           string     `gorm:"default:null" json:"deleted_reason"`
	DeletedOtherReason      string     `gorm:"default:null" json:"deleted_other_reason"`
}

type UserIdentityResponse struct {
	ID                  uuid.UUID  `json:"id"`
	FirstName           string     `json:"first_name"`
	LastName            string     `json:"last_name"`
	Email               string     `json:"email"`
	EmailConfirmed      bool       `json:"email_confirmed"`
	UpdatedEmail        string     `json:"updated_email,omitempty"`
	IsAdmin             bool       `json:"is_admin"`
	AvatarUrl           string     `json:"avatar_url"`
	DeletedAt           *time.Time `json:"deleted_at,omitempty"`
	TermsAccepted       bool       `json:"terms_accepted"`
	OnboardingCompleted bool       `json:"onboarding_completed"`
	TeamCreatedOrJoined bool       `json:"team_created_or_joined"`
	TeammatesInvited    bool       `json:"teammates_invited"`
	DefaultTeamSlug     string     `json:"default_team_slug"`
	Deleted             bool       `json:"deleted"`
	Restorable          bool       `json:"restorable"`
}

func NewUser(req *CreateUserRequest) *User {
	return &User{
		Email:          req.Email,
		HashedPassword: req.HashedPassword,
	}
}

func NewUserIdentityResponse(u *User) *UserIdentityResponse {
	return &UserIdentityResponse{
		ID:                  u.ID,
		FirstName:           u.FirstName,
		LastName:            u.LastName,
		Email:               u.Email,
		UpdatedEmail:        u.UpdatedEmail,
		IsAdmin:             u.IsAdmin,
		AvatarUrl:           u.AvatarUrl,
		EmailConfirmed:      (u.EmailConfirmedAt != nil && *u.EmailConfirmedAt != time.Time{}) || u.EmailConfirmed,
		TermsAccepted:       u.TermsAcceptedAt != nil && *u.TermsAcceptedAt != time.Time{},
		OnboardingCompleted: u.OnboardingCompletedAt != nil && *u.OnboardingCompletedAt != time.Time{},
		TeamCreatedOrJoined: u.TeamCreatedOrJoinedAt != nil && *u.TeamCreatedOrJoinedAt != time.Time{},
		TeammatesInvited:    u.TeammatesInvitedAt != nil && *u.TeammatesInvitedAt != time.Time{},
		DefaultTeamSlug:     u.DefaultTeamSlug,
		Deleted:             u.DeletedAt != nil && *u.DeletedAt != time.Time{},
		Restorable:          u.DeletedAt != nil && time.Since(*u.DeletedAt) < time.Hour*24*60,
	}
}
