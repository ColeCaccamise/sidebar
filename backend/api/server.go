package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/httprate"

	"github.com/colecaccamise/go-backend/middleware"
	"github.com/colecaccamise/go-backend/models"
	"github.com/colecaccamise/go-backend/storage"
	"github.com/colecaccamise/go-backend/util"
	"github.com/go-chi/chi"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/h2non/filetype"
	"github.com/rs/cors"
	"github.com/stripe/stripe-go/v80"
	"github.com/stripe/stripe-go/v80/subscription"
	"golang.org/x/crypto/bcrypt"
)

type Error struct {
	Message string `json:"message"`
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
}

type Response struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
	Code    string      `json:"code,omitempty"`
}

type apiFunc func(http.ResponseWriter, *http.Request) error

type Server struct {
	listenAddr string
	store      storage.Storage
}

func NewServer(listenAddr string, store storage.Storage) *Server {
	return &Server{
		listenAddr: listenAddr,
		store:      store,
	}
}

func (s *Server) Start() error {
	r := chi.NewRouter()
	stripe.Key = os.Getenv("STRIPE_KEY")

	r.NotFound(makeHttpHandleFunc(handleNotFound))
	r.MethodNotAllowed(makeHttpHandleFunc(handleMethodNotAllowed))

	r.Use(chiMiddleware.Heartbeat("/ping"))
	r.Use(chiMiddleware.GetHead)

	// todo rate limit based on auth token, browser fingerprint, etc.
	r.Use(httprate.LimitByIP(100, 1*time.Minute))

	r.Route("/auth", func(r chi.Router) {
		r.Post("/signup", makeHttpHandleFunc(s.handleSignup))
		r.Post("/resend-email", makeHttpHandleFunc(s.handleResendEmail))
		r.Post("/login", makeHttpHandleFunc(s.handleLogin))
		r.Post("/logout", makeHttpHandleFunc(s.handleLogout))
		r.Post("/confirm", makeHttpHandleFunc(s.handleConfirmEmailToken))
		r.Post("/forgot-password", makeHttpHandleFunc(s.handleForgotPassword))
		r.Post("/change-password", makeHttpHandleFunc(s.handleChangePassword))
		r.Delete("/sessions", makeHttpHandleFunc(s.handleDeleteSessions))
	})

	r.Group(func(r chi.Router) {
		r.Use(s.VerifySecurityVersion)
		r.Get("/auth/identity", makeHttpHandleFunc(s.handleIdentity))
		r.Get("/auth/refresh", makeHttpHandleFunc(s.handleRefreshToken))
	})

	r.Group(func(r chi.Router) {
		r.Use(s.VerifyUserNotDeleted)
		r.Use(s.VerifySecurityVersion)
		r.Route("/tokens", func(r chi.Router) {
			r.Get("/", makeHttpHandleFunc(s.handleGetAllTokens))
			// r.Post("/", makeHttpHandleFunc(s.handleCreateToken))
			// r.Delete("/{id}", makeHttpHandleFunc(s.handleDeleteToken))
		})
	})

	r.Group(func(r chi.Router) {
		r.Use(middleware.VerifyAuth)
		r.Use(s.VerifyUserNotDeleted)
		r.Use(s.VerifySecurityVersion)
		r.Post("/auth/verify-password", makeHttpHandleFunc(s.handleVerifyPassword))
	})

	// TODO: secure these routes to admins only
	//r.Group(func(r chi.Router) {
	//	r.Use(middleware.VerifyAuth)
	//	r.Route("/users", func(r chi.Router) {
	//		r.Post("/", makeHttpHandleFunc(s.handleCreateUser))
	//		r.Get("/", makeHttpHandleFunc(s.handleGetAllUsers))
	//		r.Get("/{id}", makeHttpHandleFunc(s.handleGetUserByID))
	//		r.Patch("/{id}", makeHttpHandleFunc(s.handleUpdateUserByID))
	//		r.Patch("/{id}/email", makeHttpHandleFunc(s.handleUpdateUserEmailByID))
	//		r.Post("/{id}/resend-email", makeHttpHandleFunc(s.handleResendUpdateEmailByID))
	//		r.Delete("/{id}", makeHttpHandleFunc(s.handleDeleteUserByID))
	//		r.Patch("/{id}/avatar", makeHttpHandleFunc(s.handleUploadAvatarByID))
	//	})
	//})

	// user taking actions on their own account they're logged in to
	r.Group(func(r chi.Router) {
		r.Use(middleware.VerifyAuth)
		r.Use(s.VerifyUserNotDeleted)
		r.Use(s.VerifySecurityVersion)
		r.Route("/users", func(r chi.Router) {
			r.Patch("/", makeHttpHandleFunc(s.handleUpdateUser))
			r.Delete("/", makeHttpHandleFunc(s.handleDeleteUser))
			r.Patch("/email", makeHttpHandleFunc(s.handleUpdateUserEmail))
			r.Post("/resend-email", makeHttpHandleFunc(s.handleResendUpdateEmail))
			r.Patch("/avatar", makeHttpHandleFunc(s.handleUploadAvatar))
			r.Delete("/avatar", makeHttpHandleFunc(s.handleDeleteAvatar))
			r.Patch("/change-password", makeHttpHandleFunc(s.handleChangeUserPassword))
		})
	})

	// user actions that can be taken when deleted
	r.Group(func(r chi.Router) {
		r.Use(middleware.VerifyAuth)
		r.Patch("/users/restore", makeHttpHandleFunc(s.handleRestoreUser))
	})

	// subscription routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.VerifyAuth)
		r.Use(s.VerifyUserNotDeleted)
		r.Use(s.VerifySecurityVersion)
		r.Get("/subscriptions", makeHttpHandleFunc(s.handleGetSubscriptions))
	})

	stack := middleware.CreateStack(
		middleware.Logging,
		middleware.Nosniff,
	)

	fmt.Println("Server is running on port", s.listenAddr)

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:8000", "https://colecaccamise.com"},
		AllowCredentials: true,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"Content-Type", "Location"},
		AllowOriginFunc: func(origin string) bool {
			if os.Getenv("ENVIRONMENT") == "development" {
				return origin == "http://localhost:3000" || origin == "http://localhost:8000"
			} else {
				return origin == "https://colecaccamise.com"
			}
		},
		// Enable Debugging for testing, disable in production
		Debug: os.Getenv("ENVIRONMENT") == "development",
	})

	handler := c.Handler(stack(r))

	return http.ListenAndServe(s.listenAddr, handler)
}

