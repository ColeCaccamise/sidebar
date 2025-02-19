package api

import (
	"github.com/colecaccamise/go-backend/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"net/http"
	"time"
)

func (s *Server) handleGetPrompts(w http.ResponseWriter, r *http.Request) error {
	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{
			Error: "unauthorized",
			Code:  "unauthorized",
		})
	}

	user := userSession.User
	prompts, err := s.store.GetPromptsForUser(user.ID)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error",
			Code:  "internal_server_error",
		})
	}

	return WriteJSON(w, http.StatusOK, map[string][]*models.Prompt{
		"prompts": prompts,
	})
}

func (s *Server) handleDismissPrompt(w http.ResponseWriter, r *http.Request) error {
	id := chi.URLParam(r, "id")

	prompt, err := s.store.GetPromptByID(uuid.MustParse(id))
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "prompt not found",
			Code:  "not_found",
		})
	}

	if !prompt.Dismissible {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Error: "cannot dismiss prompt",
			Code:  "prompt_not_dismissable",
		})
	}

	now := time.Now()
	prompt.DismissedAt = &now

	err = s.store.UpdatePrompt(prompt)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{
			Error: "internal server error",
			Code:  "internal_server_error",
		})
	}

	return WriteJSON(w, http.StatusNoContent, nil)
}
