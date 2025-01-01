package api

import (
	"encoding/json"
	"fmt"
	"github.com/mileusna/useragent"
	"github.com/workos/workos-go/v4/pkg/webhooks"
	"io"
	"net/http"
	"os"
	"time"
)

type WorkOsWebhookEvent struct {
	ID    string `json:"id"`
	Event string `json:"event"`
	Data  struct {
		Object            string      `json:"object"`
		ID                string      `json:"id"`
		Name              string      `json:"name"`
		FirstName         string      `json:"first_name"`
		LastName          string      `json:"last_name"`
		Email             string      `json:"email"`
		ProfilePictureUrl interface{} `json:"profile_picture_url"`
		EmailVerified     bool        `json:"email_verified"`
		Role              struct {
			Slug string `json:"slug"`
		} `json:"role"`
		Status         string `json:"status"`
		UserID         string `json:"user_id"`
		OrganizationID string `json:"organization_id"`
		Domains        []struct {
			ID             string `json:"id"`
			Domain         string `json:"domain"`
			Object         string `json:"object"`
			OrganizationID string `json:"organization_id"`
		} `json:"domains"`
		IpAddress    string `json:"ip_address"`
		UserAgent    string `json:"user_agent"`
		Impersonator struct {
			Email  string `json:"email"`
			Reason string `json:"reason"`
		} `json:"impersonator"`
		CreatedAt time.Time `json:"created_at"`
		UpdatedAt time.Time `json:"updated_at"`
	} `json:"data"`
	CreatedAt time.Time `json:"created_at"`
}

func (s *Server) handleWorkosWebhook(w http.ResponseWriter, r *http.Request) error {
	// read body once

	body, err := io.ReadAll(r.Body)
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: err.Error()})
	}

	// validate webhook signature
	webhook := webhooks.NewClient(os.Getenv("WORKOS_WEBHOOK_SECRET"))
	_, err = webhook.ValidatePayload(r.Header.Get("Workos-Signature"), string(body))
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: err.Error()})
	}

	// create new reader from body bytes for json decoding
	workOsWebhook := new(WorkOsWebhookEvent)
	if err := json.Unmarshal(body, workOsWebhook); err != nil {
		errorMsg := "invalid request"
		if err == io.EOF {
			errorMsg = "request body is empty"
		}
		return WriteJSON(w, http.StatusBadRequest, Error{Error: errorMsg, Code: "invalid_request"})
	}

	fmt.Printf("received WorkOS webhook event: %s\n", workOsWebhook.Event)

	object := workOsWebhook.Data.Object
	data := workOsWebhook.Data
	event := workOsWebhook.Event

	switch object {
	case "user":
		email := data.Email
		firstName := data.FirstName
		lastName := data.LastName

		if event == "user.created" {

		} else if event == "user.updated" {

		} else if event == "user.deleted" {

		} else {
			fmt.Printf("unknown user event: %s\n", event)
		}

		fmt.Printf("handling user %s %s (%s)\n", firstName, lastName, email)
	case "organization":
		name := data.Name

		fmt.Printf("handling webhook for organization: %s\n", name)

		if event == "organization.created" {

		} else if event == "organization.updated" {

		} else if event == "organization.deleted" {

		} else {
			fmt.Printf("unknown organization event: %s\n", event)
		}

	case "organization_membership":
		userID := data.UserID
		roleSlug := data.Role.Slug
		orgID := data.OrganizationID

		fmt.Printf("handling orgnization webhook for %s (%s) in %s\n", userID, roleSlug, orgID)

		if event == "organization_membership.created" {

		} else if event == "organization_membership.updated" {

		} else if event == "organization_membership.deleted" {

		} else {
			fmt.Printf("unknown organization membership event: %s\n", event)
		}

	case "session":
		userID := data.UserID
		orgID := data.OrganizationID
		ipAddress := data.IpAddress
		ua := data.UserAgent
		userAgent := useragent.Parse(ua)
		device := userAgent.Device
		if device == "" {
			device = "Unknown device"
		}

		sys := userAgent.OS
		if sys == "" {
			sys = "Unknown OS"
		}

		impersonatorEmail := data.Impersonator.Email
		impersonatorReason := data.Impersonator.Reason

		if impersonatorEmail == "" || impersonatorReason == "" {
			fmt.Printf("%s is impersonating user (%s) in organization (%s) for reason: %s\n", impersonatorEmail, userID, orgID, impersonatorReason)
		}

		if event == "session.created" {
			fmt.Printf("new session created for user (%s) with %s on %s (IP: %s)\n", userID, device, sys, ipAddress)
		} else {
			fmt.Printf("unknown session event: %s\n", event)
		}

	default:
		fmt.Printf("unhandled workos webhook event: %s\n", event)
	}

	return WriteJSON(w, http.StatusOK, Response{})
}