func (s *Server) VerifyUserNotDeleted(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, _, err := getUserIdentity(s, r)
		if err != nil {
			_ = WriteJSON(w, http.StatusUnauthorized, Error{Message: "unauthorized", Error: err.Error()})
			return
		}

		if user.DeletedAt != nil {
			_ = WriteJSON(w, http.StatusForbidden, Error{
				Error: "This action cannot be completed because your account has been deleted",
				Code:  "user_deleted",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) VerifySecurityVersion(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, _, err := getUserIdentity(s, r)
		if err != nil {
			// proceed to next route (to allow refresh)
			next.ServeHTTP(w, r)
		}

		authToken, err := r.Cookie("auth-token")
		if err != nil {
			authToken = nil
		}
		refreshToken, err := r.Cookie("refresh-token")
		if err != nil {
			refreshToken = nil
		}
		if authToken != nil {
			// Parse token to get claims
			_, _, err = util.ParseJWT(authToken.Value)
			if err != nil {
				_ = WriteJSON(w, http.StatusUnauthorized, Error{
					Error: "session expired. please log in again.",
					Code:  "session_expired",
				})
				return
			}

			// Get token claims
			token, err := jwt.Parse(authToken.Value, func(token *jwt.Token) (interface{}, error) {
				return []byte(os.Getenv("JWT_SECRET")), nil
			})
			if err != nil {
				_ = WriteJSON(w, http.StatusUnauthorized, Error{
					Error: "session expired. please log in again.",
					Code:  "session_expired",
				})
				return
			}

			claims := token.Claims.(jwt.MapClaims)
			tokenSecurityVersion := claims["security_version_changed_at"]

			var refreshTokenSecurityVersion interface{}
			if refreshToken != nil {
				refreshTokenParsed, err := jwt.Parse(refreshToken.Value, func(token *jwt.Token) (interface{}, error) {
					return []byte(os.Getenv("JWT_SECRET")), nil
				})
				if err == nil {
					refreshClaims := refreshTokenParsed.Claims.(jwt.MapClaims)
					refreshTokenSecurityVersion = refreshClaims["security_version_changed_at"]
				}
			}

			if user.SecurityVersionChangedAt != nil {
				tokenTime, err := time.Parse(time.RFC3339, tokenSecurityVersion.(string))
				if err != nil {
					WriteJSON(w, http.StatusUnauthorized, Error{Error: "session expired. please log in again.", Code: "session_expired"})
					return
				}

				var refreshTokenTime time.Time
				if refreshTokenSecurityVersion != nil {
					refreshTokenTime, err = time.Parse(time.RFC3339, refreshTokenSecurityVersion.(string))
					if err != nil {
						WriteJSON(w, http.StatusUnauthorized, Error{Error: "session expired. please log in again.", Code: "session_expired"})
						return
					}
				}

				if tokenTime.Before(*user.SecurityVersionChangedAt) ||
					(refreshTokenSecurityVersion != nil && refreshTokenTime.Before(*user.SecurityVersionChangedAt)) {
					http.SetCookie(w, &http.Cookie{
						Name:     "auth-token",
						Value:    "",
						Path:     "/",
						Expires:  time.Unix(0, 0),
						Secure:   true,
						SameSite: http.SameSiteLaxMode,
					})
					http.SetCookie(w, &http.Cookie{
						Name:     "refresh-token",
						Value:    "",
						Path:     "/",
						Expires:  time.Unix(0, 0),
						Secure:   true,
						SameSite: http.SameSiteLaxMode,
					})

					_ = WriteJSON(w, http.StatusUnauthorized, Error{
						Error: "session expired. please log in again.",
						Code:  "session_expired",
					})
					return
				}
			}

		}

		next.ServeHTTP(w, r)

	})
}

func handleNotFound(w http.ResponseWriter, req *http.Request) error {
	return WriteJSON(w, http.StatusNotFound, Error{Message: fmt.Sprintf("cannot %s %s", req.Method, req.URL.Path), Error: "route not found"})
}

func handleMethodNotAllowed(w http.ResponseWriter, req *http.Request) error {
	return WriteJSON(w, http.StatusMethodNotAllowed, Error{Message: fmt.Sprintf("cannot %s %s", req.Method, req.URL.Path), Error: "method not allowed"})
}

func (s *Server) handleIdentity(w http.ResponseWriter, r *http.Request) error {
	// Read in auth token
	authToken, err := r.Cookie("auth-token")

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	// Parse auth token
	userId, tokenType, err := util.ParseJWT(authToken.Value)
	if err != nil || tokenType != "auth" || userId == "" {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	// If valid, return user
	userData, err := s.store.GetUserByID(uuid.MustParse(userId))
	if err != nil {
		http.SetCookie(w, &http.Cookie{
			Name:     "auth-token",
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	userIdentity := models.NewUserIdentityResponse(userData)

	return WriteJSON(w, http.StatusOK, userIdentity)
}

func (s *Server) handleRefreshToken(w http.ResponseWriter, r *http.Request) error {
	refreshToken, err := r.Cookie("refresh-token")
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "user is not authenticated", Error: err.Error()})
	}

	userId, authTokenType, err := util.ParseJWT(refreshToken.Value)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "user is not authenticated", Error: err.Error()})
	}

	if authTokenType != "refresh" {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "user is not authenticated", Error: "unauthorized"})
	}

	user, err := s.store.GetUserByID(uuid.MustParse(userId))
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "user is not authenticated", Error: err.Error()})
	}

	authToken, err := generateToken(user, "auth")
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth-token",
		Value:    authToken,
		Path:     "/",
		MaxAge:   60 * 15,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	return WriteJSON(w, http.StatusOK, nil)
}

