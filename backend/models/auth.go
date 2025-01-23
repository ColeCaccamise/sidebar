package models

import (
	"github.com/google/uuid"
	"time"
)

type AuthToken struct {
	HashedToken string `json:"hashed_token"`
	Exp         int64  `json:"exp"`
	Type        string `json:"type"`
}

type SignupRequest struct {
	Email string `json:"email"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Redirect string `json:"redirect"`
}

type ConfirmEmailTokenRequest struct {
	Token string `json:"token"`
}

type ConfirmMagicAuthRequest struct {
	Code  string `json:"code"`
	Email string `json:"email"`
}

type VerifyPasswordRequest struct {
	Password string `json:"password"`
}

type Session struct {
	ID               uuid.UUID  `json:"id" gorm:"primary_key;type:uuid;default:gen_random_uuid()"`
	CreatedAt        time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt        time.Time  `json:"updated_at" gorm:"autoCreateTime"`
	WorkosSessionID  string     `json:"workos_session_id"`
	OriginalSignInAt *time.Time `json:"original_sign_in_at"`
	UserID           uuid.UUID  `json:"user_id"`
	Version          *time.Time `json:"version"`
	Device           string     `json:"device"`
	IPAddress        string     `json:"ip_address"`
	LastLocation     string     `json:"last_location"`
	LastSeenAt       *time.Time `json:"last_seen_at"`
	AuthMethod       AuthMethod `json:"auth_method"`
	RevokedAt        *time.Time `json:"revoked_at"`
}

type SessionResponse struct {
	ID               uuid.UUID  `json:"id"`
	OriginalSignInAt *time.Time `json:"original_sign_in_at"`
	Version          *time.Time `json:"version"`
	Device           string     `json:"device"`
	IPAddress        string     `json:"ip_address"`
	LastLocation     string     `json:"last_location"`
	LastSeenAt       *time.Time `json:"last_seen_at"`
	AuthMethod       AuthMethod `json:"auth_method"`
}

func NewSessionResponse(s *Session) *SessionResponse {
	return &SessionResponse{
		ID:               s.ID,
		OriginalSignInAt: s.OriginalSignInAt,
		Version:          s.Version,
		Device:           s.Device,
		IPAddress:        s.IPAddress,
		LastLocation:     s.LastLocation,
		LastSeenAt:       s.LastSeenAt,
		AuthMethod:       s.AuthMethod,
	}
}

type AuthMethod string

const (
	AuthMethodEmail  AuthMethod = "email"
	AuthMethodGoogle AuthMethod = "google"
	AuthMethodGitHub AuthMethod = "github"
)

type UserAuthMethod struct {
	ID         uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID     uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"` // reference to your user table
	Method     AuthMethod `gorm:"not null" json:"method"`            // renamed from ProviderName
	Email      string     `gorm:"type:text" json:"email,omitempty"`  // email used for this auth method
	LastUsedAt *time.Time `gorm:"index" json:"last_used_at"`         // track when this method was last used
	CreatedAt  time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
	IsActive   bool       `gorm:"default:true" json:"is_active"`
}
