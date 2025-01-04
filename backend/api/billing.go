package api

import (
	"encoding/json"
	"fmt"
	"github.com/colecaccamise/go-backend/util"
	"io/ioutil"
	"log"
	"math"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/colecaccamise/go-backend/models"
	"github.com/go-chi/chi"
	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v80"
	portalSession "github.com/stripe/stripe-go/v80/billingportal/session"
	checkoutSession "github.com/stripe/stripe-go/v80/checkout/session"
	"github.com/stripe/stripe-go/v80/customer"
	"github.com/stripe/stripe-go/v80/invoice"
	"github.com/stripe/stripe-go/v80/paymentmethod"
	"github.com/stripe/stripe-go/v80/price"
	"github.com/stripe/stripe-go/v80/product"
	"github.com/stripe/stripe-go/v80/subscription"

	"github.com/stripe/stripe-go/v80/subscriptionschedule"
	"github.com/stripe/stripe-go/webhook"
)

// billing
func (s *Server) handleGetPlans(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	slug := chi.URLParam(r, "slug")
	if !util.IsValidSlug(slug) {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Error: "invalid slug,",
			Code:  "invalid_slug",
		})
	}

	// get prices from stripe
	priceParams := &stripe.PriceListParams{
		Active: stripe.Bool(true),
	}
	prices := price.List(priceParams)

	var plans []models.SubscriptionPlan

	for prices.Next() {
		p := prices.Price()

		// get the product details
		prod, err := product.Get(p.Product.ID, &stripe.ProductParams{})
		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		plan := models.SubscriptionPlan{
			Name:           prod.Name,
			ProductID:      p.Product.ID,
			PriceID:        p.ID,
			PriceLookupKey: p.LookupKey,
			ProductActive:  prod.Active,
			PriceActive:    p.Active,
			Interval:       string(p.Recurring.Interval),
			Price:          int(p.UnitAmount),
			PlanType:       strings.Split(p.LookupKey, "_")[0],
		}

		plans = append(plans, plan)
	}

	if prices.Err() != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, Response{
		Message: "Successfully retrieved plans",
		Data:    plans,
	})
}

func (s *Server) handleCreateCheckoutSession(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	userSession, err := getUserSession(s, r)

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized.", Code: "invaild_token"})
	}

	user := userSession.User

	// get team
	teamSlug := chi.URLParam(r, "slug")

	team, err := s.store.GetTeamBySlug(teamSlug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "team not found.", Code: "team_not_found"})
	}

	teamMember, err := userIsTeamMember(s, user.ID, team.ID)
	if !teamMember {
		return WriteJSON(w, http.StatusForbidden, Error{Error: "forbidden", Code: "forbidden"})
	}

	// read in price_lookup_key
	checkoutReq := new(models.CreateCheckoutSessionRequest)
	if err := json.NewDecoder(r.Body).Decode(checkoutReq); err != nil {
		if err.Error() == "EOF" {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "empty body.", Code: "empty_body"})
		} else {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid request", Code: "invalid_request"})
		}
	}

	params := &stripe.PriceListParams{
		LookupKeys: stripe.StringSlice([]string{
			checkoutReq.PriceLookupKey,
		}),
	}
	i := price.List(params)
	var stripePrice *stripe.Price
	for i.Next() {
		p := i.Price()
		stripePrice = p
	}

	if stripePrice == nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid request", Code: "invalid_request"})
	}
	successUrl := fmt.Sprintf("%s/%s/onboarding/welcome", os.Getenv("APP_URL"), teamSlug)
	cancelUrl := fmt.Sprintf("%s/%s/onboarding/plans", os.Getenv("APP_URL"), teamSlug)

	// check if stripe customer exists before creating session
	if team.StripeCustomerID == "" {
		customerParams := &stripe.CustomerParams{
			Email: stripe.String(user.Email),
			Metadata: map[string]string{
				"team_id": team.ID.String(),
			},
		}
		stripeCustomer, err := customer.New(customerParams)
		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}
		team.StripeCustomerID = stripeCustomer.ID
		err = s.store.UpdateTeam(team)
		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}
	}

	subscriptionData := &stripe.CheckoutSessionSubscriptionDataParams{
		Metadata: map[string]string{
			"team_id": team.ID.String(),
		},
		BillingCycleAnchor: stripe.Int64(time.Now().AddDate(0, 0, 31).Unix()),
	}
	if team.FreeTrialAt == nil {
		trialDays := 14
		//trialEndTimestamp := time.Now().AddDate(0, 0, trialDays).Unix()

		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		subscriptionData = &stripe.CheckoutSessionSubscriptionDataParams{
			//TrialEnd: stripe.Int64(trialEndTimestamp),
			TrialSettings: &stripe.CheckoutSessionSubscriptionDataTrialSettingsParams{
				EndBehavior: &stripe.CheckoutSessionSubscriptionDataTrialSettingsEndBehaviorParams{
					MissingPaymentMethod: stripe.String("pause"),
				},
			},
			TrialPeriodDays: stripe.Int64(int64(trialDays)),
			Metadata: map[string]string{
				"team_id": team.ID.String(),
			},
		}
	}

	checkoutParams := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(stripePrice.ID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(successUrl),
		CancelURL:  stripe.String(cancelUrl),
		Customer:   stripe.String(team.StripeCustomerID),
		Metadata: map[string]string{
			"team_id": team.ID.String(),
		},
		SubscriptionData:        subscriptionData,
		PaymentMethodCollection: stripe.String("if_required"),
	}

	stripeCheckoutSession, err := checkoutSession.New(checkoutParams)

	if stripeCheckoutSession == nil || err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	redirectUrl := stripeCheckoutSession.URL

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]string{
		"redirect_url": redirectUrl,
	}})
}

func (s *Server) handleCreatePortalSession(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized.", Code: "unauthorized"})
	}

	user := userSession.User

	teamSlug := chi.URLParam(r, "slug")

	team, err := s.store.GetTeamBySlug(teamSlug)
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "team not found.", Code: "team_not_found"})
	}

	teamMember, _ := userIsTeamMember(s, user.ID, team.ID)
	if !teamMember {
		return WriteJSON(w, http.StatusForbidden, Error{Error: "forbidden", Code: "forbidden"})
	}

	customerID := team.StripeCustomerID

	returnUrl := fmt.Sprintf("%s/%s/settings/team/plans", os.Getenv("APP_URL"), teamSlug)

	portalParams := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(returnUrl),
	}
	ps, err := portalSession.New(portalParams)

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	portalUrl := ps.URL

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]string{
		"redirect_url": portalUrl,
	}})
}

