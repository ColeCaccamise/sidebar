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
	r.Use(httprate.LimitByIP(100, 1*time.Minute))

	r.Route("/auth", func(r chi.Router) {
		r.Group(func(r chi.Router) {
			r.Use(s.VerifySecurityVersion)
			r.Get("/identity", makeHttpHandleFunc(s.handleIdentity))
			r.Get("/refresh", makeHttpHandleFunc(s.handleRefreshToken))
		})

		r.Route("/sessions", func(r chi.Router) {
			r.Use(s.VerifySecurityVersion)
			r.Use(middleware.VerifyAuth)
			r.Get("/", makeHttpHandleFunc(s.handleGetSessions))
			r.Delete("/{id}", makeHttpHandleFunc(s.handleRevokeSession))
			r.Delete("/", makeHttpHandleFunc(s.handleRevokeSessions))
		})

		r.Post("/signup", makeHttpHandleFunc(s.handleSignup))
		r.Post("/login", makeHttpHandleFunc(s.handleLogin))
		r.Post("/logout", makeHttpHandleFunc(s.handleLogout))
		r.Get("/confirm", makeHttpHandleFunc(s.handleConfirmMagicAuth))
		r.Post("/forgot-password", makeHttpHandleFunc(s.handleForgotPassword))

		// WorkOS
		r.Get("/callback", makeHttpHandleFunc(s.handleCallback))
		r.Get("/verify", makeHttpHandleFunc(s.handleVerify))
		r.Get("/verify-email", makeHttpHandleFunc(s.handleVerifyEmail))
		r.Get("/authorize/{provider}", makeHttpHandleFunc(s.handleGetAuthorizationUrl))
	})

	// AI routes
	r.Route("/ai", func(r chi.Router) {
		r.Post("/chat", makeHttpHandleFunc(s.handleChat))
	})

	// prompt routes
	r.Route("/prompts", func(r chi.Router) {
		r.Use(middleware.VerifyAuth)
		r.Use(s.VerifySecurityVersion)
		r.Get("/", makeHttpHandleFunc(s.handleGetPrompts))
		r.Patch("/{id}/dismiss", makeHttpHandleFunc(s.handleDismissPrompt))
	})

	r.Route("/teams", func(r chi.Router) {
		r.Group(func(r chi.Router) {
			r.Use(middleware.VerifyAuth)
			r.Use(s.VerifySecurityVersion)

			r.Get("/", makeHttpHandleFunc(s.handleListTeams))
			r.Post("/", makeHttpHandleFunc(s.handleCreateTeam))

			r.Route("/{slug}", func(r chi.Router) {
				r.Get("/", makeHttpHandleFunc(s.handleGetTeamBySlug))
				r.Get("/member", makeHttpHandleFunc(s.HandleGetTeamMember))
				r.Get("/upsells", makeHttpHandleFunc(s.handleGetUpsells))
				r.Get("/switch", makeHttpHandleFunc(s.handleSwitchTeam))
				r.Post("/leave", makeHttpHandleFunc(s.handleLeaveTeam))

				// member management
				r.Route("/members", func(r chi.Router) {
					r.Get("/", makeHttpHandleFunc(s.handleGetTeamMembers))
					r.Post("/{id}/remove", makeHttpHandleFunc(s.handleRemoveTeamMember))
					r.Patch("/{id}", makeHttpHandleFunc(s.handleUpdateTeamMember))
				})

				// invite links
				r.Post("/join/{token}/accept", makeHttpHandleFunc(s.handleAcceptTeamInvite))
				r.Route("/invite", func(r chi.Router) {
					r.Post("/", makeHttpHandleFunc(s.handleSendTeamInvites))              // send an invite to one or many
					r.Get("/link", makeHttpHandleFunc(s.handleGetTeamInviteLink))         // get the current invite link
					r.Post("/link", makeHttpHandleFunc(s.handleRegenerateTeamInviteLink)) // regenerate the current invite link

					r.Post("/{teamMemberId}/cancel", makeHttpHandleFunc(s.handleCancelTeamInvites))
					r.Post("/{teamMemberId}/resend", makeHttpHandleFunc(s.handleResendTeamInvite))

				})

				// complete onboarding
				r.Post("/onboarding", makeHttpHandleFunc(s.handleCompleteOnboarding))

				// billing routes
				r.Route("/billing", func(r chi.Router) {
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
						r.Post("/refresh", makeHttpHandleFunc(s.handleRefreshSubscription))
						r.Post("/update", makeHttpHandleFunc(s.handleUpdateSubscription))
						r.Patch("/interval", makeHttpHandleFunc(s.handleUpdateSubscriptionInterval))
					})
				})
			})
		})

		r.Post("/select", makeHttpHandleFunc(s.handleSelectTeam))
		r.Get("/{slug}/join/{token}", makeHttpHandleFunc(s.handleGetTeamInvite))  // after landing on invite link - get data for shared link and check validity
		r.Post("/{slug}/join/{token}", makeHttpHandleFunc(s.handleUseInviteLink)) // onboard a new team member from this link (checking its valid etc)
	})

	// user taking actions on their own account they're logged in to
	r.Group(func(r chi.Router) {
		r.Use(middleware.VerifyAuth)
		r.Use(s.VerifySecurityVersion)
		r.Route("/users", func(r chi.Router) {
			r.Patch("/", makeHttpHandleFunc(s.handleUpdateUser))
			r.Get("/me", makeHttpHandleFunc(s.handleGetCurrentUser))
			r.Post("/delete", makeHttpHandleFunc(s.handleDeleteAccount))
			r.Post("/restore", makeHttpHandleFunc(s.handleRestoreAccount))
			r.Post("/accept-terms", makeHttpHandleFunc(s.handleAcceptTerms))
			r.Get("/invites", makeHttpHandleFunc(s.handleListInvites))
			r.Get("/members", makeHttpHandleFunc(s.handleListTeamMembers))
			r.Route("/avatar", func(r chi.Router) {
				r.Patch("/", makeHttpHandleFunc(s.handleUploadAvatar))
				r.Delete("/", makeHttpHandleFunc(s.handleDeleteAvatar))
			})
		})
	})

	// webhooks
	r.Route("/webhooks", func(r chi.Router) {
		r.Post("/stripe", makeHttpHandleFunc(s.handleStripeWebhook))
		r.Post("/workos", makeHttpHandleFunc(s.handleWorkosWebhook))
	})

	return r
}
