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
  terms_accepted?: boolean;
  team_created_or_joined?: boolean;
  default_team_slug?: string;
  deleted?: boolean;
  restorable?: boolean;
};

export type Identity = {
  user: User;
  team: Team;
  team_member: TeamMember;
  valid: boolean;
};

export type TeamMember = {
  id: string;
  user_id: string;
  team_id: string;
  team_role: string;
  status: string;
  onboarded: boolean;
  joined_at: string;
  email: string;
};

export type TeamMemberResponse = {
  team_member: TeamMember;
  user: User;
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

export type RawApiResponse = {
  message?: string;
  data?: any;
  code: ResponseCode | ErrorCode;
  error?: ErrorCode | null;
};

export type ApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  code?: ResponseCode | ErrorCode;
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
  subscription_tier_chosen: boolean;
};

export type SelectTeamOptions = {
  name: string;
  id: string;
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
    invite: TeamInvite;
    team: Team;
  };
};

export type TeamInvite = {
  id: string;
  team_id: string;
  team_role: string;
  status: string;
  created_at: string;
  updated_at: string;
  state: string;
  team_name: string;
  team_slug: string;
  slug: string;
};

export type ListInvitesResponse = {
  data: {
    invites: TeamInvite[];
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
