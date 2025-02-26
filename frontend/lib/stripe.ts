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

/**
 * The function `setStripeCustomerId` sets a customer ID in Redis for a specific workspace.
 * @param {string} workspaceId - A string representing the ID of the workspace for which the Stripe
 * customer ID is being set.
 * @param {string} customerId - The `customerId` parameter is a string that represents the unique
 * identifier for a customer in the Stripe payment system.
 */
export async function setStripeCustomerId(
  workspaceId: string,
  customerId: string,
) {
  await setRedis({ key: `stripe:workspace:${workspaceId}`, value: customerId });
}

export async function getStripeCustomerId(workspaceId: string | null) {
  if (!workspaceId) {
    return null;
  }

  const customerId = await getRedis({ key: `stripe:workspace:${workspaceId}` });
  return customerId.data as string | null;
}

export async function getStripeSubscription(customerId: string | null) {
  if (!customerId) {
    return null;
  }

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