func (s *Server) handleSignup(w http.ResponseWriter, r *http.Request) error {
	signupReq := new(models.SignupRequest)

	if err := json.NewDecoder(r.Body).Decode(signupReq); err != nil {
		errorMsg := "invalid request"
		if err == io.EOF {
			errorMsg = "request body is empty"
		}
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: errorMsg})
	}

	if signupReq.Email == "" || signupReq.Password == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: "email and password are required"})
	}

	existingUser, _ := s.store.GetUserByEmail(signupReq.Email)
	if existingUser != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "cannot signup", Error: "an account with this email already exists"})
	}

	eightOrMore, number, upper, special := util.ValidatePassword(signupReq.Password)

	var errorMessages []string
	if !eightOrMore {
		errorMessages = append(errorMessages, "be at least 8 characters long")
	}
	if !number {
		errorMessages = append(errorMessages, "contain at least one number")
	}
	if !upper {
		errorMessages = append(errorMessages, "contain at least one uppercase letter")
	}
	if !special {
		errorMessages = append(errorMessages, "contain at least one special character")
	}

	if len(errorMessages) > 0 {
		errorMessage := "Password must " + strings.Join(errorMessages, ", ")
		if len(errorMessages) > 1 {
			lastIndex := len(errorMessages) - 1
			errorMessage = strings.Join(errorMessages[:lastIndex], ", ") + ", and " + errorMessages[lastIndex]
			errorMessage = "Password must " + errorMessage
		}
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: errorMessage})
	}

	hashedPassword, err := hashAndSaltPassword(signupReq.Password)
	if err != nil {
		return err
	}

	// create user object
	user := models.NewUser(&models.CreateUserRequest{
		Email:          signupReq.Email,
		HashedPassword: hashedPassword,
	})

	// store user object in db
	if err := s.store.CreateUser(user); err != nil {
		return err
	}

	// generate auth confirmation token
	confirmationToken, err := generateToken(user, "email_confirmation")
	if err != nil {
		return err
	}

	// generate email resend token
	emailResendToken, err := generateToken(user, "email_resend")
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "email-resend-token",
		Value:    emailResendToken,
		Path:     "/",
		MaxAge:   60 * 60 * 24,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	confirmationUrl := fmt.Sprintf("%s/auth/confirm?token=%s", os.Getenv("APP_URL"), confirmationToken)

	// send confirmation email
	err = util.SendEmail(signupReq.Email, "Confirm your email", fmt.Sprintf("Click here to confirm your email: %s", confirmationUrl))

	if err != nil {
		return err
	}

	// generate auth tokens
	authToken, err := generateToken(user, "auth")
	if err != nil {
		return err
	}

	refreshToken, err := generateToken(user, "refresh")
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth-token",
		Value:    authToken,
		Path:     "/",
		MaxAge:   60 * 15,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh-token",
		Value:    refreshToken,
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 90,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	// redirect to confirm-email page
	redirectUrl := fmt.Sprintf("%s/auth/confirm-email?email=%s", os.Getenv("APP_URL"), signupReq.Email)

	return WriteJSON(w, http.StatusOK, map[string]string{"redirect_url": redirectUrl})
}

