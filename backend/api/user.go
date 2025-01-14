package api

import (
	"context"
	"github.com/colecaccamise/go-backend/util"

	//"bytes"
	"encoding/json"
	"fmt"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
	"os"
	"time"

	//"io"
	"net/http"

	"github.com/colecaccamise/go-backend/models"
	"github.com/go-chi/chi"
	"github.com/google/uuid"
	//"github.com/h2non/filetype"
)

// USERS
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
	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "cannot update user.", Code: "internal_server_error"})
	}

	user := userSession.User

	updateUserReq := new(models.UpdateUserRequest)
	if err := json.NewDecoder(r.Body).Decode(updateUserReq); err != nil {
		return err
	}

	user.FirstName = updateUserReq.FirstName
	user.LastName = updateUserReq.LastName

	if err = s.store.UpdateUser(user); err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "cannot update user.", Code: "internal_server_error"})
	}

	usermanagement.SetAPIKey(os.Getenv("WORKOS_API_KEY"))

	_, err = usermanagement.UpdateUser(
		context.Background(),
		usermanagement.UpdateUserOpts{
			User:      user.WorkosUserID,
			FirstName: updateUserReq.FirstName,
			LastName:  updateUserReq.LastName,
		},
	)

	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "cannot update user.", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, user)
}

//func (s *Server) handleUpdateUserEmail(w http.ResponseWriter, r *http.Request) error {
//	userSession, err := getUserSession(s, r)
//	if err != nil {
//		return err
//	}
//
//	user := userSession.User
//
//	// todo: when updating email
//	// 1. check if user has a stripe account -> update their email and ensure it succeeds
//	// 2. check that no other user has an account with their email,
//
//	resetEmailToken, err := r.Cookie("reset-email-token")
//	if err != nil {
//		http.SetCookie(w, &http.Cookie{
//			Name:     "email-update-token",
//			Value:    "",
//			Path:     "/",
//			Expires:  time.Unix(0, 0),
//			Secure:   true,
//			SameSite: http.SameSiteLaxMode,
//		})
//		return WriteJSON(w, http.StatusForbidden, Error{Message: "forbidden", Error: "token is invalid or expired", Code: "invalid_update_token"})
//	}
//
//	decoded, err := util.ParseJWT(resetEmailToken.Value)
//
//	if err != nil {
//		return WriteJSON(w, http.StatusForbidden, Error{Message: "forbidden", Error: "token is invalid or expired", Code: "invalid_update_token"})
//	}
//
//	if decoded.WorkosUserID != user.WorkosUserID {
//		return WriteJSON(w, http.StatusForbidden, Error{Message: "forbidden", Error: "cannot reset email", Code: "email_mismatch"})
//	}
//
//	updateUserEmailReq := new(models.UpdateUserEmailRequest)
//	if err := json.NewDecoder(r.Body).Decode(updateUserEmailReq); err != nil {
//		return err
//	}
//
//	if updateUserEmailReq.Email == user.Email || updateUserEmailReq.Email == user.UpdatedEmail {
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "email is the same", Error: "email is the same", Code: "email_unchanged"})
//	}
//
//	// validate user with requested email doesn't exist
//	existingUser, _ := s.store.GetUserByEmail(updateUserEmailReq.Email)
//
//	if existingUser != nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "email taken", Error: "a user with this email already exists", Code: "email_taken"})
//	}
//
//	user.UpdatedEmail = updateUserEmailReq.Email
//	now := time.Now()
//	user.UpdatedEmailAt = &now
//
//	if err := s.store.UpdateUser(user); err != nil {
//		return err
//	}
//
//	// send email confirmation
//	emailConfirmationToken, err := generateToken(user, "email_update_confirmation", session)
//	if err != nil {
//		return err
//	}
//
//	confirmationUrl := fmt.Sprintf("%s/auth/confirm?token=%s", os.Getenv("APP_URL"), emailConfirmationToken)
//
//	// send confirmation to new email
//	err = util.SendEmail(user.UpdatedEmail, "Confirm your new email", fmt.Sprintf("Please confirm your email by clicking <a href=\"%s\">here</a>", confirmationUrl))
//	if err != nil {
//		fmt.Printf("Error sending email: %v\n", err)
//		return err
//	}
//
//	// send notice to current email
//	err = util.SendEmail(user.Email, "Security Notice: Email Change Request Initiated", fmt.Sprintf("Someone requested to change your email to %s. If this was you, you can safely ignore this email. If it wasn't, please contact support immediately.", user.UpdatedEmail))
//	if err != nil {
//		fmt.Printf("Error sending email: %v\n", err)
//		return err
//	}
//
//	// delete email update token after single use
//	http.SetCookie(w, &http.Cookie{
//		Name:     "email-update-token",
//		Value:    "",
//		Path:     "/",
//		Expires:  time.Unix(0, 0),
//		Secure:   true,
//		SameSite: http.SameSiteLaxMode,
//	})
//
//	return WriteJSON(w, http.StatusOK, Response{Message: "email update requested", Data: map[string]string{"updated_email": user.UpdatedEmail, "email": user.Email}})
//}

