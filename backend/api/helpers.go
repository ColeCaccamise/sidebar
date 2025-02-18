package api

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type Error struct {
	Message string      `json:"message,omitempty"`
	Error   string      `json:"error"`
	Data    interface{} `json:"data,omitempty"`
	Code    string      `json:"code,omitempty"`
}

type Response struct {
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Code    string      `json:"code,omitempty"`
}

type apiFunc func(http.ResponseWriter, *http.Request) error

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

func WriteJSON(w http.ResponseWriter, status int, v any) error {
	if status == http.StatusNoContent {
		w.WriteHeader(status)
		return nil
	}

	// Handle error case with null message
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