func (s *Server) handleResendEmail(w http.ResponseWriter, r *http.Request) error {
	authToken, err := r.Cookie("auth-token")

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "user is not authenticated", Error: err.Error()})
	}

	userId, authTokenType, err := util.ParseJWT(authToken.Value)
	if err != nil || authTokenType != "auth" {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "user is not authenticated", Error: err.Error()})
	}

	user, err := s.store.GetUserByID(uuid.MustParse(userId))
	if err != nil {
		fmt.Printf("Error getting user: %v\n", err)
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "invalid token", Error: err.Error()})
	}

	// verify users email isn't already confirmed
	if user.EmailConfirmedAt != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "email already confirmed", Error: "email already confirmed"})
	}

	emailConfirmationToken, err := generateToken(user, "email_confirmation")
	if err != nil {
		fmt.Printf("Error generating token: %v\n", err)
		return err
	}

	confirmationUrl := fmt.Sprintf("%s/auth/confirm?token=%s", os.Getenv("APP_URL"), emailConfirmationToken)

	err = util.SendEmail(user.Email, "Confirm your email", fmt.Sprintf("Click here to confirm your email: %s", confirmationUrl))

	if err != nil {
		fmt.Printf("Error sending email: %v\n", err)
		return err
	}

	return WriteJSON(w, http.StatusOK, nil)
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) error {
	// TODO: check that user isnt already logged in
	loginReq := new(models.LoginRequest)
	if err := json.NewDecoder(r.Body).Decode(loginReq); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request.", Error: "empty body.", Code: "empty_body"})
	}

	user, err := s.store.GetUserByEmail(loginReq.Email)

	if err != nil {
		// simulate work with random time between 40 and 90ms
		randomNum := rand.Intn(41) + 50
		time.Sleep(time.Duration(randomNum) * time.Millisecond)
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "unauthorized", Error: "invalid credentials.", Code: "invalid_credentials"})
	}

	passwordMatches := comparePasswords(user.HashedPassword, loginReq.Password)
	if !passwordMatches {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "unauthorized", Error: "invalid credentials.", Code: "invalid_credentials"})
	}

	authToken, err := generateToken(user, "auth")
	if err != nil {
		return err
	}

	refreshToken, err := generateToken(user, "refresh")
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth-token",
		Value:    authToken,
		Path:     "/",
		MaxAge:   60 * 15,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh-token",
		Value:    refreshToken,
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 90,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	return WriteJSON(w, http.StatusOK, nil)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) error {
	http.SetCookie(w, &http.Cookie{
		Name:     "auth-token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh-token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "email-resend-token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	return WriteJSON(w, http.StatusOK, nil)
}

func (s *Server) handleConfirmEmailToken(w http.ResponseWriter, r *http.Request) error {
	tokenReq := new(models.ConfirmEmailTokenRequest)
	if err := json.NewDecoder(r.Body).Decode(tokenReq); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
	}

	if tokenReq.Token == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: "token is required"})
	}

	token, err := jwt.Parse(tokenReq.Token, func(token *jwt.Token) (any, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})

	if err != nil {
		if token.Claims.(jwt.MapClaims)["type"] == "email_update_confirmation" {
			return WriteJSON(w, http.StatusUnauthorized, Error{Message: "invalid token", Error: err.Error(), Code: "invalid_update_token"})
		}
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "invalid token", Error: err.Error(), Code: "invalid_token"})
	}

	userId, ok := token.Claims.(jwt.MapClaims)["user_id"]
	if !ok {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "invalid token"})
	}

	uuid, err := uuid.Parse(userId.(string))
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "invalid token"})
	}

	user, err := s.store.GetUserByID(uuid)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "invalid token"})
	}

	// update security version
	now := time.Now()

	user.SecurityVersionChangedAt = &now

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	// specify redirect url
	redirectUrl := fmt.Sprintf("%s/dashboard?message=email_confirmed", os.Getenv("APP_URL"))

	// specify success message/code
	successMessage := "email confirmed successfully."
	successCode := "email_confirmed"

	if user.UpdatedEmail != "" {
		user.Email = user.UpdatedEmail
		user.UpdatedEmail = ""
		user.UpdatedEmailConfirmedAt = &now
		redirectUrl = fmt.Sprintf("%s/auth/login?message=email_updated", os.Getenv("APP_URL"))
		successMessage = "email updated successfully."
		successCode = "email_updated"
	} else {
		user.EmailConfirmedAt = &now
	}

	if err := s.store.UpdateUser(user); err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth-token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh-token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	cookies := w.Header()["Set-Cookie"]
	if len(cookies) == 0 {
		fmt.Println("warning: no cookies were set in the response headers")
	} else {
		fmt.Println("cookies set in response headers:", cookies)
	}

	return WriteJSON(w, http.StatusOK, Response{Message: successMessage, Code: successCode, Data: map[string]string{"redirect_url": redirectUrl}})
}

func (s *Server) handleVerifyPassword(w http.ResponseWriter, r *http.Request) error {
	verifyPasswordRequest := new(models.VerifyPasswordRequest)
	if err := json.NewDecoder(r.Body).Decode(verifyPasswordRequest); err != nil {
		return err
	}

	user, _, err := getUserIdentity(s, r)

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "invalid credentials", Error: "unauthorized"})
	}

	passwordMatches := comparePasswords(user.HashedPassword, verifyPasswordRequest.Password)
	if !passwordMatches {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "invalid credentials", Error: "invalid password", Code: "invalid_password"})
	}

	resetEmailToken, err := generateToken(user, "reset_email")
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "reset-email-token",
		Value:    resetEmailToken,
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 90,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	return WriteJSON(w, http.StatusOK, Response{Message: "password verified", Code: "password_verified"})
}

func (s *Server) handleForgotPassword(w http.ResponseWriter, r *http.Request) error {
	// validate email
	forgotPasswordRequest := new(models.ForgotPasswordRequest)
	if err := json.NewDecoder(r.Body).Decode(forgotPasswordRequest); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "empty body.", Code: "empty_body"})
	}

	email := forgotPasswordRequest.Email

	if email == "" || !util.ValidateEmail(email) {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "a valid email is required.", Code: "email_not_provided"})
	}

	// check if email exists in system
	user, err := s.store.GetUserByEmail(email)

	if user == nil {
		// simulate work with random time between 300 and 700ms
		randomNum := rand.Intn(401) + 300
		time.Sleep(time.Duration(randomNum) * time.Millisecond)
		return WriteJSON(w, http.StatusOK, Response{Message: "password reset link sent.", Code: "password_reset_sent"})
	}

	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	// generate forgot password token
	forgotPasswordToken, err := generateToken(user, "reset_password")

	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	// send email
	resetPasswordUrl := fmt.Sprintf("%s/auth/change-password?token=%s", os.Getenv("APP_URL"), forgotPasswordToken)

	// todo warn about error
	_ = util.SendEmail(user.Email, "Reset your dashboard password", fmt.Sprintf("Click here to reset your password: %s", resetPasswordUrl))

	return WriteJSON(w, http.StatusOK, Response{Message: "password reset link sent.", Code: "password_reset_sent"})
}