//func (s *Server) handleResendUpdateEmail(w http.ResponseWriter, r *http.Request) error {
//	// check that user has outstanding email update request
//	user, _, session, err := getUserIdentity(s, r)
//
//	if err != nil {
//		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "token is invalid or expired.", Error: "unauthorized.", Code: "unauthorized"})
//	}
//
//	// get updated email
//	updatedEmail := user.UpdatedEmail
//
//	if updatedEmail == "" {
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "cannot resend email.", Error: "no outstanding update request.", Code: "unauthorized"})
//	}
//
//	// send email
//	emailConfirmationToken, err := generateToken(user, "email_update_confirmation", session)
//	if err != nil {
//		return WriteJSON(w, http.StatusInternalServerError, Error{Message: "there was a problem resending the confirmation email.", Error: "internal server error.", Code: "internal_server_error"})
//	}
//
//	confirmationUrl := fmt.Sprintf("%s/auth/confirm?token=%s", os.Getenv("APP_URL"), emailConfirmationToken)
//
//	// send confirmation to new email
//	err = util.SendEmail(user.UpdatedEmail, "Confirm your new email", fmt.Sprintf("Please confirm your email by clicking <a href=\"%s\">here</a>", confirmationUrl))
//	if err != nil {
//		fmt.Printf("Error sending email: %v\n", err)
//		return err
//	}
//
//	return WriteJSON(w, http.StatusOK, Response{Message: "email sent.", Code: "email_sent"})
//}

