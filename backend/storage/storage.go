package storage

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/colecaccamise/go-backend/models"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Storage interface {
	CreateUser(*models.User) error
	UpdateUser(*models.User) error
	GetAllUsers() ([]*models.User, error)
	GetUserByID(uuid.UUID) (*models.User, error)
	GetUserByEmail(string) (*models.User, error)
	GetUserByWorkosUserID(string) (*models.User, error)
	CreateUserAuthMethod(*models.UserAuthMethod) error
	GetAuthMethodByNameForUser(models.AuthMethod, uuid.UUID) (*models.UserAuthMethod, error)
	DeleteUserByID(uuid.UUID) error
	CreateTeam(*models.Team) error
	UpdateTeam(*models.Team) error
	GetTeamByName(string) (*models.Team, error)
	GetTeamBySlug(string) (*models.Team, error)
	CreateTeamMember(*models.TeamMember) error
	UpdateTeamMember(*models.TeamMember) error
	GetTeamInviteBySlugAndToken(string, string) (*models.TeamInvite, error)
	GetTeamInviteBySlugAndEmail(string, string) (*models.TeamInvite, error)
	GetTeamInvitesBySlugAndEmail(string, string) ([]*models.TeamInvite, error)
	GetTeamInvitesByTeamMemberID(teamMemberID uuid.UUID) ([]*models.TeamInvite, error)
	GetTeamInvitesByEmail(string) ([]*models.TeamInvite, error)
	UpdateTeamInvite(*models.TeamInvite) error
	GetTeamInviteByID(uuid.UUID) (*models.TeamInvite, error)
	GetTeamByWorkosOrgID(string) (*models.Team, error)
	CreateTeamInvite(*models.TeamInvite) error
	GetTeamMemberByTeamIDAndUserID(uuid.UUID, uuid.UUID) (*models.TeamMember, error)
	GetTeamMemberByID(uuid.UUID) (*models.TeamMember, error)
	GetTeamMemberByEmail(string) (*models.TeamMember, error)
	GetTeamMembersByEmail(string) ([]*models.TeamMember, error)
	GetTeamMembersByTeamID(uuid.UUID) ([]*models.TeamMember, error)
	GetTeamMembersByTeamIDAndRole(uuid.UUID, models.TeamRole) ([]*models.TeamMember, error)
	GetTeamMemberOwnersByTeamID(uuid.UUID) ([]*models.TeamMember, error)
	GetTeamsByUserID(userID uuid.UUID) ([]*models.Team, error)
	GetTeamMembersByUserID(uuid.UUID) ([]*models.TeamMember, error)
	GetTeamByID(uuid.UUID) (*models.Team, error)
	GetTeamByStripeCustomerID(string) (*models.Team, error)
	CreateTeamSubscription(*models.TeamSubscription) error
	UpdateTeamSubscription(*models.TeamSubscription) error
	GetTeamSubscriptionByID(uuid.UUID) (*models.TeamSubscription, error)
	GetTeamSubscriptionByStripeID(string) (*models.TeamSubscription, error)
	GetTeamSubscriptionByTeamIDAndStripePriceID(uuid.UUID, string) (*models.TeamSubscription, error)
	GetPromptsForUser(uuid.UUID) ([]*models.Prompt, error)
	GetPromptByID(uuid.UUID) (*models.Prompt, error)
	CreatePrompt(*models.Prompt) error
	UpdatePrompt(*models.Prompt) error
	CreateSession(*models.Session) error
	GetSessionsByUserID(userID uuid.UUID) ([]*models.Session, error)
	GetSessionByID(uuid.UUID) (*models.Session, error)
	GetActiveSessionsByUserID(uuid.UUID) ([]*models.Session, error)
	GetSessionByWorkosSessionID(string) (*models.Session, error)
	UpdateSession(*models.Session) error
	DeleteSessionByID(uuid.UUID) error
	DeleteSessionsByUserID(uuid.UUID) error
}

type PostgresStore struct {
	db *gorm.DB
}

func NewPostgresStore() (*PostgresStore, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s TimeZone=UTC",
		os.Getenv("POSTGRES_HOST"),
		os.Getenv("POSTGRES_USER"),
		os.Getenv("POSTGRES_PASSWORD"),
		os.Getenv("POSTGRES_DB"),
		os.Getenv("POSTGRES_PORT"),
	)
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			fmt.Println("Connected to database!")
			return &PostgresStore{db: db}, nil
		}
		fmt.Printf("Waiting for database to be ready... (%d/%d)\n", i+1, maxRetries)
		time.Sleep(5 * time.Second)
	}

	return nil, fmt.Errorf("failed to connect to database after %d retries", maxRetries)
}

