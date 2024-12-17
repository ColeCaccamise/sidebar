'use client';

import PricingBox from '@/components/ui/pricing-box';
import axios from 'axios';
import toast from '@/lib/toast';
import { useEffect, useState } from 'react';
import Spinner from '@/components/ui/spinner';
import { useRouter, useSearchParams } from 'next/navigation';
import { getErrorMessage, getResponseMessage } from '@/messages';

export default function BillingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const error = searchParams.get('error');
  const router = useRouter();

  const planFeatures = {
    Basic: [
      {
        featureName: 'Email support',
        featureIncluded: true,
      },
    ],
    Pro: [
      {
        featureName: 'Priority email support',
        featureIncluded: true,
      },
    ],
    Premium: [
      {
        featureName: 'Private slack channel',
        featureIncluded: true,
      },
    ],
  };

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/billing/plans`,
          {
            withCredentials: true,
          },
        );

        const sortedPlans = (res.data.data || []).sort(
          (a: { price: number }, b: { price: number }) => a.price - b.price,
        );
        setPlans(sortedPlans);
      } catch (err) {
        toast({
          message: 'Error fetching plans',
          mode: 'error',
        });
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    if (message) {
      toast({
        message: getResponseMessage(message),
        mode: 'success',
      });

      router.push('/settings/billing');
    } else if (error) {
      toast({
        message: getErrorMessage(error),
        mode: 'error',
      });

      router.push('/settings/billing');
    }
  }, [message, error]);

  return (
    <>
      {loading ? (
        <Spinner />
      ) : (
        <div className="flex w-full flex-col justify-start gap-4">
          <h1>Plans</h1>

          <div className="flex w-full justify-between gap-4">
            {plans.map((plan: any) => (
              <PricingBox
                key={plan.product_id}
                planName={plan.name}
                customPricing={false}
                features={planFeatures[plan.name as keyof typeof planFeatures]}
                planPrice={plan.price / 100}
                billingOption={plan.interval}
                priceLookupKey={plan.price_lookup_key}
              />
            ))}
          </div>

          <div className="flex w-full justify-between gap-4">
            <PricingBox
              planName="Enterprise"
              customPricing={true}
              features={[
                {
                  featureName: 'Unlimited API calls',
                  featureIncluded: true,
                },
                {
                  featureName: '24/7 Priority email support',
                  featureIncluded: true,
                },
                {
                  featureName: 'Custom domain',
                  featureIncluded: true,
                },
                {
                  featureName: 'Priority support',
                  featureIncluded: true,
                },
                {
                  featureName: 'Private slack channel',
                  featureIncluded: true,
                },
                {
                  featureName: 'API rate limiting',
                  featureIncluded: true,
                },
                {
                  featureName: 'Advanced analytics',
                  featureIncluded: true,
                },
                {
                  featureName: 'Single sign-on',
                  featureIncluded: true,
                },
                {
                  featureName: 'Unlimited API calls',
                  featureIncluded: true,
                },
                {
                  featureName: 'Custom integrations',
                  featureIncluded: true,
                },
              ]}
            />
          </div>
        </div>
      )}
    </>
  );
}