func (s *Server) handleDeleteAccount(w http.ResponseWriter, r *http.Request) error {
	// todo handle team deletion - mark team as deleted when this user is the only owner
	deleteAccountReq := new(models.DeleteAccountRequest)
	if err := json.NewDecoder(r.Body).Decode(deleteAccountReq); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: "empty body.", Code: "empty_body"})
	}

	reason := deleteAccountReq.Reason
	otherReason := deleteAccountReq.OtherReason
	email := deleteAccountReq.Email

	if reason == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "reason is required.", Code: "missing_deleted_reason"})
	}

	if reason == "other" && otherReason == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "other reason is required.", Code: "missing_other_deleted_reason"})
	}

	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized.", Code: "unauthorized"})
	}
	user := userSession.User

	if email != user.Email {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "email is incorrect.", Code: "incorrect_email"})
	}

	usermanagement.SetAPIKey(os.Getenv("WORKOS_API_KEY"))

	err = usermanagement.RevokeSession(
		context.Background(),
		usermanagement.RevokeSessionOpts{
			SessionID: userSession.Session.WorkosSessionID,
		})

	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	session := userSession.Session
	now := time.Now()
	session.RevokedAt = &now

	err = s.store.UpdateSession(session)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
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

	if user.DeletedAt == nil {
		// Send warning email
		err = util.SendEmail(user.Email, "SECURITY NOTICE: Account Deletion Initiated", "Your account has been deleted. If this was not you, please contact support immediately. After 90 days, this data will no longer be recoverable.")
		if err != nil {
			fmt.Printf("Error sending deletion email: %v\n", err)
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		user.DeletedAt = &now

		if err = s.store.UpdateUser(user); err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		// update security version
		user.Version = &now

		// revoke all active sessions
		sessions, err := s.store.GetActiveSessionsByUserID(user.ID)
		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		for _, sess := range sessions {
			err = usermanagement.RevokeSession(
				context.Background(),
				usermanagement.RevokeSessionOpts{
					SessionID: sess.WorkosSessionID,
				})

			if err != nil {
				fmt.Printf("Error revoking session: %v\n", err)
				return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
			}

			sess.RevokedAt = &now
			if err = s.store.UpdateSession(sess); err != nil {
				fmt.Printf("Error revoking session: %v\n", err)
				return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
			}
		}

	}

	return WriteJSON(w, http.StatusNoContent, nil)
}

func (s *Server) handleRestoreAccount(w http.ResponseWriter, r *http.Request) error {
	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized.", Code: "unauthorized"})
	}

	user := userSession.User
	restorable := time.Since(*user.DeletedAt) < time.Hour*24*60

	if !restorable {
		return WriteJSON(w, http.StatusForbidden, Error{Error: "account cannot be restored. please contact support.", Code: "forbidden"})
	}

	if user.DeletedAt != nil && restorable {
		user.DeletedAt = nil
		now := time.Now()
		user.RestoredAt = &now

		err = s.store.UpdateUser(user)
		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}
	}

	return WriteJSON(w, http.StatusNoContent, nil)
}

func (s *Server) handleAcceptTerms(w http.ResponseWriter, r *http.Request) error {
	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized", Code: "unauthorized"})
	}
	user := userSession.User
	redirectUrl := fmt.Sprintf("%s/onboarding/team", os.Getenv("APP_URL"))

	if user.TermsAcceptedAt != nil {

		return WriteJSON(w, http.StatusOK, Response{Message: "terms accepted.", Code: "terms_accepted", Data: map[string]interface{}{
			"redirect_url": redirectUrl,
		}})
	}

	acceptTermsReq := new(models.AcceptTermsRequest)
	if err := json.NewDecoder(r.Body).Decode(acceptTermsReq); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "terms must be accepted or declined.", Code: "invalid_input"})
	}

	if !acceptTermsReq.TermsAccepted {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "terms must be accepted to use our application.", Code: "terms_declined"})
	} else {
		now := time.Now()
		user.TermsAcceptedAt = &now

		err = s.store.UpdateUser(user)
		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		return WriteJSON(w, http.StatusOK, Response{Message: "terms accepted.", Code: "terms_accepted", Data: map[string]interface{}{
			"redirect_url": redirectUrl,
		}})
	}
}

//func (s *Server) handleRestoreUser(w http.ResponseWriter, r *http.Request) error {
//	user, _, _, err := getUserIdentity(s, r)
//	if err != nil {
//		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "token is invalid or expired", Code: "invalid_token"})
//	}
//
//	if user.DeletedAt == nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "cannot restore user", Code: "user_not_deleted"})
//	}
//
//	user.DeletedAt = nil
//
//	now := time.Now()
//	user.RestoredAt = &now
//
//	if err := s.store.UpdateUser(user); err != nil {
//		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error", Code: "internal_server_error"})
//	}
//
//	userData := models.NewUserIdentityResponse(user)
//
//	return WriteJSON(w, http.StatusOK, Response{Message: "user restored", Code: "user_restored", Data: map[string]models.UserIdentityResponse{"user": *userData}})
//}

