package models

import (
	"github.com/google/uuid"
	"time"
)

type PromptType string

const (
	PromptTypeUpsell       PromptType = "upsell"
	PromptTypeFeature      PromptType = "feature"
	PromptTypeAnnouncement PromptType = "announcement"
)

type Prompt struct {
	ID          uuid.UUID  `json:"id" gorm:"primary_key;type:uuid;default:gen_random_uuid()"`
	Type        PromptType `json:"type" gorm:"not null"`
	Title       string     `json:"title" gorm:"not null"`
	Content     string     `json:"content" gorm:"not null"`
	StartDate   time.Time  `json:"start_date" gorm:"not null"`
	EndDate     *time.Time `json:"end_date,omitempty"`
	Priority    int        `json:"priority" gorm:"type:int;default:0"`
	Dismissible bool       `json:"dismissible" gorm:"default:true"`
	DismissedAt *time.Time `json:"dismissed_at" gorm:"default:null"`
	ActionLabel string     `json:"action_label,omitempty"`
	ActionURL   string     `json:"action_url,omitempty"`
	CreatedAt   time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	UserID      uuid.UUID  `json:"user_id" gorm:"not null"`
	TeamID      uuid.UUID  `json:"team_id" gorm:"default:null"`
}
