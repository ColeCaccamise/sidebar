import { getRedis, setRedis } from './redis';
import stripe from 'stripe';

type Subscription = {
  subscriptionId?: string;
  status?: string;
  priceId?: string;
  currentPeriodEnd?: number;
  currentPeriodStart?: number;
  cancelAtPeriodEnd?: boolean;
  paymentMethod?: {
    brand?: string;
    last4?: string;
  };
};

export type SubscriptionData = {
  success: boolean;
  data?: Subscription | null;
};

export async function getStripeCustomerId(userId: string) {
  if (!userId) {
    return null;
  }

  const customerId = await getRedis({ key: `stripe:user:${userId}` });
  return customerId;
}

export async function getStripeSubscription(customerId: string) {
  const subscription = await getRedis({ key: `stripe:customer:${customerId}` });
  return subscription;
}

export async function syncStripeDataToKV(
  customerId: string,
): Promise<SubscriptionData> {
  try {
    const stripeClient = new stripe(process.env.STRIPE_API_KEY!);

    // Fetch latest subscription data from Stripe
    const subscriptions = await stripeClient.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      const subData = { status: 'none' };
      await setRedis({ key: `stripe:customer:${customerId}`, value: subData });
      return { success: true, data: subData };
    }

    // If a user can have multiple subscriptions, that's your problem
    const subscription = subscriptions.data[0];

    // Store complete subscription state
    const subData: Subscription = {
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId: subscription.items.data[0].price.id,
      currentPeriodEnd: subscription.current_period_end,
      currentPeriodStart: subscription.current_period_start,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      paymentMethod:
        subscription.default_payment_method &&
        typeof subscription.default_payment_method !== 'string'
          ? {
              brand:
                subscription.default_payment_method.card?.brand ?? undefined,
              last4:
                subscription.default_payment_method.card?.last4 ?? undefined,
            }
          : undefined,
    };

    // Store the data in your KV
    await setRedis({ key: `stripe:customer:${customerId}`, value: subData });

    return { success: true, data: subData };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}