func (s *Server) handleGetCurrentSubscription(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	userSession, err := getUserSession(s, r)

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized.", Code: "unauthorized"})
	}

	user := userSession.User

	teamSlug := chi.URLParam(r, "slug")

	team, err := s.store.GetTeamBySlug(teamSlug)

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "team not found.", Code: "team_not_found"})
	}

	_, err = s.store.GetTeamMemberByTeamIDAndUserID(team.ID, user.ID)
	if err != nil {
		return WriteJSON(w, http.StatusForbidden, Error{
			Error: "you don't have permission to view this team.",
			Code:  "forbidden",
		})
	}

	subscriptionID := team.SubscriptionID
	teamSubscription, err := s.store.GetTeamSubscriptionByID(subscriptionID)

	if teamSubscription == nil || err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "no active subscription found.", Code: "subscription_not_found"})
	}

	subscriptionResponse := models.NewTeamSubscriptionResponse(teamSubscription)

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]any{
		"subscription": subscriptionResponse,
	}})
}

//func (s *Server) handleCancelSubscription(w http.ResponseWriter, r *http.Request) error {
//	stripe.Key = os.Getenv("STRIPE_API_KEY")
//
//	userSession, err := getUserSession(s, r)
//
//	if err != nil {
//		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized.", Code: "unauthorized"})
//	}
//
//	user := userSession.User
//
//	// get the current subscription
//	subscriptionParams := &stripe.SubscriptionListParams{
//		Customer: stripe.String(customerID),
//	}
//	subscriptionParams.Limit = stripe.Int64(1)
//	currentSubscriptions := subscription.List(subscriptionParams)
//
//	if currentSubscriptions == nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "no active subscription found.", Code: "subscription_not_found"})
//	}
//
//	hasSubscription := false
//	var currentSubscription *stripe.Subscription
//	for currentSubscriptions.Next() {
//		currentSubscription = currentSubscriptions.Subscription()
//		hasSubscription = true
//		break
//	}
//
//	if !hasSubscription {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "no active subscription found.", Code: "subscription_not_found"})
//	}
//
//	if currentSubscription.CancelAtPeriodEnd {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "your subscription is already canceled.", Code: "subscription_already_canceled"})
//	}
//
//	returnUrl := fmt.Sprintf("%s/settings/billing", os.Getenv("APP_URL"))
//
//	// create a coupon
//	retentionParams := &stripe.BillingPortalSessionFlowDataSubscriptionCancelRetentionParams{}
//
//	// offer coupon when one has not been used before
//	if user.RedeemedCouponAt == nil {
//		now := time.Now()
//		user.RedeemedCouponAt = &now // todo change this to only when receiving webhook to confirm user took the discount
//
//		err := s.store.UpdateUser(user)
//
//		if err != nil {
//			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
//		}
//
//		couponParams := &stripe.CouponParams{
//			Duration:         stripe.String(string(stripe.CouponDurationRepeating)),
//			DurationInMonths: stripe.Int64(3),
//			PercentOff:       stripe.Float64(25),
//		}
//		stripeCoupon, err := coupon.New(couponParams)
//
//		if err != nil {
//			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
//		}
//
//		retentionParams = &stripe.BillingPortalSessionFlowDataSubscriptionCancelRetentionParams{
//			CouponOffer: &stripe.BillingPortalSessionFlowDataSubscriptionCancelRetentionCouponOfferParams{
//				Coupon: stripe.String(stripeCoupon.ID),
//			},
//			Type: stripe.String("coupon_offer"),
//		}
//	}
//
//	portalParams := &stripe.BillingPortalSessionParams{
//		Customer:  stripe.String(customerID),
//		ReturnURL: stripe.String(returnUrl),
//		FlowData: &stripe.BillingPortalSessionFlowDataParams{
//			Type: stripe.String("subscription_cancel"),
//			AfterCompletion: &stripe.BillingPortalSessionFlowDataAfterCompletionParams{
//				Type: stripe.String("redirect"),
//				Redirect: &stripe.BillingPortalSessionFlowDataAfterCompletionRedirectParams{
//					ReturnURL: stripe.String(returnUrl),
//				},
//			},
//			SubscriptionCancel: &stripe.BillingPortalSessionFlowDataSubscriptionCancelParams{
//				Subscription: stripe.String(currentSubscription.ID),
//				Retention:    retentionParams,
//			},
//		},
//	}
//	ps, err := portalSession.New(portalParams)
//
//	if err != nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
//	}
//
//	portalUrl := ps.URL
//
//	return WriteJSON(w, http.StatusOK, Response{Data: map[string]string{
//		"redirect_url": portalUrl,
//	}})
//}

func (s *Server) handleUpdateSubscription(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	_, err := getUserSession(s, r)

	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized.", Code: "unauthorized"})
	}

	teamSlug := chi.URLParam(r, "slug")

	team, err := s.store.GetTeamBySlug(teamSlug)

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "team not found.", Code: "team_not_found"})
	}

	customerID := team.StripeCustomerID

	// get the current subscription
	subscriptionParams := &stripe.SubscriptionListParams{
		Customer: stripe.String(customerID),
	}
	subscriptionParams.Limit = stripe.Int64(1)
	currentSubscriptions := subscription.List(subscriptionParams)

	if currentSubscriptions == nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "no active subscription found.", Code: "subscription_not_found"})
	}

	hasSubscription := false
	var currentSubscription *stripe.Subscription
	for currentSubscriptions.Next() {
		currentSubscription = currentSubscriptions.Subscription()
		hasSubscription = true
		break
	}

	if !hasSubscription {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "no active subscription found.", Code: "subscription_not_found"})
	}

	returnUrl := fmt.Sprintf("%s/%s/settings/team/plans", os.Getenv("APP_URL"), teamSlug)

	// get updated price
	// read in price_lookup_key
	updateSubscriptionReq := new(models.UpdateSubscriptionRequest)
	if err := json.NewDecoder(r.Body).Decode(updateSubscriptionReq); err != nil {
		if err.Error() == "EOF" {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "empty body.", Code: "empty_body"})
		} else {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid request", Code: "invalid_request"})
		}
	}

	params := &stripe.PriceListParams{
		LookupKeys: stripe.StringSlice([]string{
			updateSubscriptionReq.PriceLookupKey,
		}),
	}
	i := price.List(params)
	var stripePrice *stripe.Price
	for i.Next() {
		p := i.Price()
		stripePrice = p
	}

	if stripePrice == nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid request", Code: "invalid_request"})
	}

	// todo check that user is not trying to change to their current subscription tier

	portalParams := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(returnUrl),
		FlowData: &stripe.BillingPortalSessionFlowDataParams{
			Type: stripe.String("subscription_update_confirm"),
			AfterCompletion: &stripe.BillingPortalSessionFlowDataAfterCompletionParams{
				Type: stripe.String("redirect"),
				Redirect: &stripe.BillingPortalSessionFlowDataAfterCompletionRedirectParams{
					ReturnURL: stripe.String(returnUrl),
				},
			},
			SubscriptionUpdateConfirm: &stripe.BillingPortalSessionFlowDataSubscriptionUpdateConfirmParams{
				Subscription: stripe.String(currentSubscription.ID),
				Items: []*stripe.BillingPortalSessionFlowDataSubscriptionUpdateConfirmItemParams{
					{
						ID:       stripe.String(currentSubscription.Items.Data[0].ID),
						Price:    stripe.String(stripePrice.ID),
						Quantity: stripe.Int64(1),
					},
				},
			},
		},
	}
	ps, err := portalSession.New(portalParams)

	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	portalUrl := ps.URL

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]string{
		"redirect_url": portalUrl,
	}})
}

