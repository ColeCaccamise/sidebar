package models

type SubscriptionPlan struct {
	Name           string `json:"name"`
	ProductID      string `json:"product_id"`
	PriceID        string `json:"price_id"`
	PriceLookupKey string `json:"price_lookup_key"`
	ProductActive  bool   `json:"product_active"`
	PriceActive    bool   `json:"price_active"`
	Interval       string `json:"interval"`
	Price          int    `json:"price"`
	PlanType       string `json:"plan_type"`
}

type CreateCheckoutSessionRequest struct {
	PriceLookupKey string `json:"price_lookup_key"`
}

type UpdateSubscriptionRequest struct {
	PriceLookupKey string `json:"price_lookup_key"`
}
