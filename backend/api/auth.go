package api

import (
	"encoding/json"
	"fmt"
	"github.com/ip2location/ip2location-go/v9"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/colecaccamise/go-backend/models"
	"github.com/colecaccamise/go-backend/util"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/mileusna/useragent"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/exp/rand"
)

func (s *Server) VerifyUserNotDeleted(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, _, _, err := getUserIdentity(s, r)
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
		user, _, _, err := getUserIdentity(s, r)
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
			_, _, _, err = util.ParseJWT(authToken.Value)
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
			tokenSecurityVersion := claims["version"]

			var refreshTokenSecurityVersion interface{}
			if refreshToken != nil {
				refreshTokenParsed, err := jwt.Parse(refreshToken.Value, func(token *jwt.Token) (interface{}, error) {
					return []byte(os.Getenv("JWT_SECRET")), nil
				})
				if err == nil {
					refreshClaims := refreshTokenParsed.Claims.(jwt.MapClaims)
					refreshTokenSecurityVersion = refreshClaims["version"]
				}
			}

			if user.SecurityVersion != nil {
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

				if tokenTime.Before(*user.SecurityVersion) ||
					(refreshTokenSecurityVersion != nil && refreshTokenTime.Before(*user.SecurityVersion)) {
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

func (s *Server) handleIdentity(w http.ResponseWriter, r *http.Request) error {
	// Read in auth token
	authToken, err := r.Cookie("auth-token")

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	// Parse auth token
	userId, tokenType, sessionId, err := util.ParseJWT(authToken.Value)
	if err != nil || tokenType != "auth" || userId == "" || sessionId == "" {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "token is invalid or expired.", Code: "invalid_token"})
	}

	_, err = s.store.GetSessionByID(uuid.MustParse(sessionId))
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "session expired.", Code: "session_expired"})
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

	userId, authTokenType, sessionId, err := util.ParseJWT(refreshToken.Value)
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

	session, err := s.store.GetSessionByID(uuid.MustParse(sessionId))
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "session expired.", Code: "session_expired"})
	}

	//err = s.store.DeleteSessionByID(uuid.MustParse(sessionId))
	//if err != nil {
	//	return WriteJSON(w, http.StatusUnauthorized, Error{Error: "internal server error.", Code: "internal_server_error"})
	//}
	//

	now := time.Now()
	device := getClientDevice(r)
	location := getClientLocation(r)
	ip := getClientIP(r)

	session.Version = &now
	session.Device = device
	session.LastLocation = location
	session.IPAddress = ip
	session.LastSeenAt = &now

	err = s.store.UpdateSession(session)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	authToken, err := generateToken(user, "auth", session)
	if err != nil {
		return err
	}

	refresh, err := generateToken(user, "refresh", session)
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
		Value:    refresh,
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 30,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	userIdentity := models.NewUserIdentityResponse(user)

	return WriteJSON(w, http.StatusOK, Response{Data: userIdentity})
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
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "cannot signup", Error: "an account with this email already exists", Code: "email_taken"})
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

	now := time.Now()
	device := getClientDevice(r)
	location := getClientLocation(r)
	ip := getClientIP(r)

	session := &models.Session{
		OriginalSignInAt: &now,
		UserID:           user.ID,
		Version:          &now,
		Device:           device,
		IPAddress:        ip,
		LastLocation:     location,
		LastSeenAt:       &now,
	}

	err = s.store.CreateSession(session)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Message: "internal server error.", Code: "internal_server_error"})
	}

	// generate auth confirmation token
	confirmationToken, err := generateToken(user, "email_confirmation", session)
	if err != nil {
		return err
	}

	// generate email resend token
	emailResendToken, err := generateToken(user, "email_resend", session)
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
	authToken, err := generateToken(user, "auth", session)
	if err != nil {
		return err
	}

	refreshToken, err := generateToken(user, "refresh", session)
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
		MaxAge:   60 * 60 * 24 * 30,
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

	userId, authTokenType, sessionId, err := util.ParseJWT(authToken.Value)
	if err != nil || authTokenType != "auth" {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized.", Code: "unauthorized"})
	}

	user, err := s.store.GetUserByID(uuid.MustParse(userId))
	if err != nil {
		fmt.Printf("Error getting user: %v\n", err)
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "invalid token.", Code: "unauthorized"})
	}

	session, err := s.store.GetSessionByID(uuid.MustParse(sessionId))
	if err != nil {
		fmt.Printf("Error getting session: %v\n", err)
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized", Code: "unauthorized"})
	}

	// verify users email isn't already confirmed
	if user.EmailConfirmedAt != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "email already confirmed", Error: "email already confirmed", Code: "email_already_confirmed"})
	}

	emailConfirmationToken, err := generateToken(user, "email_confirmation", session)
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

	now := time.Now()
	device := getClientDevice(r)
	location := getClientLocation(r)
	ip := getClientIP(r)

	session := &models.Session{
		OriginalSignInAt: &now,
		UserID:           user.ID,
		Version:          &now,
		Device:           device,
		IPAddress:        ip,
		LastLocation:     location,
		LastSeenAt:       &now,
	}

	err = s.store.CreateSession(session)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Message: "internal server error.", Code: "internal_server_error"})
	}

	authToken, err := generateToken(user, "auth", session)
	if err != nil {
		return err
	}

	refreshToken, err := generateToken(user, "refresh", session)
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
		MaxAge:   60 * 60 * 24 * 30,
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
		if token != nil && token.Claims.(jwt.MapClaims)["type"] == "email_update_confirmation" {
			return WriteJSON(w, http.StatusUnauthorized, Error{Error: "invalid token", Code: "invalid_update_token"})
		} else {
			return WriteJSON(w, http.StatusUnauthorized, Error{Error: "invalid token", Code: "invalid_token"})
		}
	}

	userId, authTokenType, sessionId, err := util.ParseJWT(tokenReq.Token)

	if authTokenType != "email_update_confirmation" && authTokenType != "email_confirmation" {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "invalid token"})
	}

	user, err := s.store.GetUserByID(uuid.MustParse(userId))
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "invalid token"})
	}

	previousSession, err := s.store.GetSessionByID(uuid.MustParse(sessionId))
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "invalid token"})
	}

	err = s.store.DeleteSessionByID(previousSession.ID)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "invalid token"})
	}

	// update security version
	now := time.Now()
	device := getClientDevice(r)
	location := getClientLocation(r)
	ip := getClientIP(r)

	session := &models.Session{
		OriginalSignInAt: &now,
		UserID:           user.ID,
		Version:          &now,
		Device:           device,
		IPAddress:        ip,
		LastLocation:     location,
	}
	err = s.store.CreateSession(session)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "invalid token"})
	}

	user.SecurityVersion = &now

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	// specify redirect url
	redirectUrl := fmt.Sprintf("%s/dashboard?message=email_confirmed", os.Getenv("APP_URL"))

	// specify success message/code
	successMessage := "email confirmed successfully."
	successCode := "email_confirmed"

	// set auth cookies
	authToken, err := generateToken(user, "auth", session)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Message: "internal server error.", Code: "internal_server_error"})
	}

	refreshToken, err := generateToken(user, "refresh", session)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Message: "internal server error.", Code: "internal_server_error"})
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
		MaxAge:   60 * 60 * 24 * 30,
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

	if user.UpdatedEmail != "" {
		user.Email = user.UpdatedEmail
		user.UpdatedEmail = ""
		user.UpdatedEmailConfirmedAt = &now
		redirectUrl = fmt.Sprintf("%s/auth/login?message=email_updated", os.Getenv("APP_URL"))
		successMessage = "email updated successfully."
		successCode = "email_updated"
	} else {
		if user.EmailConfirmedAt == nil {
			user.EmailConfirmedAt = &now

			redirectUrl = fmt.Sprintf("%s/onboarding/terms?message=email_confirmed", os.Getenv("APP_URL"))
		} else {
			if user.TermsAcceptedAt == nil {
				redirectUrl = fmt.Sprintf("%s/onboarding/terms?message=email_confirmed", os.Getenv("APP_URL"))
			} else if user.TeamCreatedOrJoinedAt == nil {
				redirectUrl = fmt.Sprintf("%s/onboarding/team?message=email_confirmed", os.Getenv("APP_URL"))
			} else if user.OnboardingCompletedAt == nil {
				redirectUrl = fmt.Sprintf("%s/onboarding/stage1?message=email_confirmed", os.Getenv("APP_URL"))
			}

			return WriteJSON(w, http.StatusOK, Response{Message: successMessage, Code: successCode, Data: map[string]string{"redirect_url": redirectUrl}})
		}
	}

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, Response{Message: successMessage, Code: successCode, Data: map[string]string{"redirect_url": redirectUrl}})
}