func getAlternateBillingCycle(priceLookupKey string) string {
	if priceLookupKey == "basic_annually" {
		return "basic_monthly"
	} else if priceLookupKey == "basic_monthly" {
		return "basic_annually"
	} else if priceLookupKey == "pro_annually" {
		return "pro_monthly"
	} else if priceLookupKey == "pro_monthly" {
		return "pro_annually"
	} else if priceLookupKey == "premium_annually" {
		return "premium_monthly"
	} else if priceLookupKey == "premium_monthly" {
		return "premium_annually"
	}

	return ""
}

func (s *Server) handleUpdateSubscriptionInterval(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	slug := chi.URLParam(r, "slug")
	team, err := s.store.GetTeamBySlug(slug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "team not found.", Code: "team_not_found"})
	}

	customerID := team.StripeCustomerID

	intervalReq := new(models.UpdateSubscriptionIntervalRequest)
	if err := json.NewDecoder(r.Body).Decode(intervalReq); err != nil {
		if err.Error() == "EOF" {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "empty body.", Code: "empty_body"})
		} else {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid request", Code: "invalid_request"})
		}
	}

	teamSubscription, err := s.store.GetTeamSubscriptionByID(team.SubscriptionID)
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	if teamSubscription.Interval == intervalReq.Interval {
		return WriteJSON(w, http.StatusBadRequest, Error{
			Error: "interval must be different.",
			Code:  "interval_unchanged",
		})
	}

	updatedPrice := getAlternateBillingCycle(teamSubscription.StripePriceLookupKey)

	priceParams := &stripe.PriceListParams{
		LookupKeys: stripe.StringSlice([]string{updatedPrice}),
	}
	priceParams.Limit = stripe.Int64(1)
	existingPrice := price.List(priceParams).PriceList().Data[0]

	stripeSubscription, err := subscription.Get(teamSubscription.StripeSubscriptionID, &stripe.SubscriptionParams{})
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	subscriptionItem := stripeSubscription.Items.Data[0]

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(fmt.Sprintf("%s/%s/settings/team/plans", os.Getenv("APP_URL"), slug)),
		FlowData: &stripe.BillingPortalSessionFlowDataParams{
			Type: stripe.String("subscription_update_confirm"),
			SubscriptionUpdateConfirm: &stripe.BillingPortalSessionFlowDataSubscriptionUpdateConfirmParams{
				Subscription: stripe.String(teamSubscription.StripeSubscriptionID),
				Items: []*stripe.BillingPortalSessionFlowDataSubscriptionUpdateConfirmItemParams{
					{
						ID:    stripe.String(subscriptionItem.ID),
						Price: stripe.String(existingPrice.ID),
					},
				},
			},
			AfterCompletion: &stripe.BillingPortalSessionFlowDataAfterCompletionParams{
				Type: stripe.String("redirect"),
				Redirect: &stripe.BillingPortalSessionFlowDataAfterCompletionRedirectParams{
					ReturnURL: stripe.String(fmt.Sprintf("%s/%s/settings/team/billing", os.Getenv("APP_URL"), slug)),
				},
			},
		},
	}
	result, err := portalSession.New(params)
	if err != nil {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]string{
		"redirect_url": result.URL,
	}})
}

//func (s *Server) handleRenewSubscription(w http.ResponseWriter, r *http.Request) error {
//	stripe.Key = os.Getenv("STRIPE_API_KEY")
//
//	user, _, _, err := getUserIdentity(s, r)
//
//	if err != nil {
//		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized.", Code: "unauthorized"})
//	}
//
//	customerID := user.CustomerID
//
//	// get the current subscription
//	subscriptionParams := &stripe.SubscriptionListParams{
//		Customer: stripe.String(customerID),
//	}
//	subscriptionParams.Limit = stripe.Int64(1)
//	currentSubscriptions := subscription.List(subscriptionParams)
//
//	if currentSubscriptions == nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "no active subscription found.", Code: "subscription_not_found"})
//	}
//
//	hasSubscription := false
//	var currentSubscription *stripe.Subscription
//	for currentSubscriptions.Next() {
//		currentSubscription = currentSubscriptions.Subscription()
//		hasSubscription = true
//		break
//	}
//
//	if !hasSubscription {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "no active subscription found.", Code: "subscription_not_found"})
//	}
//
//	if currentSubscription.CancelAtPeriodEnd {
//		renewParams := &stripe.SubscriptionParams{
//			CancelAtPeriodEnd: stripe.Bool(false),
//		}
//		renewedSubscription, err := subscription.Update(currentSubscription.ID, renewParams)
//
//		if err != nil {
//			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
//		}
//
//		return WriteJSON(w, http.StatusOK, Response{Data: map[string]any{
//			"subscription": renewedSubscription,
//		}})
//	} else {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "subscription is currently active.", Code: "subscription_active"})
//	}
//}