func (s *PostgresStore) Init() error {
	err := s.CreateUsersTable()
	if err != nil {
		return err
	}

	err = s.CreateTeamsTable()
	if err != nil {
		return err
	}

	err = s.CreateTeamMembersTable()
	if err != nil {
		return err
	}

	err = s.CreateTeamInvitesTable()
	if err != nil {
		return err
	}

	err = s.CreateTeamSubscriptionsTable()
	if err != nil {
		return err
	}

	err = s.CreatePromptsTable()
	if err != nil {
		return err
	}

	err = s.CreateSessionsTable()
	if err != nil {
		return err
	}

	err = s.CreateUserAuthMethodsTable()
	if err != nil {
		return err
	}

	return nil
}

func (s *PostgresStore) CreateUsersTable() error {
	return s.db.AutoMigrate(&models.User{})
}

func (s *PostgresStore) CreateTeamsTable() error {
	return s.db.AutoMigrate(&models.Team{})
}

func (s *PostgresStore) CreateTeamMembersTable() error {
	return s.db.AutoMigrate(&models.TeamMember{})
}

func (s *PostgresStore) CreateTeamInvitesTable() error {
	return s.db.AutoMigrate(&models.TeamInvite{})
}

func (s *PostgresStore) CreateTeamSubscriptionsTable() error {
	return s.db.AutoMigrate(&models.TeamSubscription{})
}

func (s *PostgresStore) CreatePromptsTable() error {
	return s.db.AutoMigrate(&models.Prompt{})
}

func (s *PostgresStore) CreateSessionsTable() error {
	return s.db.AutoMigrate(&models.Session{})
}

func (s *PostgresStore) CreateUserAuthMethodsTable() error {
	return s.db.AutoMigrate(&models.UserAuthMethod{})
}

func (s *PostgresStore) CreateUser(user *models.User) error {
	result := s.db.Create(user)
	return result.Error
}

func (s *PostgresStore) UpdateUser(user *models.User) error {
	return s.db.Model(user).Select("*").Updates(user).Error // explicitly tell gorm to update with zero values
}

func (s *PostgresStore) GetUserByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	result := s.db.First(&user, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found with id %s", id)
		}
		return nil, result.Error
	}
	return &user, nil
}

func (s *PostgresStore) GetAuthMethodByNameForUser(authMethod models.AuthMethod, userID uuid.UUID) (*models.UserAuthMethod, error) {
	var userAuthMethod models.UserAuthMethod
	result := s.db.Where("user_id = ? AND method = ?", userID, authMethod).First(&userAuthMethod)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("auth method %s not found for user with id %s", authMethod, userID)
		}
		return nil, result.Error
	}
	return &userAuthMethod, nil
}

func (s *PostgresStore) GetUserByWorkosUserID(id string) (*models.User, error) {
	var user models.User
	result := s.db.Where("workos_user_id = ?", id).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found with workos user id %s", id)
		}
		return nil, result.Error
	}
	return &user, nil
}

func (s *PostgresStore) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	result := s.db.Where("email = ?", email).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found with email %s", email)
		}
		return nil, result.Error
	}
	return &user, nil
}

func (s *PostgresStore) GetAllUsers() ([]*models.User, error) {
	var users []*models.User
	result := s.db.Find(&users)
	if result.Error != nil {
		return nil, result.Error
	}
	return users, nil
}

func (s *PostgresStore) DeleteUserByID(id uuid.UUID) error {
	result := s.db.Delete(&models.User{}, id)
	return result.Error
}

func (s *PostgresStore) CreateUserAuthMethod(userAuthMethod *models.UserAuthMethod) error {
	result := s.db.Create(userAuthMethod)
	return result.Error
}

func (s *PostgresStore) CreateSession(session *models.Session) error {
	result := s.db.Create(session)
	return result.Error
}

func (s *PostgresStore) GetSessionByID(id uuid.UUID) (*models.Session, error) {
	var session models.Session
	result := s.db.First(&session, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("session not found with id %s", id)
		}
		return nil, result.Error
	}
	return &session, nil
}

