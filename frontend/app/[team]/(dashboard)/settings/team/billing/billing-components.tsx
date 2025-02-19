'use client';

import Link from 'next/link';
import {
  DotsHorizontalIcon,
  ClockIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import {
  WorkspacePaymentMethod,
  Plan,
  Subscription,
  Invoice,
  Customer,
} from '@/types';
import {
  CreditCardIcon,
  DollarSignIcon,
  DownloadIcon,
  LandmarkIcon,
} from 'lucide-react';
import { ReactElement, useState } from 'react';
import { faAmazonPay } from '@fortawesome/free-brands-svg-icons';
import {
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Tooltip,
} from '@/components/ui/tooltip';
import Dropdown from '@/components/ui/dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Divider from '@/components/ui/divider';

interface PaymentMethodsProps {
  paymentMethods: WorkspacePaymentMethod[];
  handleAddNewPaymentMethod: () => Promise<void>;
}

export const PaymentMethodWarning = ({
  paymentMethods,
  handleAddNewPaymentMethod,
}: PaymentMethodsProps) => {
  return (
    <>
      {paymentMethods.length === 0 && (
        <div className="mb-4 flex flex-col items-center justify-between gap-2 rounded-md border border-warning-stroke-weak bg-warning-fill px-4 py-2 md:flex-row">
          <span className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-warning" />

            <span className="text-sm text-warning">
              Your subscription benefits will be paused without an active
              payment method.
            </span>
          </span>

          <Button
            variant="unstyled"
            className="btn-small w-full bg-warning-fill text-sm text-warning md:w-fit"
            onClick={() => handleAddNewPaymentMethod()}
          >
            Add a payment method
          </Button>
        </div>
      )}
    </>
  );
};

interface PaymentMethodProps {
  icon: ReactElement;
  name: string;
  id: string;
  isDefault: boolean;
  description?: string;
  handleSetDefaultPaymentMethod: () => void;
  handleRemovePaymentMethod: () => void;
}
const PaymentMethod = ({
  icon,
  name,
  id,
  isDefault,
  description,
  handleSetDefaultPaymentMethod,
  handleRemovePaymentMethod,
}: PaymentMethodProps) => {
  return (
    <div key={id} className="flex w-full flex-row justify-between gap-2 py-2">
      <div className="flex w-full flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-4">
          {icon}
          <div className="flex flex-col">
            <div className="flex flex-row items-center gap-2">
              <span className="text-sm text-typography-strong">{name}</span>
              {isDefault && (
                <span className="rounded-md bg-info-fill px-2 py-1 text-xs text-typography-weak">
                  Default
                </span>
              )}
            </div>
            <span className="text-sm text-typography-weak">{description}</span>
          </div>
        </div>
        <div className="w-8">
          {isDefault ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button disabled className="opacity-60" variant="unstyled">
                    <Cross2Icon className="h-4 w-4 text-typography-weak" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your default payment method can&apos;t be deleted</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Dropdown
              position={'right'}
              showIcon={false}
              menuItems={[
                {
                  disabled: isDefault,
                  label: 'Make default',
                  handleClick: handleSetDefaultPaymentMethod,
                },
                {
                  label: 'Delete',
                  handleClick: handleRemovePaymentMethod,
                  disabled: isDefault,
                  destructive: true,
                },
              ]}
            >
              <DotsHorizontalIcon className="h-4 w-4 text-typography-weak" />
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
};

interface PlanInformationProps {
  plans: Plan[];
  subscription: Subscription;
  invoices: Invoice[];
  slug: string;
  handleAddNewPaymentMethod: () => void;
  paymentMethods: WorkspacePaymentMethod[];
  customer: Customer;
  handleSetDefaultPaymentMethod: (paymentMethodID: string) => void;
  handleRemovePaymentMethod: (paymentMethodID: string) => void;
}

export const PlanInformation = ({
  plans,
  subscription,
  invoices,
  slug,
  handleAddNewPaymentMethod,
  paymentMethods,
  customer,
  handleSetDefaultPaymentMethod,
  handleRemovePaymentMethod,
}: PlanInformationProps) => {
  const [changeBillingIntervalModalOpen, setChangeBillingIntervalModalOpen] =
    useState(false);

  // billing client helpers
  const getPlanTypeText = (planType: string) => {
    if (planType === 'basic') return 'Basic Plan';
    if (planType === 'pro') return 'Pro Plan';
    if (planType === 'premium') return 'Premium Plan';
    return 'Unknown';
  };

  function getCurrentPlan(priceID: string) {
    console.log('price ID', priceID);
    return plans.find((plan) => plan.price_id === priceID);
  }

  function getCurrentPlanPrice(priceID: string) {
    const plan = getCurrentPlan(priceID);
    console.log(plan);
    return plan ? plan?.price / 100 : 0;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col items-start justify-between gap-4 rounded-md border border-stroke-weak px-6 py-6 lg:flex-row lg:items-center">
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-grow flex-col gap-4">
            <span className="text-lg font-bold text-typography-strong">
              Current Plan
            </span>
            <div className="flex flex-col gap-2">
              <span className="text-typography-strong">
                {getPlanTypeText(subscription?.plan_type || '')}
              </span>
              <span>
                ${getCurrentPlanPrice(subscription?.stripe_price_id || '')}
                /month, billed monthly
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-typography-weak" />
            <span>
              Renews on <span>January 7, 2025</span>
            </span>
          </div>
        </div>
        <div className="flex w-full flex-col items-center gap-4 lg:flex-row lg:justify-end">
          <Button
            variant="secondary"
            className="btn-small w-full text-sm lg:w-fit"
            onClick={() => setChangeBillingIntervalModalOpen(true)}
          >
            Change Billing Interval
          </Button>
          <Button className="btn-small w-full text-sm lg:w-fit">
            <Link
              href={`/${slug}/settings/team/plans`}
              className="w-full text-sm text-background no-underline lg:w-fit"
            >
              Change Plan
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex w-full flex-row items-center justify-between gap-4 rounded-md border border-stroke-weak px-6 py-4">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-row items-center justify-between gap-4">
            <span className="text-lg font-bold text-typography-strong">
              Payment Methods
            </span>
            <Button
              variant="secondary"
              onClick={() => handleAddNewPaymentMethod()}
              className="btn-small text-sm"
            >
              Add New
            </Button>
          </div>
          {paymentMethods.length === 0 && (
            <div className="flex w-full flex-col items-start justify-start gap-2 py-4">
              <span className="text-sm text-typography-weak">
                Keep your account active by adding a payment method.
              </span>
              <Button
                variant="unstyled"
                className="text-sm underline hover:opacity-90"
                onClick={() => handleAddNewPaymentMethod()}
              >
                Add a payment method
              </Button>
            </div>
          )}
          {paymentMethods.map((method: WorkspacePaymentMethod) => {
            if (method.card !== null) {
              return (
                <PaymentMethod
                  key={method.id}
                  icon={<CreditCardIcon />}
                  name={`${method.card.brand[0].toUpperCase()}${method.card.brand.slice(1).toLowerCase()} •••• ${method.card.last4}`}
                  id={method.id}
                  isDefault={
                    customer?.invoice_settings?.default_payment_method?.id ===
                    method.id
                  }
                  description={`Expires ${String(method.card.exp_month).padStart(2, '0')}/${method.card.exp_year}`}
                  handleSetDefaultPaymentMethod={() =>
                    handleSetDefaultPaymentMethod(method.id)
                  }
                  handleRemovePaymentMethod={() =>
                    handleRemovePaymentMethod(method.id)
                  }
                />
              );
            } else if (method.cashapp !== null) {
              <PaymentMethod
                key={method.id}
                icon={
                  <DollarSignIcon
                    width={20}
                    height={20}
                    className="text-typography-weak"
                  />
                }
                name="Cash App Pay"
                id={method.id}
                isDefault={
                  customer?.invoice_settings?.default_payment_method?.id ===
                  method.id
                }
                description={method.cashapp.cashtag}
                handleSetDefaultPaymentMethod={() =>
                  handleSetDefaultPaymentMethod(method.id)
                }
                handleRemovePaymentMethod={() =>
                  handleRemovePaymentMethod(method.id)
                }
              />;
            } else if (method.amazon_pay !== null) {
              return (
                <PaymentMethod
                  key={method.id}
                  icon={
                    <FontAwesomeIcon
                      icon={faAmazonPay}
                      className="h-5 w-5 text-typography-weak"
                    />
                  }
                  name="Amazon Pay"
                  id={method.id}
                  isDefault={
                    customer?.invoice_settings?.default_payment_method?.id ===
                    method.id
                  }
                  description={method.amazon_pay.email}
                  handleSetDefaultPaymentMethod={() =>
                    handleSetDefaultPaymentMethod(method.id)
                  }
                  handleRemovePaymentMethod={() =>
                    handleRemovePaymentMethod(method.id)
                  }
                />
              );
            } else if (method.us_bank_account !== null) {
              return (
                <PaymentMethod
                  key={method.id}
                  icon={
                    <LandmarkIcon
                      width={20}
                      height={20}
                      className="text-typography-weak"
                    />
                  }
                  name={method?.us_bank_account?.bank_name}
                  id={method.id}
                  isDefault={
                    customer?.invoice_settings?.default_payment_method?.id ===
                    method.id
                  }
                  handleSetDefaultPaymentMethod={() =>
                    handleSetDefaultPaymentMethod(method.id)
                  }
                  handleRemovePaymentMethod={() =>
                    handleRemovePaymentMethod(method.id)
                  }
                />
              );
            }
          })}
        </div>
      </div>

      <div className="flex w-full flex-row items-center justify-between gap-4 rounded-md border border-stroke-weak px-6 py-4">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-row items-center justify-between gap-4">
            <span className="text-lg font-bold text-typography-strong">
              Billing History
            </span>
          </div>

          <div className="flex w-full flex-col gap-6 py-2">
            {invoices && invoices.length > 0 ? (
              invoices.map((invoice, index) => (
                <>
                  <div
                    key={invoice.id}
                    className="flex w-full flex-row justify-between gap-2"
                  >
                    <div className="flex w-full flex-row items-center justify-between">
                      <div className="flex flex-row items-center gap-4">
                        <DownloadIcon className="h-5 w-5 text-typography-weak" />
                        <div className="flex flex-col">
                          <div className="flex flex-row items-center gap-2">
                            <span className="text-sm text-typography-strong">
                              ${invoice.amount_paid / 100}
                            </span>
                          </div>
                          <span className="text-sm text-typography-weak">
                            {invoice?.status_transitions?.paid_at &&
                              new Date(
                                invoice?.status_transitions?.paid_at * 1000,
                              ).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-md bg-success-fill px-2 py-1 text-sm text-success">
                        {invoice.status[0].toUpperCase() +
                          invoice.status.slice(1).toLowerCase()}
                      </span>
                      <div>
                        <Link
                          target="_blank"
                          className="text-sm no-underline"
                          href={invoice.invoice_pdf}
                        >
                          Download
                        </Link>
                      </div>
                    </div>
                  </div>
                  {index < invoices.length - 1 && <Divider />}
                </>
              ))
            ) : (
              <div className="flex w-full justify-center py-4">
                <span className="text-sm text-typography-weak">
                  No payments yet for this team
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
