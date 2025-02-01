package models

import (
	"time"

	"github.com/google/uuid"
)

type Team struct {
	ID                       uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreatedAt                *time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt                *time.Time `gorm:"autoUpdateTime" json:"updated_at"`
	CreatedBy                uuid.UUID  `gorm:"type:uuid" json:"created_by"`
	Name                     string     `gorm:"not null" json:"name"`
	Slug                     string     `gorm:"not null" json:"slug"`
	WorkosOrgID              string     `gorm:"index" json:"workos_org_id"` // todo not null
	DeletedAt                *time.Time `gorm:"default:null" json:"deleted_at"`
	CurrentTeamInviteID      uuid.UUID  `gorm:"default:null" json:"team_invite"`
	StripeOnboardedAt        *time.Time `gorm:"default:null" json:"stripe_onboarded_at"`
	StripeCustomerID         string     `gorm:"default:null" json:"customer_id"`
	FreeTrialAt              *time.Time `gorm:"default:null" json:"free_trial_at"`
	RedeemedCouponAt         *time.Time `gorm:"default:null" json:"redeemed_coupon_at"`
	SubscriptionID           uuid.UUID  `gorm:"type:uuid" json:"subscription_id"`
	StripeSetupErrorCode     string     `gorm:"default:null" json:"stripe_setup_error_code"`
	StripeSetupDeclineCode   string     `gorm:"default:null" json:"stripe_setup_decline_code"`
	StripeSetupErrorMessage  string     `gorm:"default:null" json:"stripe_setup_error_message"`
	SubscriptionTierChosenAt *time.Time `gorm:"default:null" json:"subscription_tier_chosen_at"`
	OnboardingCompletedAt    *time.Time `gorm:"default:null" json:"onboarding_completed_at"`
}

type SelectOrganizationResponse struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

type TeamResponse struct {
	ID                     uuid.UUID `json:"id"`
	Name                   string    `json:"name"`
	Slug                   string    `json:"slug"`
	InviteLink             string    `json:"invite_link"`
	StripeOnboarded        bool      `json:"stripe_onboarded"`
	SubscriptionTierChosen bool      `json:"subscription_tier_chosen"`
	OnboardingCompleted    bool      `json:"onboarding_completed"`
	Deleted                bool      `json:"deleted"`
}

func NewTeamResponse(t *Team, inviteLink string) *TeamResponse {
	return &TeamResponse{
		ID:                     t.ID,
		Name:                   t.Name,
		Slug:                   t.Slug,
		InviteLink:             inviteLink,
		StripeOnboarded:        t.StripeOnboardedAt != nil,
		SubscriptionTierChosen: t.SubscriptionTierChosenAt != nil,
		OnboardingCompleted:    t.OnboardingCompletedAt != nil,
		Deleted:                t.DeletedAt != nil,
	}
}

type TeamMemberResponse struct {
	ID        uuid.UUID        `json:"id"`
	UserID    uuid.UUID        `json:"user_id"`
	TeamID    uuid.UUID        `json:"team_id"`
	TeamRole  TeamRole         `json:"team_role"`
	Status    TeamMemberStatus `json:"status"`
	Onboarded bool             `json:"onboarded"`
	JoinedAt  *time.Time       `json:"joined_at"`
}

func NewTeamMemberResponse(t *TeamMember) *TeamMemberResponse {
	return &TeamMemberResponse{
		ID:        t.ID,
		UserID:    *t.UserID,
		TeamID:    t.TeamID,
		TeamRole:  t.TeamRole,
		Status:    t.Status,
		Onboarded: t.OnboardedAt != nil,
		JoinedAt:  t.JoinedAt,
	}
}

type CreateTeamRequest struct {
	Name        string
	WorkosOrgID string
}