func (s *PostgresStore) GetSessionByWorkosSessionID(id string) (*models.Session, error) {
	var session models.Session
	result := s.db.Where("workos_session_id = ?", id).First(&session)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team not found with name %s", session)
		}
		return nil, result.Error
	}
	return &session, nil
}

func (s *PostgresStore) GetSessionsByUserID(userID uuid.UUID) ([]*models.Session, error) {
	var sessions []*models.Session
	result := s.db.Where("user_id = ?", userID).Find(&sessions)
	if result.Error != nil {
		return nil, result.Error
	}
	return sessions, nil
}

func (s *PostgresStore) GetActiveSessionsByUserID(userID uuid.UUID) ([]*models.Session, error) {
	var sessions []*models.Session
	result := s.db.Where("user_id = ?", userID).Where("revoked_at IS NULL").Find(&sessions)
	if result.Error != nil {
		return nil, result.Error
	}
	return sessions, nil
}

func (s *PostgresStore) UpdateSession(session *models.Session) error {
	return s.db.Model(session).Select("*").Updates(session).Error // explicitly tell gorm to update with zero values
}

func (s *PostgresStore) DeleteSessionByID(id uuid.UUID) error {
	return s.db.Delete(&models.Session{}, id).Error
}

func (s *PostgresStore) DeleteSessionsByUserID(id uuid.UUID) error {
	return s.db.Where("user_id = ?", id).Delete(&models.Session{}).Error
}

func (s *PostgresStore) GetTeamsByUserID(userID uuid.UUID) ([]*models.Team, error) {
	var teams []*models.Team
	var teamMembers []*models.TeamMember

	// get all team members for this user
	result := s.db.Where("user_id = ? AND left_at IS NULL AND removed_at IS NULL", userID).Find(&teamMembers)
	if result.Error != nil {
		return nil, result.Error
	}

	// fetch team for each team member
	for _, member := range teamMembers {
		var team models.Team
		result := s.db.First(&team, member.TeamID)
		if result.Error == nil {
			teams = append(teams, &team)
		}
	}

	return teams, nil
}

func (s *PostgresStore) CreateTeam(team *models.Team) error {
	result := s.db.Create(team)
	return result.Error
}

func (s *PostgresStore) UpdateTeam(team *models.Team) error {
	return s.db.Model(team).Select("*").Updates(team).Error // explicitly tell gorm to update with zero values
}

func (s *PostgresStore) GetTeamByName(name string) (*models.Team, error) {
	var team models.Team
	result := s.db.Where("name = ?", name).First(&team)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team not found with name %s", name)
		}
		return nil, result.Error
	}
	return &team, nil
}

func (s *PostgresStore) GetTeamBySlug(slug string) (*models.Team, error) {
	var team models.Team
	result := s.db.Where("slug = ?", slug).First(&team)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team not found with slug %s", slug)
		}
		return nil, result.Error
	}
	return &team, nil
}

func (s *PostgresStore) GetTeamByID(id uuid.UUID) (*models.Team, error) {
	var team models.Team
	result := s.db.First(&team, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team not found with id %s", id)
		}
		return nil, result.Error
	}
	return &team, nil
}

func (s *PostgresStore) GetTeamByStripeCustomerID(stripeCustomerID string) (*models.Team, error) {
	var team models.Team
	result := s.db.Where("stripe_customer_id = ?", stripeCustomerID).First(&team)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team not found with stripe_customer_id %s", stripeCustomerID)
		}
		return nil, result.Error
	}
	return &team, nil
}

func (s *PostgresStore) CreateTeamInvite(teamInvite *models.TeamInvite) error {
	result := s.db.Create(teamInvite)
	return result.Error
}

func (s *PostgresStore) UpdateTeamInvite(teamInvite *models.TeamInvite) error {
	return s.db.Model(teamInvite).Select("*").Updates(teamInvite).Error // explicitly tell gorm to update with zero values
}

func (s *PostgresStore) GetTeamInvitesByTeamMemberID(teamMemberID uuid.UUID) ([]*models.TeamInvite, error) {
	var teamInvites []*models.TeamInvite
	result := s.db.Where("team_member_id = ?", teamMemberID).Find(&teamInvites)
	if result.Error != nil {
		return nil, result.Error
	}
	return teamInvites, nil
}

func (s *PostgresStore) GetTeamInvitesByEmail(email string) ([]*models.TeamInvite, error) {
	var teamInvites []*models.TeamInvite
	result := s.db.Where("email = ?", email).Find(&teamInvites)
	if result.Error != nil {
		return nil, result.Error
	}
	return teamInvites, nil
}