//func (s *Server) handleUploadAvatar(w http.ResponseWriter, r *http.Request) error {
//	file, fileHeader, err := r.FormFile("avatar")
//
//	if err != nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
//	}
//
//	if file == nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: "file is required"})
//	}
//
//	buf, err := io.ReadAll(file)
//	if err != nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
//	}
//	fileType, err := filetype.MatchReader(bytes.NewReader(buf))
//	if err != nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
//	}
//
//	if fileType.MIME.Value != "image/jpeg" && fileType.MIME.Value != "image/png" {
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: "file must be a jpeg or png"})
//	}
//
//	fmt.Println("file type:", fileType.MIME.Value)
//
//	if fileHeader.Size > 2000000 {
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "file too large", Error: "file too large"})
//	}
//
//	// delete existing avatar from S3
//	user, _, _, err := getUserIdentity(s, r)
//	if err != nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
//	}
//
//	avatarUrl := user.AvatarUrl
//	avatarThumbUrl := user.AvatarThumbnailUrl
//
//	if avatarUrl != "" {
//		err = util.DeleteFileFromS3(avatarUrl)
//
//		if err != nil {
//			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
//		}
//	}
//
//	if avatarThumbUrl != "" {
//		err = util.DeleteFileFromS3(avatarThumbUrl)
//
//		if err != nil {
//			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
//		}
//	}
//
//	// upload new avatar to s3
//	filename, thumbFilename, err := util.UploadFileToS3(buf, true)
//	if err != nil {
//		return err
//	}
//
//	cloudfrontUrl := fmt.Sprintf("%s/%s", os.Getenv("CLOUDFRONT_URL"), filename)
//	thumbCloudfrontUrl := fmt.Sprintf("%s/%s", os.Getenv("CLOUDFRONT_URL"), thumbFilename)
//
//	authToken, err := r.Cookie("auth-token")
//
//	if err != nil {
//		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "token is invalid or expired", Error: err.Error()})
//	}
//
//	userId, authTokenType, _, err := util.ParseJWT(authToken.Value)
//
//	if err != nil {
//		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "token is invalid or expired", Error: err.Error()})
//	}
//
//	if authTokenType != "auth" {
//		return WriteJSON(w, http.StatusUnauthorized, Error{Message: "token is invalid.", Error: "incorrect token type", Code: "invalid_token"})
//	}
//
//	user, err = s.store.GetUserByID(uuid.MustParse(userId))
//	if err != nil {
//		return WriteJSON(w, http.StatusNotFound, Error{Message: "user not found", Error: err.Error()})
//	}
//
//	user.AvatarUrl = cloudfrontUrl
//	user.AvatarThumbnailUrl = thumbCloudfrontUrl
//
//	if err := s.store.UpdateUser(user); err != nil {
//		return err
//	}
//
//	return WriteJSON(w, http.StatusOK, map[string]any{"location": cloudfrontUrl, "file_type": fileType})
//}

//func (s *Server) handleDeleteAvatar(w http.ResponseWriter, r *http.Request) error {
//	user, _, _, err := getUserIdentity(s, r)
//
//	if err != nil {
//		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized", Code: "unauthorized"})
//	}
//
//	avatarUrl := user.AvatarUrl
//
//	avatarThumbUrl := user.AvatarThumbnailUrl
//
//	if avatarUrl == "" && avatarThumbUrl == "" {
//		return WriteJSON(w, http.StatusNoContent, nil)
//	}
//
//	if avatarThumbUrl == "" {
//		err = util.DeleteFileFromS3(avatarUrl)
//
//		if err != nil {
//			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
//		}
//	}
//
//	if avatarUrl == "" {
//		err = util.DeleteFileFromS3(avatarThumbUrl)
//
//		if err != nil {
//			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
//		}
//	}
//
//	if avatarUrl != "" && avatarThumbUrl != "" {
//		err = util.DeleteFileFromS3(avatarUrl)
//
//		if err != nil {
//			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
//		}
//
//		err = util.DeleteFileFromS3(avatarThumbUrl)
//
//		if err != nil {
//			return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
//		}
//	}
//
//	user.AvatarUrl = ""
//	user.AvatarThumbnailUrl = ""
//
//	if err := s.store.UpdateUser(user); err != nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: err.Error()})
//	}
//
//	return WriteJSON(w, http.StatusNoContent, nil)
//}

