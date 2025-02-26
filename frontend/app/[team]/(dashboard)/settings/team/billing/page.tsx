import {
  Subscription,
  Invoice,
  Customer,
  WorkspacePaymentMethod,
  Plan,
} from '@/types';
import { PaymentMethodWarning, PlanInformation } from './billing-components';
import { Metadata } from 'next';
import { getStripeCustomerId, getStripeSubscription } from '@/lib/stripe';
import { getCurrentOrgID } from '@/lib/workspace';

export const metadata: Metadata = {
  title: 'Billing',
};

export default async function BillingPage({
  params,
}: {
  params: { team: string };
}) {
  const paymentMethods: WorkspacePaymentMethod[] = [];
  const plans: Plan[] = [];
  const subscription: Subscription = {
    id: '',
    name: '',
    price: 0,
    currency: '',
    interval: 'month',
    status: '',
    trial_ends_on: '',
    trial_end: 0,
    ends_on: 0,
    plan_type: 'free',
    cancel_at: null,
    stripe_price_id: '',
    stripe_price_lookup_key: '',
    free_trial_duration_remaining: 0,
    free_trial_active: false,
    items: {
      id: '',
      plan_id: '',
      quantity: 0,
      data: [
        {
          id: '',
          type: '',
          quantity: 0,
          price: {
            unit_amount: 0,
            currency: '',
          },
        },
      ],
    },
  };

  const invoices: Invoice[] = [];
  const customer: Customer = {
    id: '',
    name: '',
    email: '',
    phone: '',
    invoice_settings: {
      default_payment_method: {
        id: '',
      },
    },
  };

  const orgId = await getCurrentOrgID();
  const cust = await getStripeCustomerId(orgId);
  const sub = await getStripeSubscription(cust);

  const handleAddNewPaymentMethod = async () => {
    'use server';

    console.log('add new payment method');
  };

  const handleRemovePaymentMethod = async () => {
    'use server';

    console.log('remove payment method');
  };

  const handleSetDefaultPaymentMethod = async () => {
    'use server';

    console.log('add new payment method');
  };

  return (
    <>
      <PaymentMethodWarning
        paymentMethods={paymentMethods}
        handleAddNewPaymentMethod={handleAddNewPaymentMethod}
      />

      <div className="flex w-full flex-col items-start gap-6 pb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">Billing </h1>
          <p className="text-typography-weak">
            Manage your team&apos;s billing information and invoices.
          </p>
        </div>
      </div>

      <PlanInformation
        plans={plans}
        subscription={subscription}
        invoices={invoices}
        slug={params.team}
        handleAddNewPaymentMethod={handleAddNewPaymentMethod}
        paymentMethods={paymentMethods}
        customer={customer}
        handleSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
        handleRemovePaymentMethod={handleRemovePaymentMethod}
      />
    </>
  );
}