func (s *Server) handleStripeWebhook(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	const MaxBodyBytes = int64(65536)
	bodyReader := http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	payload, err := ioutil.ReadAll(bodyReader)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading stripe webhook body: %v\n", err)
		return WriteJSON(w, http.StatusServiceUnavailable, Error{Error: "service unavailable.", Code: "service_unavailable"})
	}

	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	signatureHeader := r.Header.Get("Stripe-Signature")
	fmt.Println("Stripe webhook endpoint secret:", signatureHeader)
	event, err := webhook.ConstructEvent(payload, signatureHeader, endpointSecret)
	if err != nil {
		fmt.Fprintf(os.Stderr, "⚠️  Webhook signature verification failed. %v\n", err)
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid webhook signature.", Code: "invalid_signature"})
	}

	log.Printf("received stripe webhook event: %s\n", event.Type)

	// Unmarshal the event data into an appropriate struct depending on its Type
	switch event.Type {
	case "invoice.paid":
		// if subscription status is `active` - this will provide full access to the plan
		var stripeInvoice stripe.Invoice
		if stripeInvoice.ID != "" {
			fmt.Printf("invoice is paid: %s\n", stripeInvoice.ID)
		} else {
			fmt.Printf("received invoice.paid without invoice")
		}

		invoiceStatus := stripeInvoice.Status // paid when succeeded
		if stripeInvoice.Subscription != nil {
			subscriptionStatus := stripeInvoice.Subscription.Status

			if invoiceStatus == "paid" && (subscriptionStatus == "active" || subscriptionStatus == "trialing") {
				// subscription all good - customer has access
				fmt.Printf("invoice is paid: %s\n", stripeInvoice.ID)
			} else {
				fmt.Printf("invalid invoice (%s) and subscription (%s) state\n", invoiceStatus, subscriptionStatus)
			}
		}

	case "customer.subscription.deleted":
		// todo this means the subscription has ended and benefits should be revoked
		var subscription stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &subscription)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid webhook payload.", Code: "invalid_payload"})
		}
		log.Printf("Subscription deleted for %s.", subscription.ID)

		priceLookupKey := subscription.Items.Data[0].Price.LookupKey

		metaTeamID := subscription.Metadata["team_id"]
		if metaTeamID == "" {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "team_id is empty.", Code: "team_id_empty"})
		}

		teamID := uuid.MustParse(metaTeamID)
		team, err := s.store.GetTeamByID(teamID)
		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		teamSubscription, err := s.store.GetTeamSubscriptionByID(team.SubscriptionID)
		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		if subscription.CancelAtPeriodEnd && teamSubscription.CanceledAt == nil {
			fmt.Printf("Canceling subscription for %s.\n", subscription.ID)
			// todo notify myself of cancellation
		}

		// convert canceled at timestamp
		if subscription.CanceledAt > 0 {
			canceledAt := time.Unix(subscription.CanceledAt, 0)
			teamSubscription.CanceledAt = &canceledAt
		} else {
			teamSubscription.CanceledAt = nil
		}

		// convert cancel at timestamp
		if subscription.CancelAt > 0 {
			cancelAt := time.Unix(subscription.CancelAt, 0)
			teamSubscription.CancelAt = &cancelAt
		} else {
			teamSubscription.CancelAt = nil
		}

		teamSubscription.Status = models.TeamSubscriptionStatus(subscription.Status)
		teamSubscription.StripePriceLookupKey = priceLookupKey
		planType := "basic" // default value
		if priceLookupKey != "" {
			// split lookup key by underscore and get first part
			parts := strings.Split(priceLookupKey, "_")
			if len(parts) > 0 {
				// validate plan type
				switch parts[0] {
				case "basic", "pro", "premium":
					planType = parts[0]
				}
			}
		}
		teamSubscription.PlanType = models.TeamSubscriptionPlan(planType)

		err = s.store.UpdateTeamSubscription(teamSubscription)
		if err != nil {
			fmt.Printf("Error updating team subscription: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

	case "customer.subscription.paused":
		// todo set subscription to a paused state and disable features
		log.Printf("subscription has been paused")

	case "customer.subscription.updated":
		fmt.Printf("subscription updated\n")
		var subscription stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &subscription)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid webhook payload.", Code: "invalid_payload"})
		}
		log.Printf("Subscription updated for %s.", subscription.ID)

		priceLookupKey := subscription.Items.Data[0].Price.LookupKey
		fmt.Println("price lookup after update: ", priceLookupKey)

		metaTeamID := subscription.Metadata["team_id"]
		if metaTeamID == "" {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid team_id.", Code: "internal_server_error"})
		}
		teamID := uuid.MustParse(metaTeamID)
		team, err := s.store.GetTeamByID(teamID)
		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		teamSubscription, err := s.store.GetTeamSubscriptionByID(team.SubscriptionID)
		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		if !subscription.CancelAtPeriodEnd {
			// check price to see if its a downgrade
			stripe.Key = os.Getenv("STRIPE_API_KEY")

			upcomingInvoiceParams := &stripe.InvoiceUpcomingParams{
				Customer: stripe.String(subscription.Customer.ID),
			}
			upcomingInvoice, err := invoice.Upcoming(upcomingInvoiceParams)

			if err != nil {
				return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
			}

			lookupKey := upcomingInvoice.Lines.Data[0].Price.LookupKey
			newPlan := PlanHierarchy[lookupKey]
			currentPlan := PlanHierarchy[priceLookupKey]

			if newPlan < currentPlan {
				fmt.Println("this is a downgrade")
			}
		}

		if subscription.CancelAtPeriodEnd && teamSubscription.CanceledAt == nil {
			fmt.Printf("Canceling subscription for %s.\n", subscription.ID)
			// todo notify myself of cancellation
		}

		// convert canceled at timestamp
		if subscription.CanceledAt > 0 {
			canceledAt := time.Unix(subscription.CanceledAt, 0)
			teamSubscription.CanceledAt = &canceledAt
		} else {
			teamSubscription.CanceledAt = nil
		}

		// convert cancel at timestamp
		if subscription.CancelAt > 0 {
			cancelAt := time.Unix(subscription.CancelAt, 0)
			teamSubscription.CancelAt = &cancelAt
		} else {
			teamSubscription.CancelAt = nil
		}

		teamSubscription.Status = models.TeamSubscriptionStatus(subscription.Status)
		teamSubscription.StripePriceLookupKey = priceLookupKey
		planType := "basic" // default value
		if priceLookupKey != "" {
			// split lookup key by underscore and get first part
			parts := strings.Split(priceLookupKey, "_")
			if len(parts) > 0 {
				// validate plan type
				switch parts[0] {
				case "basic", "pro", "premium":
					planType = parts[0]
				}
			}
		}
		teamSubscription.PlanType = models.TeamSubscriptionPlan(planType)

		subscriptionData := subscription.Items.Data[0]
		plan := subscriptionData.Plan
		planInterval := plan.Interval
		if planInterval == "month" {
			teamSubscription.Interval = models.TeamSubscriptionIntervalMonth
		} else if planInterval == "year" {
			teamSubscription.Interval = models.TeamSubscriptionIntervalYear
		}

		err = s.store.UpdateTeamSubscription(teamSubscription)
		if err != nil {
			fmt.Printf("Error updating team subscription: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

	case "customer.subscription.created":
		fmt.Printf("Subscription created.\n")
		var subscription stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &subscription)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid webhook payload.", Code: "invalid_payload"})
		}

		teamID := uuid.MustParse(subscription.Metadata["team_id"])
		team, err := s.store.GetTeamByID(teamID)
		if err != nil {
			return WriteJSON(w, http.StatusNotFound, Error{Error: "team not found.", Code: "team_not_found"})
		}

		// todo check if setup errors are gone
		now := time.Now()
		team.SubscriptionTierChosenAt = &now
		fmt.Printf("team subscription timestamp: %s", team.SubscriptionTierChosenAt)

		subscriptionData := subscription.Items.Data[0]
		plan := subscriptionData.Plan
		planInterval := plan.Interval
		stripePrice := subscriptionData.Price
		product := plan.Product
		lookupKey := stripePrice.LookupKey
		planType := "basic" // default value
		if lookupKey != "" {
			// split lookup key by underscore and get first part
			parts := strings.Split(lookupKey, "_")
			if len(parts) > 0 {
				// validate plan type
				switch parts[0] {
				case "basic", "pro", "premium":
					planType = parts[0]
				}
			}
		}

		teamSubscription := models.NewTeamSubscription(&models.CreateTeamSubscriptionRequest{
			TeamID:   teamID,
			PlanType: models.TeamSubscriptionPlan(planType),
			Interval: models.TeamSubscriptionInterval(planInterval),
		})

		teamSubscription.StripePriceID = stripePrice.ID
		teamSubscription.StripePriceLookupKey = lookupKey
		teamSubscription.StripeProductID = product.ID
		teamSubscription.StripeSubscriptionID = subscription.ID
		log.Printf("newly created subscription status: %s\n", subscription.Status)
		if subscription.Status == "trialing" {
			teamSubscription.Status = models.TeamSubscriptionStatusTrialing
		} else {
			fmt.Printf("unknown initial subscription status: %s\n", subscription.Status)
		}

		if subscription.Status == "trialing" {
			team.FreeTrialAt = &now
			trialDuration := (subscription.TrialEnd - subscription.TrialStart) / 86400
			teamSubscription.FreeTrialDuration = int(trialDuration)
			if subscription.TrialEnd > 0 {
				trialEnd := time.Unix(subscription.TrialEnd, 0)
				teamSubscription.FreeTrialEndsAt = &trialEnd
			} else {
				teamSubscription.FreeTrialEndsAt = nil
			}
		}

		err = s.store.CreateTeamSubscription(teamSubscription)
		if err != nil {
			fmt.Printf("Error creating team subscription: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		team.SubscriptionID = teamSubscription.ID

		err = s.store.UpdateTeam(team)
		if err != nil {
			fmt.Printf("Error updating team subscription: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}
		log.Printf("Subscription created for %s.", subscription.ID)
		// Then define and call a func to handle the successful attachment of a PaymentMethod.
		// handleSubscriptionCreated(subscription)

		// get plan version and update DB

	//case "subscription_schedule.created":
	//	fmt.Printf("received stripe schedule creation \n")

	case "customer.subscription.trial_will_end":
		var stripeSubscription stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &stripeSubscription)
		if err != nil {
			log.Printf("Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid webhook payload.", Code: "invalid_payload"})
		}
		log.Printf("Subscription trial will end for %s.", stripeSubscription.ID)

		teamID := uuid.MustParse(stripeSubscription.Metadata["team_id"])
		team, err := s.store.GetTeamByID(teamID)
		if err != nil {
			log.Printf("Error fetching team: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		teamSubscription, err := s.store.GetTeamSubscriptionByStripeID(stripeSubscription.ID)
		if err != nil {
			log.Printf("Error fetching team subscription: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		if stripeSubscription.Status == "trialing" {
			teamSubscription.Status = models.TeamSubscriptionStatusTrialing
			err = s.store.UpdateTeamSubscription(teamSubscription)
		} else {
			teamSubscription.Status = models.TeamSubscriptionStatus(stripeSubscription.Status) // todo fix
			err = s.store.UpdateTeamSubscription(teamSubscription)
		}

		trialEnd := stripeSubscription.TrialEnd
		if math.Abs(float64(trialEnd)-float64(time.Now().Unix())) <= 3600 {
			now := time.Now()
			// end subscription with current timestamp
			teamSubscription.CanceledAt = &now
			teamSubscription.CancelAt = &now
		}

		// enable cta notifications in dashboard
		// check if payment details have been added
		paymentMethodParams := &stripe.PaymentMethodListParams{
			Type:     stripe.String(string(stripe.PaymentMethodTypeCard)),
			Customer: stripe.String(team.StripeCustomerID),
		}
		paymentMethodParams.Limit = stripe.Int64(3)
		result := paymentmethod.List(paymentMethodParams)
		paymentMethods := result.PaymentMethodList()
		if len(paymentMethods.Data) == 0 {
			fmt.Printf("No payment methods found for %s.", stripeSubscription.ID)

			// send email notifying user to add a payment method
			// show banner in settings of app (closebale in main UI)
			teamOwners, err := s.store.GetTeamMembersByTeamIDAndRole(teamID, models.TeamRoleOwner)

			if len(teamOwners) == 0 || err != nil {
				log.Printf("Error fetching team owners: %v\n", err)
				return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
			}

			now := time.Now()

			for _, member := range teamOwners {
				err = s.store.CreatePrompt(&models.Prompt{
					UserID:      member.UserID,
					TeamID:      team.ID,
					Type:        models.PromptTypeUpsell,
					Title:       "Add Payment Method",
					Content:     "Your trial ends in 3 days. Add a payment method to continue your service.",
					StartDate:   now,
					Dismissible: false,
					ActionLabel: "Add Payment Method",
					ActionURL:   fmt.Sprintf("/%s/settings/team/plans", team.Slug),
				})

				if err != nil {
					log.Printf("Error creating prompt: %v\n", err)
					return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
				}
			}

			teamSubscription.HasValidPaymentMethod = false
		}

	//case "entitlements.active_entitlement_summary.updated":
	//	var subscription stripe.Subscription
	//	err := json.Unmarshal(event.Data.Raw, &subscription)
	//	if err != nil {
	//		fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
	//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid webhook payload.", Code: "invalid_payload"})
	//	}
	//	log.Printf("Active entitlement summary updated for %s.", subscription.ID)
	//	// Then define and call a func to handle active entitlement summary updated.
	//	// handleEntitlementUpdated(subscription)

	case "charge.failed":
		var charge stripe.Charge
		err := json.Unmarshal(event.Data.Raw, &charge)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid webhook payload.", Code: "invalid_payload"})
		}
		log.Printf("Charge failed for invoice %s: %s", charge.Invoice, charge.FailureMessage)

		// get subscription id from the invoice
		stripeInvoice, err := invoice.Get(charge.Invoice.ID, nil)
		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		if stripeInvoice.Subscription == nil {
			return nil // not a subscription invoice
		}

		teamSubscription, err := s.store.GetTeamSubscriptionByStripeID(stripeInvoice.Subscription.ID)
		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		// mark subscription as failed and store relevant metadata
		teamSubscription.Status = models.TeamSubscriptionStatusIncomplete
		teamSubscription.FailureMessage = charge.FailureMessage
		teamSubscription.FailureCode = charge.FailureCode

		err = s.store.UpdateTeamSubscription(teamSubscription)
		if err != nil {
			fmt.Printf("Error updating team subscription: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

	case "payment_intent.payment_failed":
		log.Printf("received payment intent failed \n")

	case "invoice.payment_failed":
		log.Printf("received payment failed \n")
		// lines data price -- subscription is an ID to lookup and ref
		// match up customer ids and disable acc - try payment again or contact support
		// list stripes failure reason
		var stripeInvoice stripe.Invoice
		err := json.Unmarshal(event.Data.Raw, &stripeInvoice)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		subscriptionID := stripeInvoice.Subscription.ID

		teamSubscription, err := s.store.GetTeamSubscriptionByStripeID(subscriptionID)
		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		if teamSubscription.InvoicePaymentFailedAt == nil {
			now := time.Now()
			teamSubscription.InvoicePaymentFailedAt = &now
			if stripeInvoice.Subscription.Status != "" {
				teamSubscription.Status = models.TeamSubscriptionStatus(stripeInvoice.Subscription.Status)
			}

			err = s.store.UpdateTeamSubscription(teamSubscription)
			if err != nil {
				fmt.Printf("Error updating team subscription: %v\n", err)
				return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
			}
		}

		if stripeInvoice.PaymentIntent.Status == "requires_payment_method" {
			log.Printf("stripe subscription requires a payment method.\n")
		} else if stripeInvoice.PaymentIntent.Status == "requires_action" {
			log.Printf("stripe subscription requires action.\n")
		}

	case "setup_intent.setup_failed":
		// intial subscription begin, failure to pay
		var setupIntent stripe.SetupIntent
		err := json.Unmarshal(event.Data.Raw, &setupIntent)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid webhook payload.", Code: "invalid_payload"})
		}

		// check if customer has existing subscription - if so it means theyre adding a new payment method (that is failing)

		errorCode := setupIntent.LastSetupError.Code
		declineCode := setupIntent.LastSetupError.DeclineCode
		errorMessage := setupIntent.LastSetupError.Msg
		//setupIntent.LastSetupError.Err
		customerID := setupIntent.Customer.ID

		team, err := s.store.GetTeamByStripeCustomerID(customerID)
		if err != nil {
			return WriteJSON(w, http.StatusNotFound, Error{Error: "could not find team for stripe customer ID.", Code: "team_not_found"})
		}

		team.StripeSetupErrorCode = string(errorCode)
		team.StripeSetupDeclineCode = string(declineCode)
		team.StripeSetupErrorMessage = errorMessage

		err = s.store.UpdateTeam(team)
		if err != nil {
			fmt.Printf("Error updating team subscription: %v\n", err)
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

	case "setup_intent.succeeded":
		var setupIntent stripe.SetupIntent
		err := json.Unmarshal(event.Data.Raw, &setupIntent)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid webhook payload.", Code: "invalid_payload"})
		}

		customerID := setupIntent.Customer.ID

		team, err := s.store.GetTeamByStripeCustomerID(customerID)
		if err != nil {
			return WriteJSON(w, http.StatusNotFound, Error{Error: "could not find team for stripe customer ID.", Code: "team_not_found"})
		}

		team.StripeSetupErrorCode = ""
		team.StripeSetupDeclineCode = ""
		team.StripeSetupErrorMessage = ""

		err = s.store.UpdateTeam(team)
		if err != nil {
			fmt.Printf("Error updating team subscription: %v\n", err)
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

	case "payment_method.attached":
		var paymentMethod stripe.PaymentMethod
		err := json.Unmarshal(event.Data.Raw, &paymentMethod)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid payload.", Code: "invalid_payload"})
		}

		customerID := paymentMethod.Customer.ID
		team, err := s.store.GetTeamByStripeCustomerID(customerID)
		if err != nil {
			log.Printf("Error getting team for stripe customer ID: %s\n", customerID)
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		// customer added a new payment method
		teamSubscription, err := s.store.GetTeamSubscriptionByID(team.SubscriptionID)
		if err != nil {
			log.Printf("Error getting team subscription for subscription ID: %s\n", team.SubscriptionID)

		}

		teamSubscription.HasValidPaymentMethod = true

	case "payment_method.detached":
		var paymentMethod stripe.PaymentMethod
		err := json.Unmarshal(event.Data.Raw, &paymentMethod)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid payload.", Code: "invalid_payload"})
		}

		// customer removed a payment method
		// check number of payment methods remaining - see if they're valud

	case "payment_intent.succeeded":
		// check of current invoice is failed and update
		var paymentIntent stripe.PaymentIntent
		err := json.Unmarshal(event.Data.Raw, &paymentIntent)
		if err != nil {
			log.Printf("Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid payload.", Code: "invalid_payload"})
		}

		stripeCustomerID := paymentIntent.Customer.ID
		team, err := s.store.GetTeamByStripeCustomerID(stripeCustomerID)
		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		subscriptionID := team.SubscriptionID
		teamSubscription, err := s.store.GetTeamSubscriptionByID(subscriptionID)
		if err != nil {
			return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		teamSubscription.FailureCode = ""
		teamSubscription.FailureMessage = ""
		teamSubscription.InvoicePaymentFailedAt = nil

		err = s.store.UpdateTeamSubscription(teamSubscription)
		if err != nil {
			fmt.Printf("Error updating team subscription: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

	case "invoice.payment_succeeded":
		// check if invoice has failed and upate the status
		var stripeInvoice stripe.Invoice
		err := json.Unmarshal(event.Data.Raw, &stripeInvoice)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing webhook JSON: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid payload.", Code: "invalid_payload"})
		}

		subscriptionID := stripeInvoice.Subscription.ID
		teamSubscription, err := s.store.GetTeamSubscriptionByStripeID(subscriptionID)
		if err != nil {
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

		teamSubscription.InvoicePaymentFailedAt = nil
		teamSubscription.FailureCode = ""
		teamSubscription.FailureMessage = ""
		teamSubscription.Status = models.TeamSubscriptionStatus(stripeInvoice.Subscription.Status)

		err = s.store.UpdateTeamSubscription(teamSubscription)
		if err != nil {
			log.Printf("Error updating team subscription: %v\n", err)
			return WriteJSON(w, http.StatusBadRequest, Error{Error: "internal server error.", Code: "internal_server_error"})
		}

	default:
		log.Printf("Unhandled stripe webhook event type: %s\n", event.Type)
	}

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]string{}})
}

func (s *Server) handleUpdatePaymentMethod(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	slug := chi.URLParam(r, "slug")

	team, err := s.store.GetTeamBySlug(slug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "team not found.",
			Code:  "team_not_found",
		})
	}

	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{
			Error: "unauthorized",
			Code:  "unauthorized",
		})
	}

	user := userSession.User

	isTeamMember, err := userIsTeamMember(s, user.ID, team.ID)

	if err != nil || !isTeamMember {
		return WriteJSON(w, http.StatusForbidden, Error{
			Error: "you do not have access to this team",
			Code:  "forbidden",
		})
	}

	teamMember, err := s.store.GetTeamMemberByTeamIDAndUserID(team.ID, user.ID)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{
			Error: "team member not found.",
			Code:  "team_member_not_found",
		})
	}

	if teamMember.TeamRole != "owner" {
		return WriteJSON(w, http.StatusForbidden, Error{
			Error: "you do not have permission take this action",
			Code:  "forbidden",
		})
	}

	returnUrl := fmt.Sprintf("%s/%s/settings/team/billing", os.Getenv("APP_URL"), slug)

	paymentMethodParams := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(team.StripeCustomerID),
		ReturnURL: stripe.String(returnUrl),
		FlowData: &stripe.BillingPortalSessionFlowDataParams{
			Type: stripe.String("payment_method_update"),
			AfterCompletion: &stripe.BillingPortalSessionFlowDataAfterCompletionParams{
				Type: stripe.String("redirect"),
				Redirect: &stripe.BillingPortalSessionFlowDataAfterCompletionRedirectParams{
					ReturnURL: stripe.String(returnUrl),
				},
			},
		},
	}
	result, err := portalSession.New(paymentMethodParams)

	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]string{
		"redirect_url": result.URL,
	}})
}

