package api

import (
	"time"

	"github.com/colecaccamise/go-backend/middleware"
	"github.com/go-chi/chi"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"
)

func (s *Server) SetupRoutes() *chi.Mux {
	r := chi.NewRouter()

	r.NotFound(makeHttpHandleFunc(handleNotFound))
	r.MethodNotAllowed(makeHttpHandleFunc(handleMethodNotAllowed))

	r.Use(chiMiddleware.Heartbeat("/ping"))
	r.Use(chiMiddleware.GetHead)

	// todo rate limit based on auth token, browser fingerprint, etc.
	r.Use(httprate.LimitByIP(100, 1*time.Minute))

	r.Route("/auth", func(r chi.Router) {
		r.Post("/signup", makeHttpHandleFunc(s.handleSignup))
		//r.Post("/resend-email", makeHttpHandleFunc(s.handleResendEmail))
		r.Post("/login", makeHttpHandleFunc(s.handleLogin))
		r.Post("/logout", makeHttpHandleFunc(s.handleLogout))
		//r.Post("/confirm", makeHttpHandleFunc(s.handleConfirmEmailToken))
		r.Get("/confirm", makeHttpHandleFunc(s.handleConfirmMagicAuth))
		r.Post("/forgot-password", makeHttpHandleFunc(s.handleForgotPassword))
		//r.Post("/change-password", makeHttpHandleFunc(s.handleChangePassword))

		// WorkOS
		r.Get("/callback", makeHttpHandleFunc(s.handleCallback))
		r.Get("/verify", makeHttpHandleFunc(s.handleVerify))
		r.Get("/verify-email", makeHttpHandleFunc(s.handleVerifyEmail))
		r.Get("/authorize/{provider}", makeHttpHandleFunc(s.handleGetAuthorizationUrl))
	})

	r.Group(func(r chi.Router) {
		r.Use(s.VerifySecurityVersion)
		r.Get("/auth/identity", makeHttpHandleFunc(s.handleIdentity))
		r.Get("/auth/refresh", makeHttpHandleFunc(s.handleRefreshToken))
	})

	r.Group(func(r chi.Router) {
		//r.Use(s.VerifyUserNotDeleted)
		r.Use(s.VerifySecurityVersion)
		r.Route("/tokens", func(r chi.Router) {
			r.Get("/", makeHttpHandleFunc(s.handleGetAllTokens))
			// r.Post("/", makeHttpHandleFunc(s.handleCreateToken))
			// r.Delete("/{id}", makeHttpHandleFunc(s.handleDeleteToken))
		})
	})

	r.Group(func(r chi.Router) {
		r.Use(s.VerifySecurityVersion)
		r.Use(middleware.VerifyAuth)
		r.Get("/auth/sessions", makeHttpHandleFunc(s.handleGetSessions))
		r.Delete("/auth/sessions/{id}", makeHttpHandleFunc(s.handleRevokeSession))
		r.Delete("/auth/sessions", makeHttpHandleFunc(s.handleRevokeSessions))
		//r.Use(s.VerifyUserNotDeleted)
		//r.Post("/auth/verify-password", makeHttpHandleFunc(s.handleVerifyPassword))
	})

	// prompt routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.VerifyAuth)
		//r.Use(s.VerifyUserNotDeleted)
		r.Use(s.VerifySecurityVersion)
		r.Route("/prompts", func(r chi.Router) {
			//r.Get("/", makeHttpHandleFunc(s.handleGetPrompts))
			r.Patch("/{id}/dismiss", makeHttpHandleFunc(s.handleDismissPrompt))
		})
	})

	// team routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.VerifyAuth)
		//r.Use(s.VerifyUserNotDeleted)
		r.Use(s.VerifySecurityVersion)
		r.Route("/teams", func(r chi.Router) {
			r.Post("/", makeHttpHandleFunc(s.handleCreateTeam))
			r.Get("/{slug}", makeHttpHandleFunc(s.handleGetTeamBySlug))
			r.Get("/{slug}/member", makeHttpHandleFunc(s.HandleGetTeamMember))
			r.Get("/{slug}/upsells", makeHttpHandleFunc(s.handleGetUpsells))

			// invite links
			r.Post("/{slug}/invite", makeHttpHandleFunc(s.handleSendTeamInvites))               // send an invite to one or many
			r.Get("/{slug}/invite-link", makeHttpHandleFunc(s.handleGetTeamInviteLink))         // get the current invite link
			r.Post("/{slug}/invite-link", makeHttpHandleFunc(s.handleRegenerateTeamInviteLink)) // regenerate the current invite link
			// complete onboarding
			r.Post("/{slug}/onboarding", makeHttpHandleFunc(s.handleCompleteOnboarding))

			// billing routes
			r.Route("/{slug}/billing", func(r chi.Router) {
				r.Get("/customer", makeHttpHandleFunc(s.handleGetStripeCustomer))
				r.Route("/payment-methods", func(r chi.Router) {
					r.Get("/", makeHttpHandleFunc(s.handleGetPaymentMethods))
					r.Post("/", makeHttpHandleFunc(s.handleUpdatePaymentMethod))
					r.Patch("/default/{id}", makeHttpHandleFunc(s.handleUpdateDefaultPaymentMethod))
					//r.Delete("/{id}", makeHttpHandleFunc(s.handleDeletePaymentMethod))
				})
				r.Get("/invoices", makeHttpHandleFunc(s.handleGetInvoices))
				r.Get("/plans", makeHttpHandleFunc(s.handleGetPlans))
				r.Post("/checkout", makeHttpHandleFunc(s.handleCreateCheckoutSession))
				r.Post("/portal", makeHttpHandleFunc(s.handleCreatePortalSession))
				r.Route("/subscription", func(r chi.Router) {
					r.Get("/", makeHttpHandleFunc(s.handleGetCurrentSubscription))
					r.Patch("/", makeHttpHandleFunc(s.handleUpdateSubscription))
					r.Post("/update", makeHttpHandleFunc(s.handleUpdateSubscription))
					r.Patch("/interval", makeHttpHandleFunc(s.handleUpdateSubscriptionInterval))
				})
			})
		})
	})

	// unprotected team routes
	// join links
	r.Get("/teams/{slug}/join/{token}", makeHttpHandleFunc(s.handleGetTeamInvite)) // after landing on invite link - get data for shared link and check validity
	r.Post("/team/{slug}/join/{token}", makeHttpHandleFunc(s.handleUseInviteLink)) // onboard a new team member from this link (checking its valid etc)

	// TODO: secure these routes to application admins only
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
		//r.Use(s.VerifyUserNotDeleted)
		//r.Use(s.VerifySecurityVersion)
		r.Route("/users", func(r chi.Router) {
			r.Patch("/", makeHttpHandleFunc(s.handleUpdateUser))
			//r.Delete("/", makeHttpHandleFunc(s.handleDeleteUser))
			r.Post("/accept-terms", makeHttpHandleFunc(s.handleAcceptTerms))
			//r.Patch("/email", makeHttpHandleFunc(s.handleUpdateUserEmail))
			//r.Post("/resend-email", makeHttpHandleFunc(s.handleResendUpdateEmail))
			//r.Patch("/avatar", makeHttpHandleFunc(s.handleUploadAvatar))
			//r.Delete("/avatar", makeHttpHandleFunc(s.handleDeleteAvatar))
			//r.Patch("/change-password", makeHttpHandleFunc(s.handleChangeUserPassword))
		})
	})

	// user actions that can be taken when deleted
	r.Group(func(r chi.Router) {
		r.Use(middleware.VerifyAuth)
		//r.Patch("/users/restore", makeHttpHandleFunc(s.handleRestoreUser))
	})

	// todo convert these to team version
	// subscription routes
	//r.Group(func(r chi.Router) {
	//	r.Use(middleware.VerifyAuth)
	//	//r.Use(s.VerifyUserNotDeleted)
	//	//r.Use(s.VerifySecurityVersion)
	//	r.Route("/billing", func(r chi.Router) {
	//		r.Get("/plans", makeHttpHandleFunc(s.handleGetPlans))
	//		//r.Post("/checkout", makeHttpHandleFunc(s.handleCreateCheckoutSession))
	//		//r.Post("/portal", makeHttpHandleFunc(s.handleCreatePortalSession))
	//		r.Route("/subscriptions", func(r chi.Router) {
	//			//r.Get("/", makeHttpHandleFunc(s.handleGetCurrentSubscription))
	//			//r.Post("/cancel", makeHttpHandleFunc(s.handleCancelSubscription))
	//			//r.Post("/renew", makeHttpHandleFunc(s.handleRenewSubscription))
	//		})
	//	})
	//})

	// webhooks
	r.Route("/webhooks", func(r chi.Router) {
		r.Post("/stripe", makeHttpHandleFunc(s.handleStripeWebhook))
		r.Post("/workos", makeHttpHandleFunc(s.handleWorkosWebhook))
	})

	return r
}