func (s *Server) handleVerifyPassword(w http.ResponseWriter, r *http.Request) error {
	verifyPasswordRequest := new(models.VerifyPasswordRequest)
	if err := json.NewDecoder(r.Body).Decode(verifyPasswordRequest); err != nil {
		return err
	}

	user, _, _, err := getUserIdentity(s, r)

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "invalid credentials", Error: "unauthorized"})
	}

	passwordMatches := comparePasswords(user.HashedPassword, verifyPasswordRequest.Password)
	if !passwordMatches {
		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "invalid credentials", Error: "invalid password", Code: "invalid_password"})
	}

	resetEmailToken, err := generateToken(user, "reset_email", &models.Session{})
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "reset-email-token",
		Value:    resetEmailToken,
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 30,
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
	forgotPasswordToken, err := generateToken(user, "reset_password", &models.Session{})

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

	userId, tokenType, _, err := util.ParseJWT(changePasswordRequest.Token)
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

	if err = s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	device := getClientDevice(r)
	location := getClientLocation(r)
	ip := getClientIP(r)
	now := time.Now()

	session := &models.Session{
		UserID:           user.ID,
		OriginalSignInAt: &now,
		Device:           device,
		LastLocation:     location,
		IPAddress:        ip,
		Version:          &now,
		LastSeenAt:       &now,
	}
	err = s.store.CreateSession(session)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	authToken, err := generateToken(user, "auth", session)

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	refreshToken, err := generateToken(user, "refresh", session)

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

	user.SecurityVersion = &now

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, Response{Message: "password changed.", Code: "password_changed"})
}