// func handleSubscriptonUpdate(subscription *stripe.Subscription) error {
// 	// handle going to cancel - update the cancel at date
// 	// update the billing cycle end date
// 	// get current plan

// 	// handle upgrade
// 	// set new plan

// 	// handle downgrade
// 	// set date of downgrade
// 	// set plan being downgraded to

// 	return nil
// }

type PlanMap map[string]int

var PlanHierarchy = PlanMap{
	"basic_monthly":    1,
	"basic_annually":   1,
	"pro_monthly":      2,
	"pro_annually":     2,
	"premium_monthly":  3,
	"premium_annually": 3,
}

func (s *Server) handleGetStripeCustomer(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")
	teamSlug := chi.URLParam(r, "slug")
	team, err := s.store.GetTeamBySlug(teamSlug)

	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "team not found", Code: "team_not_found"})
	}

	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized", Code: "unauthorized"})
	}

	user := userSession.User

	// validate that user is a team member
	teamMember, err := userIsTeamMember(s, user.ID, team.ID)
	if !teamMember || err != nil {
		return WriteJSON(w, http.StatusForbidden, Error{Error: "forbidden", Code: "forbidden"})
	}

	customerID := team.StripeCustomerID

	customerParams := &stripe.CustomerParams{}
	stripeCustomer, err := customer.Get(customerID, customerParams)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, Response{Data: map[string]any{
		"customer": stripeCustomer,
	}})
}