func (s *Server) handleChangePassword(w http.ResponseWriter, r *http.Request) error {
	// validate token
	changePasswordRequest := new(models.ChangePasswordRequest)
	if err := json.NewDecoder(r.Body).Decode(changePasswordRequest); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "empty body.", Code: "empty_body"})
	}

	if changePasswordRequest.Token == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "missing token.", Code: "missing_token"})
	}

	userId, tokenType, err := util.ParseJWT(changePasswordRequest.Token)
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	if tokenType != "reset_password" {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	if userId == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	user, err := s.store.GetUserByID(uuid.MustParse(userId))

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	if user == nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	// validate passwords exists
	if changePasswordRequest.Password == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "new password is required.", Code: "missing_new_password"})
	}

	if changePasswordRequest.ConfirmPassword == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "password confirmation is required.", Code: "missing_confirm_password"})
	}

	// validate passwords match
	if changePasswordRequest.Password != changePasswordRequest.ConfirmPassword {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "new passwords do not match.", Code: "new_password_mismatch"})
	}

	// validate password is not the same as existing
	if comparePasswords(user.HashedPassword, changePasswordRequest.Password) {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "new password must be different.", Code: "password_unchanged"})
	}

	// validate password strength
	eightOrMore, number, upper, special := util.ValidatePassword(changePasswordRequest.Password)

	var errorMessages []string
	if !eightOrMore {
		errorMessages = append(errorMessages, "be at least 8 characters long")
	}
	if !number {
		errorMessages = append(errorMessages, "contain at least one number")
	}
	if !upper {
		errorMessages = append(errorMessages, "contain at least one uppercase letter")
	}
	if !special {
		errorMessages = append(errorMessages, "contain at least one special character")
	}

	if len(errorMessages) > 0 {
		errorMessage := "Password must " + strings.Join(errorMessages, ", ")
		if len(errorMessages) > 1 {
			lastIndex := len(errorMessages) - 1
			errorMessage = strings.Join(errorMessages[:lastIndex], ", ") + ", and " + errorMessages[lastIndex]
			errorMessage = "Password must " + errorMessage
		}
		return WriteJSON(w, http.StatusBadRequest, Error{Message: errorMessage, Error: errorMessage, Code: "weak_password"})
	}

	// hash password
	hashedPassword, err := hashAndSaltPassword(changePasswordRequest.Password)

	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	user.HashedPassword = hashedPassword

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	authToken, err := generateToken(user, "auth")

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	refreshToken, err := generateToken(user, "refresh")

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth-token",
		Value:    authToken,
		Path:     "/",
		MaxAge:   60 * 15,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh-token",
		Value:    refreshToken,
		Path:     "/",
		MaxAge:   60 * 15,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	// update security version
	now := time.Now()

	user.SecurityVersionChangedAt = &now

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, Response{Message: "password changed.", Code: "password_changed"})
}

func (s *Server) handleDeleteSessions(w http.ResponseWriter, r *http.Request) error {
	now := time.Now()

	user, _, err := getUserIdentity(s, r)
	if err != nil {
		return err
	}

	// update security version
	user.SecurityVersionChangedAt = &now

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	// delete cookies
	http.SetCookie(w, &http.Cookie{
		Name:     "auth-token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh-token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	return WriteJSON(w, http.StatusOK, Response{Message: "logged out of all sessions.", Code: "sessions_deleted"})
}

func hashAndSaltPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func comparePasswords(hashedPassword, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password)) == nil
}

func generateToken(user *models.User, tokenType string) (string, error) {
	if tokenType != "auth" && tokenType != "refresh" && tokenType != "reset_password" && tokenType != "email_confirmation" && tokenType != "email_resend" && tokenType != "reset_email" && tokenType != "email_update_confirmation" {
		return "", fmt.Errorf("invalid token type")
	}

	claims := jwt.MapClaims{
		"user_id": user.ID,
		"exp": func() int64 {
			if tokenType == "refresh" {
				return time.Now().Add(time.Hour * 24 * 90).Unix()
			}
			if tokenType == "email_resend" {
				return time.Now().Add(time.Hour * 24).Unix()
			}
			if tokenType == "reset_email" {
				return time.Now().Add(time.Minute * 10).Unix()
			}
			return time.Now().Add(time.Minute * 15).Unix()
		}(),
		"type": tokenType,
		// securityVersionChangedAt
		"security_version_changed_at": user.SecurityVersionChangedAt,
	}

	authToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedAuthToken, err := authToken.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return "", err
	}

	return signedAuthToken, nil
}

func getUserIdentity(s *Server, r *http.Request) (user *models.User, authType string, err error) {
	if s == nil || r == nil {
		return nil, "", fmt.Errorf("both server and request not provided")
	}

	authToken, e := r.Cookie("auth-token")
	apiKey := r.Header.Get("X-API-KEY")

	// require either auth token or api key
	if apiKey == "" && e != nil {
		return nil, "", e
	}

	// handle auth token authentication
	if authToken != nil {
		userId, authTokenType, e := util.ParseJWT(authToken.Value)
		if e != nil && apiKey == "" {
			return nil, "", e
		}

		if userId != "" && authTokenType == "auth" {
			user, err := s.store.GetUserByID(uuid.MustParse(userId))
			if err != nil && apiKey == "" {
				return nil, "", err
			}
			if user == nil && apiKey == "" {
				return nil, "", fmt.Errorf("invalid user")
			}
			if user != nil {
				return user, "authToken", nil
			}
		}
	}

	// handle api key authentication
	if apiKey != "" {
		return nil, "", fmt.Errorf("identity not implemented for api keys")
	}

	return nil, "", fmt.Errorf("no valid authentication method")
}

func (s *Server) handleCreateUser(w http.ResponseWriter, r *http.Request) error {
	createUserReq := new(models.CreateUserRequest)
	if err := json.NewDecoder(r.Body).Decode(createUserReq); err != nil {
		return err
	}

	user := models.NewUser(createUserReq)

	if err := s.store.CreateUser(user); err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, user)
}