func (s *Server) handleDeleteSessions(w http.ResponseWriter, r *http.Request) error {
	now := time.Now()

	user, _, _, err := getUserIdentity(s, r)
	if err != nil {
		return err
	}

	// update security version
	user.SecurityVersion = &now

	if err := s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	if err = s.store.DeleteSessionsByUserID(user.ID); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
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

func generateToken(user *models.User, tokenType string, session *models.Session) (string, error) {
	if tokenType != "auth" && tokenType != "refresh" && tokenType != "reset_password" && tokenType != "email_confirmation" && tokenType != "email_resend" && tokenType != "reset_email" && tokenType != "email_update_confirmation" {
		return "", fmt.Errorf("invalid token type")
	}

	claims := jwt.MapClaims{
		"user_id":    user.ID,
		"session_id": session.ID,
		"exp": func() int64 {
			if tokenType == "refresh" {
				return time.Now().Add(time.Hour * 24 * 30).Unix()
			}
			if tokenType == "email_resend" {
				return time.Now().Add(time.Hour * 24).Unix()
			}
			if tokenType == "reset_email" {
				return time.Now().Add(time.Minute * 10).Unix()
			}
			return time.Now().Add(time.Minute * 15).Unix()
		}(),
		"type":    tokenType,
		"version": user.SecurityVersion,
	}

	authToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedAuthToken, err := authToken.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return "", err
	}

	return signedAuthToken, nil
}