func (s *Server) handleGetPaymentMethods(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")
	teamSlug := chi.URLParam(r, "slug")
	team, err := s.store.GetTeamBySlug(teamSlug)

	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "team not found", Code: "team_not_found"})
	}

	userSession, err := getUserSession(s, r)
	if err != nil {
		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized", Code: "unauthorized"})
	}

	user := userSession.User

	// validate that user is a team member
	teamMember, err := userIsTeamMember(s, user.ID, team.ID)
	if !teamMember || err != nil {
		return WriteJSON(w, http.StatusForbidden, Error{Error: "forbidden", Code: "forbidden"})
	}

	customerID := team.StripeCustomerID

	if customerID == "" {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "no active subscription found.", Code: "subscription_not_found"})
	}

	params := &stripe.CustomerListPaymentMethodsParams{
		Customer: stripe.String(customerID),
	}
	result := customer.ListPaymentMethods(params)

	return WriteJSON(w, http.StatusOK, Response{Data: result.PaymentMethodList()})
}

func (s *Server) handleUpdateDefaultPaymentMethod(w http.ResponseWriter, r *http.Request) error {
	teamSlug := chi.URLParam(r, "slug")
	team, err := s.store.GetTeamBySlug(teamSlug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "team not found.", Code: "team_not_found"})
	}

	stripe.Key = os.Getenv("STRIPE_API_KEY")

	paymentMethodID := chi.URLParam(r, "id")

	if paymentMethodID == "" {
		return WriteJSON(w, http.StatusBadRequest, Error{Error: "default payment method not provided.", Code: "empty_body"})
	}

	params := &stripe.CustomerParams{
		InvoiceSettings: &stripe.CustomerInvoiceSettingsParams{
			DefaultPaymentMethod: stripe.String(paymentMethodID),
		},
	}
	result, err := customer.Update(team.StripeCustomerID, params)
	if err != nil {
		return WriteJSON(w, http.StatusInternalServerError, Error{Error: "internal server error.", Code: "internal_server_error"})
	}

	return WriteJSON(w, http.StatusOK, Response{Data: result})
}

