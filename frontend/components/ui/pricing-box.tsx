import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import Button from './button';
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from '@/lib/toast';
import { getErrorMessage } from '@/messages';
import Link from 'next/link';

export default function PricingBox({
  planName,
  planPrice,
  billingOption = 'month',
  features,
  customPricing = false,
  subscribedTo = false,
  priceLookupKey,
  planType,
}: {
  planName: string;
  planPrice?: number;
  billingOption?: 'month' | 'year';
  features?: Array<{
    featureName: string;
    featureIncluded: boolean;
  }>;
  customPricing?: boolean;
  subscribedTo?: boolean;
  priceLookupKey?: string;
  planType?: 'current' | 'upgrade' | 'downgrade';
}) {
  const billingOptions = {
    month: 'mo',
    year: 'yr',
  };

  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState(false);

  async function handleSelectPlan() {
    setSelectedPlan(!selectedPlan);

    await axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/billing/checkout`,
        {
          price_lookup_key: priceLookupKey,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      )
      .then((res) => {
        router.push(res.data.data.redirect_url);
      })
      .catch((err) => {
        toast({
          message: getErrorMessage(err.response?.data?.code),
          mode: 'error',
        });
      });
  }

  async function handleUpdatePlan() {
    setSelectedPlan(!selectedPlan);

    await axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/billing/subscriptions/update`,
        {
          price_lookup_key: priceLookupKey,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      )
      .then((res) => {
        router.push(res.data.data.redirect_url);
      })
      .catch((err) => {
        toast({
          message: getErrorMessage(err.response?.data?.code),
          mode: 'error',
        });
      });
  }

  const renderActionButton = () => {
    if (customPricing) {
      return (
        <Link
          href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
          className="btn btn-brand w-full no-underline"
        >
          Contact us
        </Link>
      );
    }

    if (planType === 'current') {
      return (
        <Button disabled className="w-full">
          Your current plan
        </Button>
      );
    }

    if (!planType) {
      // First time subscriber
      return (
        <Button
          disabled={subscribedTo}
          className="w-full"
          handleClick={handleSelectPlan}
        >
          {selectedPlan ? 'Selected' : `Subscribe to ${planName}`}
        </Button>
      );
    }

    // Existing subscriber changing plans
    return (
      <Button
        className="w-full"
        handleClick={handleUpdatePlan}
        variant={planType === 'downgrade' ? 'destructive' : 'default'}
      >
        {planType === 'upgrade'
          ? `Upgrade to ${planName}`
          : `Downgrade to ${planName}`}
      </Button>
    );
  };

  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-stroke-weak p-4">
      <span className="">{planName}</span>
      <span className="text-3xl font-bold text-typography-strong">
        {customPricing
          ? 'Custom'
          : `$${planPrice} / ${billingOptions[billingOption]}`}
      </span>
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
      {renderActionButton()}
    </div>
  );
}
