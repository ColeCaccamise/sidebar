'use client';

import Button from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import Input from '@/components/ui/input';
import Modal from '@/components/ui/modal';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PricingBox from '@/components/ui/pricing-box';
import { Switch } from '@/components/ui/switch';
import api from '@/lib/axios';
import Spinner from '@/components/ui/spinner';
import { getErrorMessage } from '@/messages';
import toast from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Plan, Subscription, TeamPaymentMethod } from '@/types';

export default function PlansPage({ params }: { params: { team: string } }) {
  const searchParams = useSearchParams();
  const [showOther, setShowOther] = useState(false);
  const [checkedReasons, setCheckedReasons] = useState({
    features: false,
    team: false,
    support: false,
    other: false,
  });
  const [otherReason, setOtherReason] = useState('');
  const [open, setOpen] = useState(searchParams.get('success') === 'true');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [billingOption, setBillingOption] = useState('year');
  const [loading, setLoading] = useState(true);
  const planDescriptions = {
    basic_monthly:
      'For individuals and small teams looking for essential connectivity and access management features.',
    basic_annually:
      'For individuals and small teams looking for essential connectivity and access management features.',
    pro_monthly:
      'For teams or organizations looking for a secure, zero-trust connectivity replacement of legacy VPNs.',
    pro_annually:
      'For teams or organizations looking for a secure, zero-trust connectivity replacement of legacy VPNs.',
    premium_monthly:
      'For companies who need service and resource level authentication and access control.',
    premium_annually:
      'For companies who need service and resource level authentication and access control.',
  };

  function planFeatures(priceLookupKey: string) {
    if (
      priceLookupKey === 'basic_monthly' ||
      priceLookupKey === 'basic_annually'
    ) {
      return [
        { featureName: 'Up to 5 team members', featureIncluded: true },
        { featureName: 'Basic access controls', featureIncluded: true },
        { featureName: 'Standard support', featureIncluded: true },
        { featureName: 'Activity logging', featureIncluded: true },
        { featureName: 'Advanced security features', featureIncluded: false },
        { featureName: 'Custom integrations', featureIncluded: false },
      ];
    }

    if (priceLookupKey === 'pro_monthly' || priceLookupKey === 'pro_annually') {
      return [
        { featureName: 'Up to 20 team members', featureIncluded: true },
        { featureName: 'Advanced access controls', featureIncluded: true },
        { featureName: 'Priority support', featureIncluded: true },
        { featureName: 'Advanced activity logging', featureIncluded: true },
        { featureName: 'Basic security features', featureIncluded: true },
        { featureName: 'Basic integrations', featureIncluded: true },
        { featureName: 'Custom branding', featureIncluded: false },
        { featureName: 'Enterprise features', featureIncluded: false },
      ];
    }

    if (
      priceLookupKey === 'premium_monthly' ||
      priceLookupKey === 'premium_annually'
    ) {
      return [
        { featureName: 'Unlimited team members', featureIncluded: true },
        { featureName: 'Enterprise access controls', featureIncluded: true },
        { featureName: '24/7 dedicated support', featureIncluded: true },
        { featureName: 'Advanced security features', featureIncluded: true },
        { featureName: 'Custom integrations', featureIncluded: true },
        { featureName: 'Custom branding', featureIncluded: true },
        { featureName: 'Advanced analytics', featureIncluded: true },
        { featureName: 'SLA guarantees', featureIncluded: true },
      ];
    }

    return [];
  }

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<TeamPaymentMethod[]>([]);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);

    async function fetchPlans() {
      await api
        .get(`/teams/${params.team}/billing/plans`, {
          withCredentials: true,
        })
        .then((res) => {
          console.log(res.data.data);
          setPlans(res.data.data);
        })
        .catch((err) => {
          console.log(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }

    fetchPlans();
  }, [params.team]);

  useEffect(() => {
    async function fetchSubscription() {
      await api
        .get(`/teams/${params.team}/billing/subscription`, {
          withCredentials: true,
        })
        .then((res) => {
          const sub = res?.data?.data?.subscription;

          setSubscription(sub);
          setBillingOption(sub?.interval || 'year');
        })
        .catch((err) => {
          setSubscription(null);
          console.log(err.response?.data);
        });
    }

    fetchSubscription();
  }, [params.team]);

  async function handleSelectPlan(priceLookupKey: string) {
    setSelectedPlan(!selectedPlan);

    await api
      .post(
        `/teams/${params.team}/billing/checkout`,
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

  async function handleUpdatePlan(priceLookupKey: string) {
    await api
      .post(
        `/teams/${params.team}/billing/subscription/update`,
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

  async function handleManageSubscription() {
    await api
      .post(
        `/teams/${params.team}/billing/portal`,
        {},
        {
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

  const planMappings = {
    basic_monthly: 'basic',
    basic_annually: 'basic',
    pro_monthly: 'pro',
    pro_annually: 'pro',
    premium_monthly: 'premium',
    premium_annually: 'premium',
  };

  const intervalMappings = {
    basic_monthly: 'month',
    basic_annually: 'year',
    pro_monthly: 'month',
    pro_annually: 'year',
    premium_monthly: 'month',
    premium_annually: 'year',
  };

  const planHierarchy = {
    basic: 1,
    pro: 2,
    premium: 3,
  };

  function getPlanType(subscription: Subscription, priceLookupKey: string) {
    if (!subscription || !priceLookupKey) {
      return null;
    }

    const planType = planMappings[priceLookupKey as keyof typeof planMappings];
    const interval =
      intervalMappings[priceLookupKey as keyof typeof intervalMappings];

    if (subscription.plan_type === planType) {
      if (subscription.interval === interval) {
        return 'current';
      } else {
        return 'switch';
      }
    } else if (
      planHierarchy[planType as keyof typeof planHierarchy] >
      planHierarchy[subscription.plan_type as keyof typeof planHierarchy]
    ) {
      return 'upgrade';
    } else {
      return 'downgrade';
    }
  }

  async function handleUpdatePaymentMethod() {
    await api
      .post(
        `/teams/${params.team}/billing/payment-methods`,
        {},
        { withCredentials: true },
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

  useEffect(() => {
    async function fetchPaymentMethods() {
      const res = await api.get(
        `/teams/${params.team}/billing/payment-methods`,
        {
          withCredentials: true,
        },
      );

      console.log(res.data.data.data);
      setPaymentMethods(res.data.data.data);
    }

    fetchPaymentMethods();
  }, [params.team]);

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="w-full pb-8">
      {paymentMethods.length === 0 && (
        <div className="mb-8 flex items-center justify-between gap-2 rounded-md border border-warning-stroke-weak bg-warning-fill px-4 py-2">
          <span className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-warning" />

            <span className="text-sm text-warning">
              Your trial has ended. Add a payment method to restore access.
            </span>
          </span>

          <Button
            variant="unstyled"
            className="btn-small bg-warning-fill text-sm text-warning"
            handleClick={handleUpdatePaymentMethod}
          >
            Update payment method
          </Button>
        </div>
      )}
      <div className="flex w-full flex-col items-start gap-8">
        {subscription ? (
          <>
            <h1 className="text-xl font-bold">Review your plan</h1>
            <div className="flex w-full flex-col items-start justify-between gap-8">
              <div className="flex w-full justify-between gap-2">
                <Button
                  variant="unstyled"
                  className="text-typography-strong"
                  handleClick={handleUpdatePaymentMethod}
                >
                  Update payment method
                </Button>
                <Button
                  variant="unstyled"
                  className="text-typography-strong"
                  handleClick={handleManageSubscription}
                >
                  Manage subscription
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div>
            <h1 className="text-xl font-bold">Select a plan</h1>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span>Bill Monthly</span>
          <Switch
            checked={billingOption === 'year'}
            onCheckedChange={() =>
              setBillingOption(billingOption === 'year' ? 'month' : 'year')
            }
          />
          <span>Bill Yearly</span>
          <span className="rounded-md bg-success-fill px-2 py-1 text-xs font-bold text-success">
            Save up to 20%
          </span>
        </div>
        {plans.length > 0 && (
          <div className="flex h-full w-full flex-col gap-4 xl:flex-row">
            {plans
              .filter((plan) => plan.interval === billingOption)
              .sort((a, b) => a.price - b.price)
              .map((plan) => (
                <PricingBox
                  key={plan.price_id}
                  planName={plan.name}
                  planDescription={
                    planDescriptions[
                      plan.price_lookup_key as keyof typeof planDescriptions
                    ]
                  }
                  planPrice={
                    billingOption === 'year'
                      ? plan.price / 100 / 12
                      : plan.price / 100
                  }
                  features={planFeatures(plan.price_lookup_key)}
                  currentBillingOption={billingOption as 'month' | 'year'}
                  billingOption={billingOption as 'month' | 'year'}
                  priceLookupKey={plan.price_lookup_key}
                  handleSelectPlan={handleSelectPlan}
                  handleUpdatePlan={handleUpdatePlan}
                  subscribedTo={
                    subscription?.stripe_price_lookup_key ===
                    plan.price_lookup_key
                  }
                  planType={
                    subscription
                      ? getPlanType(subscription, plan.price_lookup_key) ||
                        undefined
                      : undefined
                  }
                  highlight={
                    (subscription &&
                      getPlanType(subscription, plan.price_lookup_key) ===
                        'upgrade') ||
                    undefined
                  }
                  trialInProgress={
                    subscription?.trial_end
                      ? new Date(subscription.trial_end) > new Date()
                      : false
                  }
                />
              ))}
          </div>
        )}
        {plans.length > 0 && (
          <div className="flex w-full flex-col gap-2">
            <div className="bg-background-strong flex w-full flex-col items-center gap-8 rounded-md border border-stroke-weak p-6 xl:flex-row">
              <div className="flex w-full flex-col gap-2">
                <h3 className="text-xl font-medium text-typography-strong">
                  Enterprise
                </h3>
                <p className="text-sm text-typography-weak">
                  Need a custom solution? Contact our sales team for enterprise
                  pricing and features.
                </p>
              </div>
              <Link
                href={`mailto:${process.env.NEXT_PUBLIC_SALES_EMAIL}`}
                className="btn btn-brand-secondary w-full no-underline xl:w-full xl:max-w-fit"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        )}

        <div className="w-full">
          <p className="text-sm">
            For questions about billing,{' '}
            <Link
              href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
              className="text-typography-strong no-underline"
            >
              please contact us
            </Link>
            .
          </p>
        </div>
      </div>

      {/* success modal */}
      <Modal
        canClose={false}
        open={open}
        setOpen={setOpen}
        title="Plan upgraded to Pro!"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            console.log('submitted', checkedReasons);
            setOpen(false);
            // Clear success param from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('success');
            window.history.replaceState({}, '', url);
          }}
          className="flex flex-col items-center justify-center gap-4"
        >
          <p>
            Thank you for upgrading. What was the main reason for your upgrade?
          </p>
          <div className="flex w-full flex-col gap-2">
            <label className="flex items-center gap-2">
              <Checkbox
                id="features"
                checked={checkedReasons.features}
                onCheckedChange={(checked) =>
                  setCheckedReasons((prev) => ({
                    ...prev,
                    features: checked === true,
                  }))
                }
              />
              <span>Needed more features</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                id="team"
                checked={checkedReasons.team}
                onCheckedChange={(checked) =>
                  setCheckedReasons((prev) => ({
                    ...prev,
                    team: checked === true,
                  }))
                }
              />
              <span>Growing team size</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                id="support"
                checked={checkedReasons.support}
                onCheckedChange={(checked) =>
                  setCheckedReasons((prev) => ({
                    ...prev,
                    support: checked === true,
                  }))
                }
              />
              <span>Better support options</span>
            </label>
            <label className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="other"
                  checked={checkedReasons.other}
                  onCheckedChange={(checked) => {
                    setCheckedReasons((prev) => ({
                      ...prev,
                      other: checked === true,
                    }));
                    setShowOther(checked === true);
                  }}
                />
                <span>Other</span>
              </div>
              {showOther && (
                <Input
                  placeholder="Please specify..."
                  type="textarea"
                  variant="textarea"
                  value={otherReason}
                  handleChange={(e) => setOtherReason(e.target.value)}
                />
              )}
            </label>
          </div>
          <Button
            className="btn-small btn-brand-secondary w-full"
            type="submit"
            disabled={
              !Object.values(checkedReasons).some(Boolean) ||
              (checkedReasons.other && !otherReason.trim())
            }
          >
            Submit
          </Button>
        </form>
      </Modal>

      {/* confirmation modal */}
      <Modal
        canClose={true}
        open={confirmationOpen}
        setOpen={setConfirmationOpen}
        title="Downgrade to Basic"
      >
        <form className="flex flex-col items-end justify-center gap-6 pt-6">
          <p>
            Some features available on the Pro plan are not available on the
            Free plan. Compare plans before making the change.
          </p>

          <div className="flex gap-4">
            <Button className="btn-small btn-brand-secondary w-full">
              Cancel
            </Button>
            <Button className="btn-small btn-destructive w-full">
              Confirm downgrade
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
