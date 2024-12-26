'use client';

import PricingBox from '@/components/ui/pricing-box';
import axios from 'axios';
import toast from '@/lib/toast';
import { useEffect, useState } from 'react';
import Spinner from '@/components/ui/spinner';
import { useRouter, useSearchParams } from 'next/navigation';
import { getErrorMessage, getResponseMessage } from '@/messages';
import Link from 'next/link';
import Divider from '@/components/ui/divider';
import Modal from '@/components/ui/modal';
import {
  ClockIcon,
  DotsHorizontalIcon,
  CheckIcon,
} from '@radix-ui/react-icons';
import { CreditCardIcon, DownloadIcon } from 'lucide-react';
import Dropdown from '@/components/ui/dropdown';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';

export default function BillingPage({ params }: { params: { team: string } }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const error = searchParams.get('error');
  const router = useRouter();

  const [changeBillingIntervalModalOpen, setChangeBillingIntervalModalOpen] =
    useState(false);
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<
    'monthly' | 'yearly'
  >('monthly');
  const [addNewPaymentMethodModalOpen, setAddNewPaymentMethodModalOpen] =
    useState(false);
  const [subscription, setSubscription] = useState<any>(null);

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

  const [paymentMethods, setPaymentMethods] = useState([
    {
      name: 'Visa ending in 1234',
      expires: '01/25',
      default: true,
    },
    {
      name: 'Mastercard ending in 5678',
      expires: '02/26',
      default: false,
    },
  ]);

  const [invoices, setInvoices] = useState([
    {
      amount: 49,
      date: 'November 7th, 2024',
    },
    {
      amount: 49,
      date: 'December 7th, 2024',
    },
  ]);

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
    handleGetSubscription();
  }, []);

  async function handleOpenPortal() {
    const res = await axios
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
      .catch((err) => {
        toast({
          message: 'Error opening portal',
          mode: 'error',
        });
      });
  }

  async function handleCancelSubscription() {
    const res = await axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/billing/subscriptions/cancel`,
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
          message: getErrorMessage(err.response.data.code),
          mode: 'error',
        });
      });
  }

  async function handleRenewSubscription() {
    const res = await axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/billing/subscriptions/renew`,
        {},
        {
          withCredentials: true,
        },
      )
      .then((res) => {
        toast({
          message: 'Subscription renewed successfully',
          mode: 'success',
        });
      })
      .catch((err) => {
        toast({
          message: getErrorMessage(err.response.data.code),
          mode: 'error',
        });
      });
  }

  async function handleGetSubscription() {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/billing/subscriptions`,
        {
          withCredentials: true,
        },
      );

      console.log(res.data.data);

      setSubscription(res.data.data.subscription);
    } catch (err) {
      console.error(err);
    }
  }

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
        <>
          <div className="flex w-full flex-col items-start gap-6 pb-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-bold">Billing </h1>
              <p className="text-typography-weak">
                Manage your team's billing information and invoices.
              </p>
            </div>

            <div className="flex w-full flex-col gap-6">
              <div className="flex w-full flex-row items-center justify-between gap-4 rounded-md border border-stroke-weak px-6 py-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4">
                    <span className="text-lg font-bold text-typography-strong">
                      Current Plan
                    </span>
                    <div className="flex flex-col gap-2">
                      <span className="text-typography-strong">Pro Plan</span>
                      <span>$29/month, billed monthly</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-typography-weak" />
                    <span>
                      Renews on <span className="">January 7, 2025</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-row items-center gap-2">
                  <Button
                    className="btn-small btn-brand-secondary text-sm"
                    handleClick={() => setChangeBillingIntervalModalOpen(true)}
                  >
                    Change Billing Interval
                  </Button>
                  <Link
                    href={`/${params.team}/settings/team/plans`}
                    className="btn-small btn-brand h-fit text-sm no-underline"
                  >
                    Change Plan
                  </Link>
                </div>
              </div>

              <div className="flex w-full flex-row items-center justify-between gap-4 rounded-md border border-stroke-weak px-6 py-4">
                <div className="flex w-full flex-col gap-4">
                  <div className="flex flex-row items-center justify-between gap-4">
                    <span className="text-lg font-bold text-typography-strong">
                      Payment Methods
                    </span>
                    <Button className="btn-brand btn-small text-sm">
                      Add New
                    </Button>
                  </div>
                  {paymentMethods.map((method) => (
                    <div
                      key={method.name}
                      className="flex w-full flex-row justify-between gap-2 py-2"
                    >
                      <div className="flex w-full flex-row items-center justify-between">
                        <div className="flex flex-row items-center gap-4">
                          <CreditCardIcon className="h-5 w-5 text-typography-weak" />
                          <div className="flex flex-col">
                            <div className="flex flex-row items-center gap-2">
                              <span className="text-sm text-typography-strong">
                                {method.name}
                              </span>
                              {method.default && (
                                <span className="rounded-md bg-fill-solid px-2 py-1 text-xs text-typography-weak">
                                  Default
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-typography-weak">
                              Expires {method.expires}
                            </span>
                          </div>
                        </div>
                        <div className="w-8">
                          <Dropdown
                            position={'right'}
                            showIcon={false}
                            menuItems={[
                              {
                                disabled: method.default,
                                label: 'Set as default',
                                handleClick: () => {},
                              },
                              {
                                label: 'Remove',
                                handleClick: () => {},
                                destructive: true,
                              },
                            ]}
                          >
                            <DotsHorizontalIcon className="h-4 w-4 text-typography-weak" />
                          </Dropdown>
                        </div>
                      </div>
                    </div>
                  ))}
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
                                      ${invoice.amount}
                                    </span>
                                  </div>
                                  <span className="text-sm text-typography-weak">
                                    {invoice.date}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <Button
                                  variant="unstyled"
                                  className="text-sm no-underline"
                                  onClick={() =>
                                    handleDownloadInvoice(invoice.id)
                                  }
                                >
                                  Download
                                </Button>
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

          {/* change billing interval modal -- desugb two vertical boxes like apple website showing monthly and yearl with yearly having a green save 20% box */}
          <Modal
            title="Change Billing Interval"
            open={changeBillingIntervalModalOpen}
            setOpen={setChangeBillingIntervalModalOpen}
            className="w-full"
          >
            <form className="flex flex-col gap-4">
              <div
                onClick={() => setSelectedBillingInterval('monthly')}
                className={`mt-4 flex w-full cursor-pointer flex-col gap-2 rounded-md border p-4 ${
                  selectedBillingInterval === 'monthly'
                    ? 'border-stroke-medium bg-fill-solid'
                    : 'border-stroke-weak hover:bg-fill'
                }`}
              >
                <div className="flex flex-row items-center justify-between">
                  <div className="flex flex-row items-center gap-2">
                    <span className="text-sm font-bold text-typography-strong">
                      Monthly Billing
                    </span>
                  </div>
                  {selectedBillingInterval === 'monthly' && (
                    <CheckIcon className="h-4 w-4 text-brand" />
                  )}
                </div>
                <span className="text-sm text-typography-weak">$29/month</span>
              </div>

              <div
                onClick={() => setSelectedBillingInterval('yearly')}
                className={`flex w-full cursor-pointer flex-col gap-2 rounded-md border p-4 ${
                  selectedBillingInterval === 'yearly'
                    ? 'border-stroke-medium bg-fill-solid'
                    : 'border-stroke-weak hover:bg-fill'
                }`}
              >
                <div className="flex flex-row items-center justify-between">
                  <div className="flex flex-row items-center gap-2">
                    <span className="text-sm font-bold text-typography-strong">
                      Yearly Billing
                    </span>
                    <span className="rounded-md bg-success-fill px-2 py-1 text-xs text-typography-weak">
                      Save 20%
                    </span>
                  </div>
                  {selectedBillingInterval === 'yearly' && (
                    <CheckIcon className="h-4 w-4 text-typography-strong" />
                  )}
                </div>
                <span className="text-sm text-typography-weak">$279/year</span>
              </div>
            </form>
          </Modal>

          {/* add new payment method modal */}
          <Modal
            title="Add new payment method"
            open={addNewPaymentMethodModalOpen}
            setOpen={setAddNewPaymentMethodModalOpen}
          >
            <form className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-typography-strong">
                  Card number
                </span>
                <Input type="text" placeholder="1234 1234 1234 1234" />
              </div>
            </form>
          </Modal>
        </>
      )}
    </>
  );
}
