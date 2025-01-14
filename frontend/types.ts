import { ErrorCode, ResponseCode } from '@/messages';

export type User = {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  updated_email: string;
  is_admin?: boolean;
  avatar_url?: string;
  deleted_at?: string | null;
};

export type TeamMember = {
  id: string;
  user_id: string;
  team_id: string;
  team_role: string;
  status: string;
  onboarded: boolean;
};

export type Session = {
  id: string;
  original_sign_in_at: string;
  device: string;
  last_location: string;
  ip_address: string;
  last_seen_at: string;
  auth_method: string;
};

export type ApiResponse = {
  message?: string;
  code: ResponseCode;
  error?: null | undefined;
};

export type ApiError = {
  message?: string;
  error: string;
  code: ErrorCode;
};

export type Subscription = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  status: string;
  trial_ends_on: string;
  trial_end: number;
  ends_on?: number;
  plan_type: 'free' | 'basic' | 'pro' | 'premium' | 'enterprise';
  cancel_at: number | null;
  stripe_price_id: string;
  stripe_price_lookup_key: string;
  free_trial_duration_remaining?: number;
  free_trial_active?: boolean;
  items: {
    id: string;
    plan_id: string;
    quantity: number;
    data: {
      id: string;
      type: string;
      quantity: number;
      price: {
        unit_amount: number;
        currency: string;
      };
    }[];
  };
};

export type Team = {
  id: string;
  name: string;
  slug: string;
};

export type TeamPaymentMethod = {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  cashapp: {
    cashtag: string;
  };
  amazon_pay: {
    email: string;
  };
  us_bank_account: {
    bank_name: string;
    last4: string;
  };
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  invoice_settings: {
    default_payment_method: {
      id: string;
    };
  };
};

export type Invite = {
  data: {
    invite: {
      team_role: string;
      token: string;
    };
    team: {
      name: string;
      slug: string;
    };
  };
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  product_lookup_key: string;
  price_lookup_key: string;
  price_id: string;
};

export type Invoice = {
  id: string;
  status: string;
  total: number;
  currency: string;
  created: number;
  invoice_pdf: string;
  amount_paid: number;
  status_transitions: {
    paid_at: number | null;
  };
};