//func (s *Server) handleChangeUserPassword(w http.ResponseWriter, r *http.Request) error {
//	user, _, _, err := getUserIdentity(s, r)
//
//	if err != nil {
//		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "token is invalid or expired", Code: "bad_token"})
//	}
//
//	// validate input
//	changePasswordReq := new(models.ChangeUserPasswordRequest)
//	if err := json.NewDecoder(r.Body).Decode(changePasswordReq); err != nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "old password, new password, and confirmed new password are required.", Code: "invalid_input"})
//	}
//
//	// validate current password
//	oldPassword := changePasswordReq.OldPassword
//	newPassword := changePasswordReq.NewPassword
//	confirmNewPassword := changePasswordReq.ConfirmNewPassword
//
//	if oldPassword == "" || newPassword == "" || confirmNewPassword == "" {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "old password, new password, and confirmed new password are required.", Code: "invalid_input"})
//	}
//
//	oldPasswordMatches := comparePasswords(user.HashedPassword, oldPassword)
//
//	if !oldPasswordMatches {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "old password does not match.", Code: "old_password_invalid"})
//	}
//
//	// validate new password is not same
//	passwordUnchanged := comparePasswords(user.HashedPassword, newPassword)
//
//	if passwordUnchanged {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "new password cannot be the same.", Code: "password_unchanged"})
//	}
//
//	// validate new and confirmed password are the same
//	newPasswordMatches := newPassword == confirmNewPassword
//
//	if !newPasswordMatches {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "new passwords do not match.", Code: "new_password_mismatch"})
//	}
//
//	// validate new password is strong
//	eightOrMore, number, upper, special := util.ValidatePassword(changePasswordReq.NewPassword)
//
//	var errorMessages []string
//	if !eightOrMore {
//		errorMessages = append(errorMessages, "be at least 8 characters long")
//	}
//	if !number {
//		errorMessages = append(errorMessages, "contain at least one number")
//	}
//	if !upper {
//		errorMessages = append(errorMessages, "contain at least one uppercase letter")
//	}
//	if !special {
//		errorMessages = append(errorMessages, "contain at least one special character")
//	}
//
//	if len(errorMessages) > 0 {
//		errorMessage := "Password must " + strings.Join(errorMessages, ", ")
//		if len(errorMessages) > 1 {
//			lastIndex := len(errorMessages) - 1
//			errorMessage = strings.Join(errorMessages[:lastIndex], ", ") + ", and " + errorMessages[lastIndex]
//			errorMessage = "Password must " + errorMessage
//		}
//		return WriteJSON(w, http.StatusBadRequest, Error{Message: "invalid request", Error: errorMessage})
//	}
//
//	hashedPassword, err := hashAndSaltPassword(changePasswordReq.NewPassword)
//
//	if err != nil {
//		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "server_error"})
//	}
//
//	user.HashedPassword = hashedPassword
//
//	if err := s.store.UpdateUser(user); err != nil {
//		fmt.Printf("error updating user with new password: %s\n", err)
//
//		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "server_error"})
//	}
//
//	// update security version
//	now := time.Now()
//
//	user.SecurityVersion = &now
//
//	if err := s.store.UpdateUser(user); err != nil {
//		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
//	}
//
//	return WriteJSON(w, http.StatusOK, Response{Message: "password changed successfully.", Code: "password_changed"})
//}
