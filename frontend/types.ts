import { ErrorCode, ResponseCode } from '@/messages';

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  avatarUrl: string;
};

export type ApiResponse = {
  message: string;
  code: ResponseCode;
  error: null | undefined;
};

export type ApiError = {
  message: string;
  error: string;
  code: ErrorCode;
};

export type Subscription = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  status: string;
  trial_ends_on: string;
  ends_on: string;
  plan_type: string;
};

export type Team = {
  id: string;
  name: string;
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
  amazon_pay: {};
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type Invite = {
  id: string;
  team_id: string;
  email: string;
  status: string;
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  product_lookup_key: string;
  price_lookup_key: string;
};
