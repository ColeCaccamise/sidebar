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
	Email string `json:"email"`
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
	OriginalSignInAt *time.Time `json:"original_sign_in_at"`
	UserID           uuid.UUID  `json:"user_id"`
	Version          *time.Time `json:"version"`
	Device           string     `json:"device"`
	IPAddress        string     `json:"ip_address"`
	LastLocation     string     `json:"last_location"`
	LastSeenAt       *time.Time `json:"last_seen_at"`
}
