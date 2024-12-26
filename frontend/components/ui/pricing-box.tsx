import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import Button from './button';
import { useState } from 'react';
import Link from 'next/link';
import Divider from './divider';

interface PricingBoxProps {
  planName: string;
  planDescription?: string;
  planPrice?: number;
  currentBillingOption?: 'month' | 'year';
  billingOption?: 'month' | 'year';
  features?: Array<{
    featureName: string;
    featureIncluded: boolean;
  }>;
  customPricing?: boolean;
  subscribedTo?: boolean;
  priceLookupKey: string;
  planType?: 'current' | 'upgrade' | 'downgrade' | 'switch';
  highlight?: boolean;
  handleSelectPlan: (priceLookupKey: string) => void;
  handleUpdatePlan: (priceLookupKey: string) => void;
  subscribeToPrefix?: string;
  subscribeToSuffix?: string;
  trialInProgress?: boolean;
}

export default function PricingBox({
  planName,
  planDescription,
  planPrice,
  currentBillingOption,
  billingOption = 'month',
  features,
  customPricing = false,
  subscribedTo = false,
  priceLookupKey,
  planType,
  highlight = false,
  handleSelectPlan,
  handleUpdatePlan,
  subscribeToPrefix = 'Subscribe to',
  subscribeToSuffix = '',
  trialInProgress = false,
}: PricingBoxProps) {
  const [selectedPlan, setSelectedPlan] = useState(false);

  const renderActionButton = () => {
    if (customPricing) {
      return (
        <Link
          href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
          className={`${highlight ? 'btn btn-brand' : 'btn btn-brand-secondary'} w-full no-underline`}
        >
          Request a quote
        </Link>
      );
    }

    if (planType === 'current') {
      if (currentBillingOption === billingOption) {
        return (
          <Button
            disabled={subscribedTo}
            className={`${highlight ? 'btn-brand' : 'btn-brand-secondary'} w-full`}
          >
            {trialInProgress ? 'Trial in progress' : 'Your current plan'}
          </Button>
        );
      } else {
        return (
          <Button
            className={`${highlight ? 'btn-brand' : 'btn-brand-secondary'} w-full`}
          >
            Switch to {billingOption === 'year' ? 'annual' : 'monthly'}
          </Button>
        );
      }
    }

    if (!planType) {
      // First time subscriber
      return (
        <Button
          disabled={subscribedTo || selectedPlan}
          className={`${highlight ? 'btn-brand' : 'btn-brand-secondary'} w-full`}
          handleClick={() => handleSelectPlan(priceLookupKey)}
        >
          {selectedPlan
            ? 'Subscribing...'
            : `${subscribeToPrefix} ${planName} ${subscribeToSuffix}`}
        </Button>
      );
    }

    // Existing subscriber changing plans
    return (
      <Button
        className={`${highlight ? 'btn-brand' : 'btn-brand-secondary'} w-full`}
        handleClick={() => handleUpdatePlan(priceLookupKey)}
        disabled={selectedPlan}
      >
        {selectedPlan
          ? planType === 'upgrade'
            ? 'Upgrading...'
            : 'Downgrading...'
          : planType === 'upgrade'
            ? `Upgrade to ${planName}`
            : planType === 'switch'
              ? `Switch to ${planName} ${billingOption === 'year' ? 'annually' : 'monthly'}`
              : `Downgrade to ${planName}`}
      </Button>
    );
  };

  return (
    <div className="flex w-full flex-col justify-between gap-6 rounded-md border border-stroke-weak p-4">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6">
          <span className="text-2xl font-medium text-typography-strong">
            {planName}
          </span>
          {planDescription && (
            <span className="text-sm text-typography-weak">
              {planDescription}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {' '}
          <div>
            <span className="text-4xl font-medium text-typography-strong">
              {customPricing ? 'Custom' : `$${planPrice} `}
            </span>
            {!customPricing && (
              <span className="text-sm text-typography-weak">/ mo</span>
            )}
          </div>
          <span className="text-sm text-typography-weak">
            {customPricing ? (
              <span>Purpose built for your organization</span>
            ) : (
              <span>
                Billed {billingOption === 'year' ? 'annually' : 'monthly'}
              </span>
            )}
          </span>
        </div>

        {features && features.length > 0 && (
          <>
            <Divider />

            <div className="flex flex-col gap-2 py-4">
              {features?.map((feature) => (
                <div className="flex items-center gap-2 py-1">
                  <span>
                    {feature.featureIncluded ? (
                      <CheckCircledIcon className="h-4 w-4 text-success" />
                    ) : (
                      <CrossCircledIcon className="h-4 w-4" />
                    )}
                  </span>
                  <span>{feature.featureName}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {renderActionButton()}
    </div>
  );
}