func NewTeam(req *CreateTeamRequest) *Team {
	return &Team{
		Name:        req.Name,
		WorkosOrgID: req.WorkosOrgID,
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

type TeamInviteStatus string

const (
	Pending  TeamInviteStatus = "pending"
	Accepted TeamInviteStatus = "accepted"
	Expired  TeamInviteStatus = "expired"
	Canceled TeamInviteStatus = "canceled"
)

type TeamInvite struct {
	ID             uuid.UUID        `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreatedAt      time.Time        `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time        `gorm:"autoUpdateTime" json:"updated_at"`
	ExpiresAt      *time.Time       `gorm:"default:null" json:"expires_at"`
	WorkosInviteID string           `gorm:"default:null" json:"workos_invite_id"`
	TeamID         uuid.UUID        `gorm:"type:uuid;not null" json:"team_id"`
	TeamMemberID   *uuid.UUID       `gorm:"type:uuid;default:null" json:"team_member_id"`
	Email          string           `gorm:"default:null" json:"email"`
	Token          string           `gorm:"not null;index:,option:CONCURRENTLY" json:"slug"`
	InviteType     TeamInviteType   `gorm:"not null" json:"invite_type"`
	State          TeamInviteStatus `gorm:"default:null" json:"state"`
	AcceptedAt     *time.Time       `gorm:"default:null" json:"accepted_at"`
	CanceledAt     *time.Time       `gorm:"default:null" json:"canceled_at"`
	TeamRole       TeamRole         `gorm:"default: member" json:"team_role"`
	InviterUserID  uuid.UUID        `gorm:"type:uuid;default:null" json:"inviter_user_id"`
	UsedTimes      int              `gorm:"default:null" json:"used_times"`
	MaxUses        int              `gorm:"default:null" json:"max_uses"`
}

type TeamInviteResponse struct {
	ID         uuid.UUID        `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreatedAt  time.Time        `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time        `gorm:"autoUpdateTime" json:"updated_at"`
	ExpiresAt  *time.Time       `gorm:"default:null" json:"expires_at"`
	Email      string           `gorm:"default:null" json:"email"`
	Token      string           `gorm:"not null" json:"slug"`
	InviteType TeamInviteType   `gorm:"not null" json:"invite_type"`
	State      TeamInviteStatus `gorm:"default:null" json:"state"`
	TeamRole   TeamRole         `gorm:"default: member" json:"team_role"`
	TeamSlug   string           `gorm:"default:null" json:"team_slug"`
	TeamName   string           `gorm:"default:null" json:"team_name"`
}

type GenerateTeamInviteRequest struct {
	Slug string
}

type SendTeamInvitesRequest struct {
	Emails         []string `json:"emails"`
	Role           TeamRole `json:"role"`
	SkipOnboarding bool     `json:"skip_onboarding"`
}

type CreateTeamInviteRequest struct {
	TeamID       uuid.UUID
	Email        string
	TeamRole     TeamRole
	TeamMemberID uuid.UUID
}

type TeamMemberStatus string

const (
	TeamMemberStatusPending TeamMemberStatus = "pending"
	TeamMemberStatusActive  TeamMemberStatus = "active"
	TeamMemberStatusLeft    TeamMemberStatus = "left"
	TeamMemberStatusRemoved TeamMemberStatus = "removed"
)

type TeamMember struct {
	ID                    uuid.UUID        `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreatedAt             time.Time        `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt             time.Time        `gorm:"autoUpdateTime" json:"updated_at"`
	WorkosOrgMembershipID string           `gorm:"default:null" json:"workos_org_membership_id"`
	JoinedAt              *time.Time       `gorm:"default:null" json:"joined_at"`
	LeftAt                *time.Time       `gorm:"default:null" json:"left_at"`
	RemovedAt             *time.Time       `gorm:"default:null" json:"removed_at"`
	RemovedBy             *uuid.UUID       `gorm:"default:null" json:"removed_by"`
	InviterUserID         *uuid.UUID       `gorm:"type:uuid;default:null" json:"inviter_user_id"`
	TeamID                uuid.UUID        `gorm:"type:uuid;not null" json:"team_id"`
	UserID                *uuid.UUID       `gorm:"type:uuid;not null" json:"user_id"`
	TeamRole              TeamRole         `gorm:"default:member" json:"team_role"`
	Status                TeamMemberStatus `gorm:"default:null" json:"status"`
	OnboardedAt           *time.Time       `gorm:"default:null" json:"onboarded_at"`
	Email                 string           `gorm:"default:null" json:"email"`
}

type CreateTeamMemberRequest struct {
	JoinedAt      *time.Time
	InviterUserID uuid.UUID
	TeamID        uuid.UUID
	UserID        uuid.UUID
	TeamRole      TeamRole
	Email         string
}

func NewTeamMember(req *CreateTeamMemberRequest) *TeamMember {
	return &TeamMember{
		JoinedAt:      req.JoinedAt,
		InviterUserID: &req.InviterUserID,
		TeamID:        req.TeamID,
		UserID:        &req.UserID,
		TeamRole:      req.TeamRole,
		Email:         req.Email,
	}
}

type UpdateTeamMemberRequest struct {
	TeamRole TeamRole `json:"team_role"`
}

func NewTeamInvite(req *CreateTeamInviteRequest) *TeamInvite {
	return &TeamInvite{
		TeamID:       req.TeamID,
		Email:        req.Email,
		TeamRole:     req.TeamRole,
		TeamMemberID: &req.TeamMemberID,
	}
}

type CreateTeamSubscriptionRequest struct {
	TeamID   uuid.UUID
	PlanType TeamSubscriptionPlan
	Interval TeamSubscriptionInterval
}

func NewTeamSubscription(req *CreateTeamSubscriptionRequest) *TeamSubscription {
	return &TeamSubscription{
		TeamID:   req.TeamID,
		PlanType: req.PlanType,
		Interval: req.Interval,
	}
}

type TeamSubscriptionStatus string

const (
	TeamSubscriptionStatusTrialing          TeamSubscriptionStatus = "trialing"
	TeamSubscriptionStatusActive            TeamSubscriptionStatus = "active"
	TeamSubscriptionStatusIncomplete        TeamSubscriptionStatus = "incomplete"
	TeamSubscriptionStatusIncompleteExpired TeamSubscriptionStatus = "incomplete_expired"
	TeamSubscriptionStatusPastDue           TeamSubscriptionStatus = "past_due"
	TeamSubscriptionStatusCanceled          TeamSubscriptionStatus = "canceled"
	TeamSubscriptionStatusUnpaid            TeamSubscriptionStatus = "unpaid"
	TeamSubscriptionStatusPaused            TeamSubscriptionStatus = "paused"
)

type TeamSubscription struct {
	ID                     uuid.UUID                `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	CreatedAt              time.Time                `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt              time.Time                `gorm:"autoUpdateTime" json:"updated_at"`
	TeamID                 uuid.UUID                `gorm:"type:uuid;not null" json:"team_id"`
	PlanType               TeamSubscriptionPlan     `gorm:"default:null" json:"plan_type"`
	StripePriceID          string                   `gorm:"default:null" json:"stripe_price_id"`
	StripePriceLookupKey   string                   `gorm:"default:null" json:"stripe_price_lookup_key"`
	Interval               TeamSubscriptionInterval `gorm:"default:null" json:"interval"`
	StripeProductID        string                   `gorm:"default:null" json:"stripe_product_id"`
	StripeSubscriptionID   string                   `gorm:"default:null" json:"stripe_subscription_id"`
	StripeScheduleID       string                   `gorm:"default:null" json:"stripe_schedule_id"`
	FreeTrialEndsAt        *time.Time               `gorm:"default:null" json:"free_trial_ends_at"`
	FreeTrialDuration      int                      `gorm:"default:null" json:"free_trial_duration"`
	CanceledAt             *time.Time               `gorm:"default:null" json:"canceled_at"`
	CancelAt               *time.Time               `gorm:"default:null" json:"cancel_at"`
	Status                 TeamSubscriptionStatus   `gorm:"default:null" json:"status"`
	FailureMessage         string                   `gorm:"default:null" json:"failure_message"`
	FailureCode            string                   `gorm:"default:null" json:"failure_code"`
	InvoicePaymentFailedAt *time.Time               `gorm:"default:null" json:"invoice_payment_failed_at"`
	HasValidPaymentMethod  bool                     `gorm:"default:null" json:"has_valid_payment_method"`
}

type TeamSubscriptionResponse struct {
	PlanType                   TeamSubscriptionPlan     `json:"plan_type"`
	StripePriceID              string                   `json:"stripe_price_id"`
	StripePriceLookupKey       string                   `json:"stripe_price_lookup_key"`
	Interval                   TeamSubscriptionInterval `json:"interval"`
	StripeProductID            string                   `json:"stripe_product_id"`
	StripeSubscriptionID       string                   `json:"stripe_subscription_id"`
	FreeTrialActive            bool                     `json:"free_trial_active"`
	FreeTrialDuration          int                      `json:"free_trial_duration"`
	FreeTrialDurationRemaining int                      `json:"free_trial_duration_remaining"`
	FreeTrialEndsAt            *time.Time               `json:"free_trial_ends_at"`
	SubscriptionCanceled       bool                     `json:"subscription_canceled"`
	SubscriptionCancelAt       *time.Time               `json:"subscription_cancel_at"`
}

func NewTeamSubscriptionResponse(t *TeamSubscription) *TeamSubscriptionResponse {
	now := time.Now()

	var freeTrialActive bool
	var freeTrialDurationRemaining int

	// check if free trial is active and calculate remaining duration
	if t.FreeTrialEndsAt != nil {
		freeTrialActive = now.Before(*t.FreeTrialEndsAt)
		if freeTrialActive {
			// add 1 to show correct number of days (includes current day)
			freeTrialDurationRemaining = int(t.FreeTrialEndsAt.Sub(now).Hours()/24) + 1
		}
	}

	return &TeamSubscriptionResponse{
		PlanType:                   t.PlanType,
		StripePriceID:              t.StripePriceID,
		StripePriceLookupKey:       t.StripePriceLookupKey,
		Interval:                   t.Interval,
		StripeProductID:            t.StripeProductID,
		StripeSubscriptionID:       t.StripeSubscriptionID,
		FreeTrialActive:            freeTrialActive,
		FreeTrialDuration:          t.FreeTrialDuration,
		FreeTrialDurationRemaining: freeTrialDurationRemaining,
		FreeTrialEndsAt:            t.FreeTrialEndsAt,
		SubscriptionCanceled:       t.CancelAt != nil,
		SubscriptionCancelAt:       t.CancelAt,
	}
}

type UpdateSubscriptionIntervalRequest struct {
	Interval TeamSubscriptionInterval `json:"interval"`
}