func getUserIdentity(s *Server, r *http.Request) (user *models.User, authType string, session *models.Session, err error) {
	if s == nil || r == nil {
		return nil, "", nil, fmt.Errorf("both server and request not provided")
	}

	authToken, e := r.Cookie("auth-token")
	apiKey := r.Header.Get("X-API-KEY")

	// require either auth token or api key
	if apiKey == "" && e != nil {
		return nil, "", nil, e
	}

	// handle auth token authentication
	if authToken != nil {
		userId, authTokenType, sessionId, e := util.ParseJWT(authToken.Value)
		if e != nil && apiKey == "" {
			return nil, "", nil, e
		}

		if sessionId != "" && authTokenType == "auth" {
			session, err := s.store.GetSessionByID(uuid.MustParse(sessionId))
			if err != nil && apiKey == "" {
				return nil, "", nil, err
			}
			if session == nil && apiKey == "" {
				return nil, "", nil, fmt.Errorf("invalid session")
			}
		}

		if userId != "" && authTokenType == "auth" {
			user, err := s.store.GetUserByID(uuid.MustParse(userId))
			if err != nil && apiKey == "" {
				return nil, "", nil, err
			}
			if user == nil && apiKey == "" {
				return nil, "", nil, fmt.Errorf("invalid user")
			}
			if user != nil {
				return user, "authToken", session, nil
			}
		}

	}

	// handle api key authentication
	// todo revert below
	if apiKey != "" {
		//return nil, "", fmt.Errorf("identity not implemented for api keys")
		user, _ := s.store.GetUserByID(uuid.MustParse("3d570849-ce04-42f7-9c3b-8e5dda72fd3a"))

		return user, "authToken", nil, nil
	}

	return nil, "", nil, fmt.Errorf("no valid authentication method")
}

func getClientIP(r *http.Request) string {
	// cloudflare
	ip := r.Header.Get("CF-Connecting-IP")
	if ip != "" {
		return ip
	}

	// fallbacks
	ip = r.Header.Get("X-Real-Ip")
	if ip != "" {
		return ip
	}

	ip = r.Header.Get("X-Forwarded-For")
	if ip != "" {
		// get first ip if multiple are present
		return strings.Split(ip, ",")[0]
	}

	return strings.Split(r.RemoteAddr, ":")[0]
}

func getClientDevice(r *http.Request) string {
	ua := r.Header.Get("User-Agent")
	userAgent := useragent.Parse(ua)

	if userAgent.Name == "" && userAgent.OS == "" {
		return "Unknown"
	}

	if userAgent.Name != "" && userAgent.OS == "" {
		return userAgent.Name
	}

	if userAgent.Name == "" && userAgent.OS != "" {
		return userAgent.OS
	}

	return fmt.Sprintf("%s on %s", userAgent.Name, userAgent.OS)
}

func getClientLocation(r *http.Request) string {
	loc, err := ip2location.OpenDB("./IP-COUNTRY-REGION-CITY-LATITUDE-LONGITUDE-ZIPCODE-TIMEZONE-ISP-DOMAIN-NETSPEED-AREACODE-WEATHER-MOBILE-ELEVATION-USAGETYPE-ADDRESSTYPE-CATEGORY-DISTRICT-ASN.BIN")

	if err != nil {
		return "Unknown"
	}

	ip := getClientIP(r)
	city, _ := loc.Get_city(ip)
	country, _ := loc.Get_country_short(ip)

	if city.City == "" && country.Country_short == "" {
		return "Unknown"
	} else if city.City == "" && country.Country_short != "" {
		return country.Country_short
	} else if city.City != "" && country.Country_short == "" {
		return country.City
	} else {
		return fmt.Sprintf("%s, %s", city.City, country.Country_short)
	}
}