func (s *Server) handleGetAllUsers(w http.ResponseWriter, r *http.Request) error {
	users, err := s.store.GetAllUsers()
	if err != nil {
		return err
	}
	return WriteJSON(w, http.StatusOK, users)
}

func (s *Server) handleGetUserByID(w http.ResponseWriter, r *http.Request) error {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid id", Error: err.Error()})
	}

	user, err := s.store.GetUserByID(id)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{Message: fmt.Sprintf("cannot %s %s", r.Method, r.URL.Path), Error: "user not found"})
	}

	return WriteJSON(w, http.StatusOK, user)
}

func (s *Server) handleUpdateUser(w http.ResponseWriter, r *http.Request) error {
	user, _, err := getUserIdentity(s, r)
	if err != nil {
		return err
	}

	updateUserReq := new(models.UpdateUserRequest)
	if err := json.NewDecoder(r.Body).Decode(updateUserReq); err != nil {
		return err
	}

	user.FirstName = updateUserReq.FirstName
	user.LastName = updateUserReq.LastName

	if err := s.store.UpdateUser(user); err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, user)
}

func (s *Server) handleUpdateUserEmail(w http.ResponseWriter, r *http.Request) error {
	user, _, err := getUserIdentity(s, r)
	if err != nil {
		return err
	}

	resetEmailToken, err := r.Cookie("reset-email-token")
	if err != nil {
		http.SetCookie(w, &http.Cookie{
			Name:     "email-update-token",
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})
		return WriteJSON(w, http.StatusForbidden, Error{Message: "forbidden", Error: "token is invalid or expired", Code: "invalid_update_token"})
	}

	userId, authTokenType, err := util.ParseJWT(resetEmailToken.Value)

	if err != nil {
		return WriteJSON(w, http.StatusForbidden, Error{Message: "forbidden", Error: "token is invalid or expired", Code: "invalid_update_token"})
	}

	if uuid.MustParse(userId) != user.ID {
		return WriteJSON(w, http.StatusForbidden, Error{Message: "forbidden", Error: "cannot reset email", Code: "email_mismatch"})
	}

	if authTokenType != "reset_email" {
		return WriteJSON(w, http.StatusForbidden, Error{Message: "forbidden", Error: "token is invalid or expired", Code: "invalid_update_token"})
	}

	updateUserEmailReq := new(models.UpdateUserEmailRequest)
	if err := json.NewDecoder(r.Body).Decode(updateUserEmailReq); err != nil {
		return err
	}

	if updateUserEmailReq.Email == user.Email || updateUserEmailReq.Email == user.UpdatedEmail {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "email is the same", Error: "email is the same", Code: "email_unchanged"})
	}

	// validate user with requested email doesn't exist
	existingUser, _ := s.store.GetUserByEmail(updateUserEmailReq.Email)

	if existingUser != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "email taken", Error: "a user with this email already exists", Code: "email_taken"})
	}

	user.UpdatedEmail = updateUserEmailReq.Email
	now := time.Now()
	user.UpdatedEmailAt = &now

	if err := s.store.UpdateUser(user); err != nil {
		return err
	}

	// send email confirmation
	emailConfirmationToken, err := generateToken(user, "email_update_confirmation")
	if err != nil {
		return err
	}

	confirmationUrl := fmt.Sprintf("%s/auth/confirm?token=%s", os.Getenv("APP_URL"), emailConfirmationToken)

	// send confirmation to new email
	err = util.SendEmail(user.UpdatedEmail, "Confirm your new email", fmt.Sprintf("Please confirm your email by clicking <a href=\"%s\">here</a>", confirmationUrl))
	if err != nil {
		fmt.Printf("Error sending email: %v\n", err)
		return err
	}

	// send notice to current email
	err = util.SendEmail(user.Email, "Security Notice: Email Change Request Initiated", fmt.Sprintf("Someone requested to change your email to %s. If this was you, you can safely ignore this email. If it wasn't, please contact support immediately.", user.UpdatedEmail))
	if err != nil {
		fmt.Printf("Error sending email: %v\n", err)
		return err
	}

	// delete email update token after single use
	http.SetCookie(w, &http.Cookie{
		Name:     "email-update-token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	return WriteJSON(w, http.StatusOK, Response{Message: "email update requested", Data: map[string]string{"updated_email": user.UpdatedEmail, "email": user.Email}})
}

func (s *Server) handleResendUpdateEmail(w http.ResponseWriter, r *http.Request) error {
	// check that user has outstanding email update request
	user, _, err := getUserIdentity(s, r)

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "token is invalid or expired.", Error: "unauthorized.", Code: "unauthorized"})
	}

	// get updated email
	updatedEmail := user.UpdatedEmail

	if updatedEmail == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "cannot resend email.", Error: "no outstanding update request.", Code: "unauthorized"})
	}

	// send email
	emailConfirmationToken, err := generateToken(user, "email_update_confirmation")
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Message: "there was a problem resending the confirmation email.", Error: "internal server error.", Code: "internal_server_error"})
	}

	confirmationUrl := fmt.Sprintf("%s/auth/confirm?token=%s", os.Getenv("APP_URL"), emailConfirmationToken)

	// send confirmation to new email
	err = util.SendEmail(user.UpdatedEmail, "Confirm your new email", fmt.Sprintf("Please confirm your email by clicking <a href=\"%s\">here</a>", confirmationUrl))
	if err != nil {
		fmt.Printf("Error sending email: %v\n", err)
		return err
	}

	return WriteJSON(w, http.StatusOK, Response{Message: "email sent.", Code: "email_sent"})
}