func (s *PostgresStore) GetTeamInviteBySlugAndToken(teamSlug string, token string) (*models.TeamInvite, error) {
	// First find the team by slug
	var team models.Team
	if err := s.db.Where("slug = ?", teamSlug).First(&team).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team not found with slug %s", teamSlug)
		}
		return nil, err
	}

	// Then find the invite using the team's ID
	var invite models.TeamInvite
	if err := s.db.Where("team_id = ? AND token = ?", team.ID, token).First(&invite).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invite not found with slug %s for team %s", token, teamSlug)
		}
		return nil, err
	}

	return &invite, nil
}

func (s *PostgresStore) GetTeamInviteBySlugAndEmail(teamSlug string, email string) (*models.TeamInvite, error) {
	// First find the team by slug
	var team models.Team
	if err := s.db.Where("slug = ?", teamSlug).First(&team).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team not found with slug %s", teamSlug)
		}
		return nil, err
	}

	// Then find the invite using the team's ID
	var invite models.TeamInvite
	if err := s.db.Where("team_id = ? AND email = ?", team.ID, email).First(&invite).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invite not found with for %s on team %s", email, teamSlug)
		}
		return nil, err
	}

	return &invite, nil
}

func (s *PostgresStore) GetTeamInvitesBySlugAndEmail(teamSlug string, email string) ([]*models.TeamInvite, error) {
	// First find the team by slug
	var team models.Team
	if err := s.db.Where("slug = ?", teamSlug).First(&team).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team not found with slug %s", teamSlug)
		}
		return nil, err
	}

	// find all team invites with team id
	var teamInvites []*models.TeamInvite
	if err := s.db.Where("team_id = ? AND email = ?", team.ID, email).Find(&teamInvites).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invite not found with slug %s", teamSlug)
		}
		return nil, err
	}
	return teamInvites, nil
}

func (s *PostgresStore) GetTeamInviteByID(id uuid.UUID) (*models.TeamInvite, error) {
	var teamInvite models.TeamInvite
	result := s.db.First(&teamInvite, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team invite not found with id %s", id)
		}
		return nil, result.Error
	}
	return &teamInvite, nil
}

func (s *PostgresStore) CreateTeamMember(teamMember *models.TeamMember) error {
	result := s.db.Create(teamMember)
	return result.Error
}

func (s *PostgresStore) UpdateTeamMember(teamMember *models.TeamMember) error {
	return s.db.Model(teamMember).Select("*").Updates(teamMember).Error // explicitly tell gorm to update with zero values
}

func (s *PostgresStore) GetTeamMemberByID(id uuid.UUID) (*models.TeamMember, error) {
	var teamMember models.TeamMember
	result := s.db.First(&teamMember, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team member not found with id %s", id)
		}
		return nil, result.Error
	}
	return &teamMember, nil
}

func (s *PostgresStore) GetTeamMemberByEmail(email string) (*models.TeamMember, error) {
	var teamMember models.TeamMember
	result := s.db.Where("email = ?", email).First(&teamMember)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team member not found with email %s", email)
		}
		return nil, result.Error
	}
	return &teamMember, nil
}

func (s *PostgresStore) GetTeamMembersByEmail(email string) ([]*models.TeamMember, error) {
	var teamMembers []*models.TeamMember
	result := s.db.Where("email = ?", email).Find(&teamMembers)
	if result.Error != nil {
		return nil, result.Error
	}
	return teamMembers, nil
}

func (s *PostgresStore) GetTeamByWorkosOrgID(orgID string) (*models.Team, error) {
	var team models.Team
	result := s.db.Where("workos_org_id = ?", orgID).First(&team)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team not found with orgId %s", orgID)
		}
		return nil, result.Error
	}
	return &team, nil
}

func (s *PostgresStore) GetTeamMemberByTeamIDAndUserID(teamID uuid.UUID, userID uuid.UUID) (*models.TeamMember, error) {
	var teamMember models.TeamMember
	result := s.db.Where("team_id = ? AND user_id = ?", teamID, userID).First(&teamMember)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team member not found with team id %s and user id %s", teamID, userID)
		}
		return nil, result.Error
	}
	return &teamMember, nil
}