//func (s *Server) handleDeletePaymentMethod(w http.ResponseWriter, r *http.Request) error {
//	stripe.Key = os.Getenv("STRIPE_API_KEY")
//
//	teamSlug := chi.URLParam(r, "slug")
//	team, err := s.store.GetTeamBySlug(teamSlug)
//	if err != nil {
//		return WriteJSON(w, http.StatusNotFound, Error{Error: "team not found", Code: "team_not_found"})
//	}
//
//	user, _, _, err := getUserIdentity(s, r)
//	if err != nil {
//		return WriteJSON(w, http.StatusUnauthorized, Error{Error: "unauthorized", Code: "unauthorized"})
//	}
//
//	isTeamMember, err := userIsTeamMember(s, user.ID, team.ID)
//
//	if !isTeamMember || err != nil {
//		return WriteJSON(w, http.StatusForbidden, Error{Error: "forbidden", Code: "forbidden"})
//	}
//
//	teamMember, err := s.store.GetTeamMemberByTeamIDAndUserID(team.ID, user.ID)
//	if err != nil {
//		return WriteJSON(w, http.StatusForbidden, Error{Error: "forbidden", Code: "forbidden"})
//	}
//
//	if teamMember.TeamRole != models.TeamRoleOwner {
//		return WriteJSON(w, http.StatusForbidden, Error{Error: "forbidden", Code: "forbidden"})
//	}
//
//	paymentMethodID := chi.URLParam(r, "id")
//
//	params := &stripe.PaymentMethodDetachParams{}
//	result, err := paymentmethod.Detach(paymentMethodID, params)
//
//	if err != nil {
//		return WriteJSON(w, http.StatusBadRequest, Error{Error: "invalid payment method.", Code: "invalid_request"})
//	}
//
//	return WriteJSON(w, http.StatusOK, Response{Data: result})
//}

