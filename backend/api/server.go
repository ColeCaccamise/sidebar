package api

import (
	"fmt"
	"gorm.io/gorm"
	"net/http"
	"os"

	"github.com/colecaccamise/go-backend/middleware"
	"github.com/colecaccamise/go-backend/storage"
	"github.com/rs/cors"
)

type Server struct {
	listenAddr string
	store      storage.Storage
	db         *gorm.DB
}

func NewServer(listenAddr string, store storage.Storage) *Server {
	return &Server{
		listenAddr: listenAddr,
		store:      store,
	}
}

func (s *Server) Start() error {
	r := s.SetupRoutes()

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

func handleNotFound(w http.ResponseWriter, req *http.Request) error {
	return WriteJSON(w, http.StatusNotFound, Error{Message: fmt.Sprintf("cannot %s %s", req.Method, req.URL.Path), Error: "route not found"})
}

func handleMethodNotAllowed(w http.ResponseWriter, req *http.Request) error {
	return WriteJSON(w, http.StatusMethodNotAllowed, Error{Message: fmt.Sprintf("cannot %s %s", req.Method, req.URL.Path), Error: "method not allowed"})
}
