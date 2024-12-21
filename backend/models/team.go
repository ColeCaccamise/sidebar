package models

import (
	"time"

	"github.com/google/uuid"
)

type Team struct {
	ID                  uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	CreatedAt           time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt           time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
	CreatedBy           uuid.UUID  `gorm:"type:uuid" json:"created_by"`
	Name                string     `gorm:"not null" json:"name"`
	Slug                string     `gorm:"not null" json:"slug"`
	DeletedAt           *time.Time `gorm:"default:null" json:"deleted_at"`
	CurrentTeamInviteID uuid.UUID  `gorm:"not null" json:"team_invite"`
}

type TeamResponse struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	Slug       string    `json:"slug"`
	InviteLink string    `json:"invite_link"`
}

func NewTeamResponse(t *Team, inviteLink string) *TeamResponse {
	return &TeamResponse{
		ID:         t.ID,
		Name:       t.Name,
		Slug:       t.Slug,
		InviteLink: inviteLink,
	}
}

type CreateTeamRequest struct {
	Name string
}

func NewTeam(req *CreateTeamRequest) *Team {
	return &Team{
		Name: req.Name,
	}
}

type TeamRole string

const (
	TeamRoleOwner  TeamRole = "owner"
	TeamRoleAdmin  TeamRole = "admin"
	TeamRoleMember TeamRole = "member"
)

type TeamSubscriptionPlan string

const (
	TeamSubscriptonPlanBasic      TeamSubscriptionPlan = "basic"
	TeamSubscriptonPlanPro        TeamSubscriptionPlan = "pro"
	TeamSubscriptonPlanPremium    TeamSubscriptionPlan = "premium"
	TeamSubscriptonPlanEnterprise TeamSubscriptionPlan = "enterprise"
)

type TeamSubscriptionInterval string

const (
	TeamSubscriptionIntervalMonth TeamSubscriptionInterval = "month"
	TeamSubscriptionIntervalYear  TeamSubscriptionInterval = "year"
)

type TeamInviteType string

const (
	TeamInviteTypeSingle TeamInviteType = "single"
	TeamInviteTypeShared TeamInviteType = "shared"
)

type TeamInvite struct {
	ID         uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	CreatedAt  time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	ExpiresAt  *time.Time     `gorm:"default:null" json:"expires_at"`
	TeamID     uuid.UUID      `gorm:"type:uuid;not null" json:"team_id"`
	Email      string         `gorm:"default:null" json:"email"`
	Token      string         `gorm:"not null" json:"slug"`
	InviteType TeamInviteType `gorm:"not null" json:"invite_type"`
	AcceptedAt *time.Time     `gorm:"default:null" json:"accepted_at"`
	CanceledAt *time.Time     `gorm:"default:null" json:"canceled_at"`
	TeamRole   TeamRole       `gorm:"not null" json:"team_role"`
	InvitedBy  uuid.UUID      `gorm:"type:uuid;default:null" json:"invited_by"`
	UsedTimes  int            `gorm:"default:null" json:"used_times"`
	MaxUses    int            `gorm:"default:null" json:"max_uses"`
}

type GenerateTeamInviteRequest struct {
	Slug string
}

type SendTeamInvitesRequest struct {
	Emails []string `json:"emails"`
	SkipOnboarding bool `json:"skip_onboarding"`
}

type CreateTeamInviteRequest struct {
	TeamID   uuid.UUID
	Email    string
	TeamRole TeamRole
}

type TeamMember struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
	JoinedAt  *time.Time `gorm:"default:null" json:"joined_at"`
	LeftAt    *time.Time `gorm:"default:null" json:"left_at"`
	InvitedBy uuid.UUID  `gorm:"type:uuid;not null"`
	TeamID    uuid.UUID  `gorm:"type:uuid;not null"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null"`
	TeamRole  TeamRole   `gorm:"not null" json:"team_role"`
}

type CreateTeamMemberRequest struct {
	JoinedAt  *time.Time
	InvitedBy uuid.UUID
	TeamID    uuid.UUID
	UserID    uuid.UUID
	TeamRole  TeamRole
}

func NewTeamMember(req *CreateTeamMemberRequest) *TeamMember {
	return &TeamMember{
		JoinedAt:  req.JoinedAt,
		InvitedBy: req.InvitedBy,
		TeamID:    req.TeamID,
		UserID:    req.UserID,
		TeamRole:  req.TeamRole,
	}
}

func NewTeamInvite(req *CreateTeamInviteRequest) *TeamInvite {
	return &TeamInvite{
		TeamID:   req.TeamID,
		Email:    req.Email,
		TeamRole: req.TeamRole,
	}
}

type TeamSubscription struct {
	ID                   uuid.UUID                `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	CreatedAt            time.Time                `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time                `gorm:"autoUpdateTime" json:"updated_at"`
	TeamID               uuid.UUID                `gorm:"type:uuid;not null" json:"team_id"`
	PlanType             TeamSubscriptionPlan     `gorm:"not null" json:"plan_type"`
	StripePriceID        string                   `gorm:"not null" json:"stripe_price_id"`
	StripePriceLookupKey string                   `gorm:"not null" json:"stripe_price_lookup_key"`
	Interval             TeamSubscriptionInterval `gorm:"not null" json:"interval"`
	StripeProductID      string                   `gorm:"not null" json:"stripe_product_id"`
	StripeSubscriptionID string                   `gorm:"not null" json:"stripe_subscription_id"`
}
