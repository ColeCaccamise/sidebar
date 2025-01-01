'use client';

import PricingBox from '@/components/ui/pricing-box';
import axios from 'axios';
import toast from '@/lib/toast';
import { useEffect, useState } from 'react';
import Spinner from '@/components/ui/spinner';
import { useRouter, useSearchParams } from 'next/navigation';
import { getErrorMessage, getResponseMessage } from '@/messages';
import Button from '@/components/ui/button';
import { Plan, Subscription } from '@/types';

export default function BillingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const error = searchParams.get('error');
  const router = useRouter();

  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const planFeatures = {
    Basic: [
      {
        featureName: 'Email support',
        featureIncluded: true,
      },
      {
        featureName: '2 teams',
        featureIncluded: true,
      },
    ],
    Pro: [
      {
        featureName: 'Priority email support',
        featureIncluded: true,
      },
      {
        featureName: '5 teams',
        featureIncluded: true,
      },
    ],
    Premium: [
      {
        featureName: 'Private slack channel',
        featureIncluded: true,
      },
      {
        featureName: '10 teams',
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
        console.error(err);
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
    handleGetSubscription();
  }, []);

  async function handleOpenPortal() {
    await axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/billing/portal`,
        {},
        {
          withCredentials: true,
        },
      )
      .then((res) => {
        router.push(res.data.data.redirect_url);
      })
      .catch(() => {
        toast({
          message: 'Error opening portal',
          mode: 'error',
        });
      });
  }

  // async function handleCancelSubscription() {
  //   await axios
  //     .post(
  //       `${process.env.NEXT_PUBLIC_API_URL}/billing/subscriptions/cancel`,
  //       {},
  //       {
  //         withCredentials: true,
  //       },
  //     )
  //     .then((res) => {
  //       router.push(res.data.data.redirect_url);
  //     })
  //     .catch(() => {
  //       toast({
  //         message: getErrorMessage(err.response.data.code),
  //         mode: 'error',
  //       });
  //     });
  // }

  // async function handleRenewSubscription() {
  //   await axios
  //     .post(
  //       `${process.env.NEXT_PUBLIC_API_URL}/billing/subscriptions/renew`,
  //       {},
  //       {
  //         withCredentials: true,
  //       },
  //     )
  //     .then(() => {
  //       toast({
  //         message: 'Subscription renewed successfully',
  //         mode: 'success',
  //       });
  //     })
  //     .catch((err) => {
  //       toast({
  //         message: getErrorMessage(err.response.data.code),
  //         mode: 'error',
  //       });
  //     });
  // }

  // async function handleGetSubscription() {
  //   try {
  //     const res = await axios.get(
  //       `${process.env.NEXT_PUBLIC_API_URL}/billing/subscriptions`,
  //       {
  //         withCredentials: true,
  //       },
  //     );

  //     console.log(res.data.data);

  //     setSubscription(res.data.data.subscription);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // }

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
  }, [message, error, router]);

  const getPlanType = (planPrice: number) => {
    if (!subscription) return undefined;
    const currentPlanPrice = subscription.items.data[0].price.unit_amount;

    if (currentPlanPrice === planPrice) return 'current';
    if (planPrice > currentPlanPrice) return 'upgrade';
    return 'downgrade';
  };

  return (
    <>
      {loading ? (
        <Spinner />
      ) : (
        <div className="flex w-full flex-col justify-start gap-4">
          <div className="flex justify-between">
            <h1>Plans</h1>
            <Button
              className="no-underline"
              variant="link"
              handleClick={handleOpenPortal}
            >
              Manage subscription
            </Button>
          </div>

          <div className="flex w-full flex-col gap-4">
            {subscription?.cancel_at ? (
              <div className="flex w-full flex-col gap-2 rounded-md border border-stroke-weak p-4">
                <span className="text-lg font-medium">Subscription Status</span>
                <p>
                  Your subscription will end in{' '}
                  {(() => {
                    try {
                      if (!subscription?.cancel_at) return '0 days';
                      // Convert Unix timestamp (seconds) to milliseconds
                      const cancelDate = new Date(
                        subscription.cancel_at * 1000,
                      );
                      const daysLeft = Math.max(
                        Math.ceil(
                          (cancelDate.getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24),
                        ),
                        0,
                      );
                      return `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;
                    } catch (error) {
                      console.error(error);
                      return '0 days';
                    }
                  })()}
                </p>
                <Button
                  className="w-full"
                  handleClick={() => {
                    axios
                      .post(
                        `${process.env.NEXT_PUBLIC_API_URL}/billing/subscriptions/renew`,
                        {},
                        { withCredentials: true },
                      )
                      .then((res) => {
                        setSubscription(res.data.data.subscription);

                        toast({
                          message: 'Subscription renewed successfully',
                          mode: 'success',
                        });
                      })
                      .catch((err) => {
                        toast({
                          message: getErrorMessage(err.response?.data?.code),
                          mode: 'error',
                        });
                      });
                  }}
                >
                  Renew Subscription
                </Button>
              </div>
            ) : (
              ''
            )}
            <div className="flex w-full justify-between gap-4">
              {plans.map((plan: Plan) => (
                <PricingBox
                  key={plan.product_lookup_key}
                  planName={plan.name}
                  customPricing={false}
                  features={
                    planFeatures[plan.name as keyof typeof planFeatures]
                  }
                  planPrice={plan.price / 100}
                  billingOption={plan.interval}
                  priceLookupKey={plan.price_lookup_key}
                  planType={getPlanType(plan.price)}
                  handleSelectPlan={() => {}}
                  handleUpdatePlan={() => {}}
                />
              ))}
            </div>
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