func (s *Server) handleDeleteUser(w http.ResponseWriter, r *http.Request) error {
	deleteUserReq := new(models.DeleteUserRequest)
	if err := json.NewDecoder(r.Body).Decode(deleteUserReq); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: "empty body.", Code: "empty_body"})
	}

	password := deleteUserReq.Password

	if password == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: "password is required.", Code: "missing_password"})
	}

	user, _, err := getUserIdentity(s, r)
	if err != nil {
		return err
	}

	if user.DeletedAt != nil {
		if !comparePasswords(user.HashedPassword, password) {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "password is incorrect.", Code: "invalid_password"})
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "auth-token",
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})
		http.SetCookie(w, &http.Cookie{
			Name:     "refresh-token",
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})

		return WriteJSON(w, http.StatusNoContent, nil)
	} else {
		if !comparePasswords(user.HashedPassword, password) {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "password is incorrect.", Code: "invalid_password"})
		}

		// Send warning email
		err = util.SendEmail(user.Email, "SECURITY NOTICE: Account Deletion Initiated", "Your account has been deleted. If this was not you, please contact support immediately. After 90 days, this data will no longer be recoverable.")
		if err != nil {
			fmt.Printf("Error sending deletion email: %v\n", err)
			return err
		}

		now := time.Now()
		user.DeletedAt = &now

		if err := s.store.UpdateUser(user); err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		// todo set up cron task that watches out for outstanding account deletion requests

		http.SetCookie(w, &http.Cookie{
			Name:     "auth-token",
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})
		http.SetCookie(w, &http.Cookie{
			Name:     "refresh-token",
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})

		return WriteJSON(w, http.StatusNoContent, nil)
	}
}

func (s *Server) handleRestoreUser(w http.ResponseWriter, r *http.Request) error {
	user, _, err := getUserIdentity(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "token is invalid or expired", Code: "invalid_token"})
	}

	if user.DeletedAt == nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "cannot restore user", Code: "user_not_deleted"})
	}

	user.DeletedAt = nil

	now := time.Now()
	user.RestoredAt = &now

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error", Code: "internal_server_error"})
	}

	userData := models.NewUserIdentityResponse(user)

	return WriteJSON(w, http.StatusOK, Response{Message: "user restored", Code: "user_restored", Data: map[string]models.UserIdentityResponse{"user": *userData}})
}

func (s *Server) handleUploadAvatar(w http.ResponseWriter, r *http.Request) error {
	file, fileHeader, err := r.FormFile("avatar")

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
	}

	if file == nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: "file is required"})
	}

	buf, err := io.ReadAll(file)
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
	}
	fileType, err := filetype.MatchReader(bytes.NewReader(buf))
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
	}

	if fileType.MIME.Value != "image/jpeg" && fileType.MIME.Value != "image/png" {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: "file must be a jpeg or png"})
	}

	fmt.Println("file type:", fileType.MIME.Value)

	if fileHeader.Size > 2000000 {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "file too large", Error: "file too large"})
	}

	// delete existing avatar from S3
	user, _, err := getUserIdentity(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
	}

	avatarUrl := user.AvatarUrl
	avatarThumbUrl := user.AvatarThumbnailUrl

	if avatarUrl != "" {
		err = util.DeleteFileFromS3(avatarUrl)

		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
		}
	}

	if avatarThumbUrl != "" {
		err = util.DeleteFileFromS3(avatarThumbUrl)

		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
		}
	}

	// upload new avatar to s3
	filename, thumbFilename, err := util.UploadFileToS3(buf, true)
	if err != nil {
		return err
	}

	cloudfrontUrl := fmt.Sprintf("%s/%s", os.Getenv("CLOUDFRONT_URL"), filename)
	thumbCloudfrontUrl := fmt.Sprintf("%s/%s", os.Getenv("CLOUDFRONT_URL"), thumbFilename)

	authToken, err := r.Cookie("auth-token")

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "token is invalid or expired", Error: err.Error()})
	}

	userId, authTokenType, err := util.ParseJWT(authToken.Value)

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "token is invalid or expired", Error: err.Error()})
	}

	if authTokenType != "auth" {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "token is invalid.", Error: "incorrect token type", Code: "invalid_token"})
	}

	user, err = s.store.GetUserByID(uuid.MustParse(userId))
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{Message: "user not found", Error: err.Error()})
	}

	user.AvatarUrl = cloudfrontUrl
	user.AvatarThumbnailUrl = thumbCloudfrontUrl

	if err := s.store.UpdateUser(user); err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, map[string]any{"location": cloudfrontUrl, "file_type": fileType})
}

func (s *Server) handleDeleteAvatar(w http.ResponseWriter, r *http.Request) error {
	user, _, err := getUserIdentity(s, r)

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
	}

	avatarUrl := user.AvatarUrl

	avatarThumbUrl := user.AvatarThumbnailUrl

	if avatarUrl == "" && avatarThumbUrl == "" {
		return WriteJSON(w, http.StatusNoContent, nil)
	}

	if avatarThumbUrl == "" {
		err = util.DeleteFileFromS3(avatarUrl)

		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
		}
	}

	if avatarUrl == "" {
		err = util.DeleteFileFromS3(avatarThumbUrl)

		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
		}
	}

	if avatarUrl != "" && avatarThumbUrl != "" {
		err = util.DeleteFileFromS3(avatarUrl)

		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
		}

		err = util.DeleteFileFromS3(avatarThumbUrl)

		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
		}
	}

	user.AvatarUrl = ""
	user.AvatarThumbnailUrl = ""

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
	}

	return WriteJSON(w, http.StatusNoContent, nil)
}