func (s *PostgresStore) GetTeamMemberOwnersByTeamID(teamID uuid.UUID) ([]*models.TeamMember, error) {
	// validate team id
	if teamID == uuid.Nil {
		return nil, fmt.Errorf("invalid team id: cannot be nil")
	}

	var teamMembers []*models.TeamMember
	result := s.db.Where("team_id = ? AND team_role = ? AND left_at IS NULL AND removed_at IS NULL", teamID, "owner").Find(&teamMembers)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to query team members: %w", result.Error)
	}

	if len(teamMembers) == 0 {
		return nil, fmt.Errorf("no team owners found for team id %s", teamID)
	}

	return teamMembers, nil
}

func (s *PostgresStore) GetTeamMembersByTeamID(teamID uuid.UUID) ([]*models.TeamMember, error) {
	var teamMembers []*models.TeamMember
	result := s.db.Where("team_id = ? AND left_at IS NULL AND removed_at IS NULL", teamID).Find(&teamMembers)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team members not found with team id %s", teamID)
		}
		return nil, result.Error
	}
	return teamMembers, nil
}

func (s *PostgresStore) GetTeamMembersByTeamIDAndRole(teamID uuid.UUID, teamRole models.TeamRole) ([]*models.TeamMember, error) {
	var teamMembers []*models.TeamMember
	result := s.db.Where("team_id = ? AND team_role = ? AND left_at IS NULL AND removed_at IS NULL", teamID, teamRole).Find(&teamMembers)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team members not found with team id %s", teamID)
		}
		return nil, result.Error
	}
	return teamMembers, nil
}

func (s *PostgresStore) GetTeamMembersByUserID(userID uuid.UUID) ([]*models.TeamMember, error) {
	var teamMembers []*models.TeamMember
	result := s.db.Where("user_id = ?", userID).Find(&teamMembers)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team members not found with user id %s", userID)
		}
		return nil, result.Error
	}
	return teamMembers, nil
}

func (s *PostgresStore) CreateTeamSubscription(teamSubscription *models.TeamSubscription) error {
	result := s.db.Create(teamSubscription)
	return result.Error
}

func (s *PostgresStore) UpdateTeamSubscription(teamSubscription *models.TeamSubscription) error {
	return s.db.Model(teamSubscription).Select("*").Updates(teamSubscription).Error
}

func (s *PostgresStore) GetTeamSubscriptionByID(id uuid.UUID) (*models.TeamSubscription, error) {
	var teamSubscription models.TeamSubscription
	result := s.db.First(&teamSubscription, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team subscription not found with id %s", id)
		}
		return nil, result.Error
	}
	return &teamSubscription, nil
}

func (s *PostgresStore) GetTeamSubscriptionByStripeID(stripeID string) (*models.TeamSubscription, error) {
	var teamSubscription models.TeamSubscription
	result := s.db.Where("stripe_subscription_id = ?", stripeID).First(&teamSubscription)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team subscription not found with stripeID %s", stripeID)
		}
		return nil, result.Error
	}
	return &teamSubscription, nil
}

func (s *PostgresStore) GetTeamSubscriptionByTeamIDAndStripePriceID(teamID uuid.UUID, priceID string) (*models.TeamSubscription, error) {
	var teamSubscription models.TeamSubscription
	result := s.db.Where("team_id = ? AND stripe_price_id = ?", teamID, priceID).First(&teamSubscription)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("team subscription not found with stripe price ID %s", priceID)
		}
		return nil, result.Error
	}
	return &teamSubscription, nil
}

func (s *PostgresStore) GetPromptsForUser(userID uuid.UUID) ([]*models.Prompt, error) {
	var prompts []*models.Prompt
	result := s.db.Where("user_id = ?", userID).Find(&prompts)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("prompt not found with user id %s", userID)
		} else {
			return nil, result.Error
		}
	}
	return prompts, nil
}

func (s *PostgresStore) CreatePrompt(prompt *models.Prompt) error {
	result := s.db.Create(prompt)
	return result.Error
}

func (s *PostgresStore) UpdatePrompt(prompt *models.Prompt) error {
	return s.db.Model(prompt).Select("*").Updates(prompt).Error
}

func (s *PostgresStore) GetPromptByID(id uuid.UUID) (*models.Prompt, error) {
	var prompt models.Prompt
	result := s.db.First(&prompt, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("prompt not found with id %s", id)
		} else {
			return nil, result.Error
		}
	}
	return &prompt, nil
}
