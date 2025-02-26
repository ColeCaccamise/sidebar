package api

import (
	"github.com/colecaccamise/go-backend/util"
	"net/http"
)

func (s *Server) handleChat(w http.ResponseWriter, r *http.Request) error {
	chatReq := new(util.ChatRequest)

	if err := util.DecodeBody(r.Body, chatReq); err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: err.Error(), Code: "invalid_request"})
	}

	//aiClient, err := util.NewAIClient(&util.NewAIClientOpts{
	//	ModelType: util.DeepSeek,
	//	Model:     util.DeepseekChat,
	//	APIKey:    os.Getenv("DEEPSEEK_API_KEY"),
	//})
	//if err != nil {
	//	return WriteJSON(w, http.StatusInternalServerError, Error{Error: err.Error(), Code: "internal_server_error"})
	//}
	//
	//response, err := aiClient.GenerateText(&util.GenerateTextOpts{
	//	Prompt: chatReq.Prompt,
	//	Stream: true,
	//})
	//
	//if err != nil {
	//	return WriteJSON(w, http.StatusInternalServerError, Error{Error: err.Error(), Code: "internal_server_error"})
	//}

	return WriteJSON(w, http.StatusOK, nil)
}