func (s *Server) handleChangeUserPassword(w http.ResponseWriter, r *http.Request) error {
	user, _, err := getUserIdentity(s, r)

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "token is invalid or expired", Code: "bad_token"})
	}

	// validate input
	changePasswordReq := new(models.ChangeUserPasswordRequest)
	if err := json.NewDecoder(r.Body).Decode(changePasswordReq); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "old password, new password, and confirmed new password are required.", Code: "invalid_input"})
	}

	// validate current password
	oldPassword := changePasswordReq.OldPassword
	newPassword := changePasswordReq.NewPassword
	confirmNewPassword := changePasswordReq.ConfirmNewPassword

	if oldPassword == "" || newPassword == "" || confirmNewPassword == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "old password, new password, and confirmed new password are required.", Code: "invalid_input"})
	}

	oldPasswordMatches := comparePasswords(user.HashedPassword, oldPassword)

	if !oldPasswordMatches {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "old password does not match.", Code: "old_password_invalid"})
	}

	// validate new password is not same
	passwordUnchanged := comparePasswords(user.HashedPassword, newPassword)

	if passwordUnchanged {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "new password cannot be the same.", Code: "password_unchanged"})
	}

	// validate new and confirmed password are the same
	newPasswordMatches := newPassword == confirmNewPassword

	if !newPasswordMatches {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "new passwords do not match.", Code: "new_password_mismatch"})
	}

	// validate new password is strong
	eightOrMore, number, upper, special := util.ValidatePassword(changePasswordReq.NewPassword)

	var errorMessages []string
	if !eightOrMore {
		errorMessages = append(errorMessages, "be at least 8 characters long")
	}
	if !number {
		errorMessages = append(errorMessages, "contain at least one number")
	}
	if !upper {
		errorMessages = append(errorMessages, "contain at least one uppercase letter")
	}
	if !special {
		errorMessages = append(errorMessages, "contain at least one special character")
	}

	if len(errorMessages) > 0 {
		errorMessage := "Password must " + strings.Join(errorMessages, ", ")
		if len(errorMessages) > 1 {
			lastIndex := len(errorMessages) - 1
			errorMessage = strings.Join(errorMessages[:lastIndex], ", ") + ", and " + errorMessages[lastIndex]
			errorMessage = "Password must " + errorMessage
		}
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: errorMessage})
	}

	hashedPassword, err := hashAndSaltPassword(changePasswordReq.NewPassword)

	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "server_error"})
	}

	user.HashedPassword = hashedPassword

	if err := s.store.UpdateUser(user); err != nil {
		fmt.Printf("error updating user with new password: %s\n", err)

		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "server_error"})
	}

	// update security version
	now := time.Now()

	user.SecurityVersionChangedAt = &now

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, Response{Message: "password changed successfully.", Code: "password_changed"})
}

func (s *Server) handleGetAllTokens(w http.ResponseWriter, r *http.Request) error {
	// get current user from auth token
	//authToken, err := r.Cookie("auth-token")
	//
	//if err != nil {
	//	return WriteJSON(w, http.StatusUnauthorized, ApiError{Message: "user is not authenticated", Error: err.Error()})
	//}
	//
	//userId, authTokenType, err := util.ParseJWT(authToken.Value)
	//if err != nil || authTokenType != "auth" {
	//	return WriteJSON(w, http.StatusUnauthorized, ApiError{Message: "user is not authenticated", Error: err.Error()})
	//}

	//user, err := s.store.GetUserByID(uuid.MustParse(userId))
	//if err != nil {
	//	return WriteJSON(w, http.StatusUnauthorized, ApiError{Message: "user is not authenticated", Error: err.Error()})
	//}

	// get all of their api tokens from db
	//tokens, err := s.store.GetAPITokensByUserID(user.ID)
	//if err != nil {
	//	return WriteJSON(w, http.StatusInternalServerError, ApiError{Message: "error getting tokens", Error: err.Error()})
	//}

	return WriteJSON(w, http.StatusOK, nil)
}

func (s *Server) handleGetSubscriptions(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = "sk_test_51QWzbYATosx6QLQbAPARQD3lnSU4NvBQffCHrtc4KGcOYPnVlsLGvB6tVEfyrWCHVVpPrdiztbpkHhCjHDDLnRYb00NfHC2mH9"

	params := &stripe.SubscriptionParams{}
	result, err := subscription.Get("sub_1MowQVLkdIwHu7ixeRlqHVzs", params)

	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, nil)
}

func WriteJSON(w http.ResponseWriter, status int, v any) error {
	if status == http.StatusNoContent {
		w.WriteHeader(status)
		return nil
	}

	// Handle error case with null message
	if err, ok := v.(Error); ok {
		if err.Message == "" {
			v = Error{Error: err.Error, Code: err.Code}
		} else {
			v = Error{Message: err.Message, Error: err.Error, Code: err.Code}
		}
	} else if resp, ok := v.(Response); ok {
		// Only include data if it's not nil and not empty
		if resp.Data == nil || isEmptyData(resp.Data) {
			// Create new response without data field
			v = struct {
				Message string `json:"message,omitempty"`
				Code    string `json:"code,omitempty"`
			}{
				Message: resp.Message,
				Code:    resp.Code,
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	return json.NewEncoder(w).Encode(v)
}

// helper function to check if data is empty
func isEmptyData(data interface{}) bool {
	switch v := data.(type) {
	case map[string]interface{}:
		return len(v) == 0
	case []interface{}:
		return len(v) == 0
	case string:
		return v == ""
	case nil:
		return true
	default:
		return false
	}
}

func makeHttpHandleFunc(f apiFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := f(w, r); err != nil {
			WriteJSON(w, http.StatusBadRequest, Error{Message: fmt.Sprintf("cannot %s %s", r.Method, r.URL.Path), Error: err.Error()})
		}
	}
}
