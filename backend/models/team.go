package models

import (
	"time"

	"github.com/google/uuid"
)

type Team struct {
	ID        uuid.UUID
	CreatedAt *time.Time
	UpdatedAt *time.Time
	CreatedBy uuid.UUID
	Name      string
	DeletedAt *time.Time
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
	TeamSubscriptonPlanBasic      TeamRole = "basic"
	TeamSubscriptonPlanPro        TeamRole = "pro"
	TeamSubscriptonPlanPremium    TeamRole = "premium"
	TeamSubscriptonPlanEnterprise TeamRole = "enterprise"
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
	ID         uuid.UUID
	CreatedAt  *time.Time
	UpdatedAt  *time.Time
	ExpiresAt  *time.Time
	TeamID     uuid.UUID
	Email      string
	Slug       string
	InviteType TeamInviteType
	AcceptedAt *time.Time
	CanceledAt *time.Time
	TeamRole   TeamRole
	InvitedBy  uuid.UUID
	UsedTimes  int
	MaxUses    int
}

type CreateTeamInviteRequest struct {
	TeamID   uuid.UUID
	Email    string
	TeamRole TeamRole
}

type TeamMember struct {
	ID        uuid.UUID
	CreatedAt *time.Time
	UpdatedAt *time.Time
	JoinedAt  *time.Time
	LeftAt    *time.Time
	InvitedBy uuid.UUID
	TeamID    uuid.UUID
	UserID    uuid.UUID
	TeamRole  TeamRole
}

type TeamSubscription struct {
	ID                   uuid.UUID
	CreatedAt            time.Time
	UpdatedAt            time.Time
	TeamID               uuid.UUID
	PlanType             TeamSubscriptionPlan
	StripePriceID        string `json:"stripe_price_id"`
	StripePriceLookupKey string `json:"stripe_price_lookup_key"`
	Interval             TeamSubscriptionInterval
	StripeProductID      string `json:"stripe_product_id"`
	StripeSubscriptionID string `json:"stripe_subscription_id"`
}