func (s *Server) handleGetInvoices(w http.ResponseWriter, r *http.Request) error {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	teamSlug := chi.URLParam(r, "slug")
	team, err := s.store.GetTeamBySlug(teamSlug)
	if err != nil {
		return WriteJSON(w, http.StatusNotFound, Error{Error: "team not found", Code: "team_not_found"})
	}

	params := &stripe.InvoiceListParams{
		Customer: stripe.String(team.StripeCustomerID),
	}
	// todo handle pagination
	//params.Limit = stripe.Int64(6)
	result := invoice.List(params)

	invoices := result.InvoiceList()
	return WriteJSON(w, http.StatusOK, Response{Data: invoices})
}

func analyzeSubscriptionChange(event *stripe.Event) string {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	if event.Type != "customer.subscription.updated" {
		return "no_change"
	}

	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		return "no_change"
	}

	prevAttrs := event.Data.PreviousAttributes

	if _, ok := prevAttrs["schedule"]; ok {
		return "schedule_change"
	}

	if prevItems, ok := prevAttrs["items"].(map[string]interface{}); ok {
		prevData := prevItems["data"].([]interface{})
		if len(prevData) == 0 || len(sub.Items.Data) == 0 {
			return "no_change"
		}

		prevItem := prevData[0].(map[string]interface{})
		prevPrice := prevItem["price"].(map[string]interface{})
		prevAmount := prevPrice["unit_amount"].(int64)
		currentAmount := sub.Items.Data[0].Price.UnitAmount

		switch {
		case prevAmount > currentAmount:
			return "downgrade"
		case prevAmount < currentAmount:
			return "upgrade"
		}
	}

	if prevPlan, ok := prevAttrs["plan"].(map[string]interface{}); ok {
		prevInterval := prevPlan["interval"].(string)
		// get current interval directly from first item's price
		if firstItem := sub.Items.Data[0]; firstItem.Price != nil && firstItem.Price.Recurring != nil {
			currentInterval := string(firstItem.Price.Recurring.Interval)
			if strings.Compare(prevInterval, currentInterval) != 0 {
				return "interval_change"
			}
		}
	}

	return "no_change"
}

type SubscriptionChange struct {
	CurrentPlanID string
	NewPlanID     string
	ChangeDate    time.Time
}

func getSubscriptionChangeInfo(scheduleID string) (*SubscriptionChange, error) {
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	// get schedule with phases included
	params := &stripe.SubscriptionScheduleParams{
		Expand: []*string{
			stripe.String("phases.items.price"),
		},
	}

	stripeSchedule, err := subscriptionschedule.Get(scheduleID, params)
	if err != nil {
		return nil, fmt.Errorf("fetch schedule: %w", err)
	}

	// rest of the logic remains same
	var currentPhase *stripe.SubscriptionSchedulePhase
	now := time.Now()

	for _, phase := range stripeSchedule.Phases {
		start := time.Unix(phase.StartDate, 0)
		end := time.Unix(phase.EndDate, 0)

		if now.After(start) && now.Before(end) {
			currentPhase = phase
			break
		}
	}

	var nextPhase *stripe.SubscriptionSchedulePhase
	for _, phase := range stripeSchedule.Phases {
		start := time.Unix(phase.StartDate, 0)
		if start.After(now) {
			nextPhase = phase
			break
		}
	}

	if currentPhase == nil || nextPhase == nil {
		return nil, fmt.Errorf("could not find current or next phase")
	}

	currentPlanID := currentPhase.Items[0].Price.ID
	newPlanID := nextPhase.Items[0].Price.ID
	changeDate := time.Unix(nextPhase.StartDate, 0)

	return &SubscriptionChange{
		CurrentPlanID: currentPlanID,
		NewPlanID:     newPlanID,
		ChangeDate:    changeDate,
	}, nil
}
