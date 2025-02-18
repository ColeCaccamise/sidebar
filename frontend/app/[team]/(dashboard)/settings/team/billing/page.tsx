'use client';

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
  ExclamationTriangleIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';
import {
  CreditCardIcon,
  DollarSignIcon,
  DownloadIcon,
  LandmarkIcon,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAmazonPay } from '@fortawesome/free-brands-svg-icons';
import Dropdown from '@/components/ui/dropdown';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import api from '@/lib/axios';
import { TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tooltip } from '@/components/ui/tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Customer,
  Invoice,
  Plan,
  Subscription,
  TeamPaymentMethod,
} from '@/types';
import { ReactElement } from 'react';

function PaymentMethod({
  icon,
  name,
  id,
  isDefault,
  description,
  handleSetDefaultPaymentMethod,
  handleRemovePaymentMethod,
}: {
  icon: ReactElement;
  name: string;
  id: string;
  isDefault: boolean;
  description?: string;
  handleSetDefaultPaymentMethod: () => void;
  handleRemovePaymentMethod: () => void;
}) {
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
}

export default function BillingPage({ params }: { params: { team: string } }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const error = searchParams.get('error');
  const router = useRouter();

  const [changeBillingIntervalModalOpen, setChangeBillingIntervalModalOpen] =
    useState(false);
  const [selectedBillingInterval, setSelectedBillingInterval] = useState<
    'month' | 'year'
  >('month');
  const [addNewPaymentMethodModalOpen, setAddNewPaymentMethodModalOpen] =
    useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<TeamPaymentMethod[]>([]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/teams/${params.team}/billing/plans`, {
          withCredentials: true,
        });

        const sortedPlans = (res.data.data || []).sort(
          (a: { price: number }, b: { price: number }) => a.price - b.price,
        );
        setPlans(sortedPlans);
      } catch (err) {
        console.error('Error fetching plans: ', err);

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
  }, [params.team]);

  useEffect(() => {
    async function handleGetSubscription() {
      try {
        const res = await api.get(
          `/teams/${params.team}/billing/subscription`,
          {
            withCredentials: true,
          },
        );

        console.log(res.data.data);

        setSubscription(res.data.data.subscription);
        setSelectedBillingInterval(res.data.data.subscription?.interval);
      } catch (err) {
        console.error(err);
      }
    }

    handleGetSubscription();
  }, [params.team]);

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

  async function handleAddNewPaymentMethod() {
    await api
      .post(
        `/teams/${params.team}/billing/payment-methods`,
        {},
        {
          withCredentials: true,
        },
      )
      .then((res) => {
        router.push(res.data.data.redirect_url);
      });
  }

  useEffect(() => {
    async function getCustomer() {
      const res = await api.get(`/teams/${params.team}/billing/customer`, {
        withCredentials: true,
      });

      console.log(res.data.data.customer);

      setCustomer(res.data.data.customer);
    }

    getCustomer();
  }, [params.team]);

  async function handleUpdateBillingInterval(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setUpdateLoading(true);
    await api
      .patch(
        `/teams/${params.team}/billing/subscription/interval`,
        {
          interval: selectedBillingInterval,
        },
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
      })
      .finally(() => {
        setUpdateLoading(false);
      });
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
  }, [message, error, router]);

  useEffect(() => {
    async function fetchInvoices() {
      const res = await api.get(`/teams/${params.team}/billing/invoices`, {
        withCredentials: true,
      });

      console.log('invoices', res.data.data.data);

      setInvoices(res.data.data.data);
    }

    fetchInvoices();
  }, [params.team]);

  // const getPlanType = (planPrice: number) => {
  //   if (!subscription) return undefined;
  //   const currentPlanPrice = subscription.items.data[0].price.unit_amount;

  //   if (currentPlanPrice === planPrice) return 'current';
  //   if (planPrice > currentPlanPrice) return 'upgrade';
  //   return 'downgrade';
  // };

  function getPlanTypeText(planType: string) {
    if (planType === 'basic') return 'Basic Plan';
    if (planType === 'pro') return 'Pro Plan';
    if (planType === 'premium') return 'Premium Plan';
    return 'Unknown';
  }

  function getCurrentPlan(priceID: string) {
    console.log('price ID', priceID);
    return plans.find((plan) => plan.price_id === priceID);
  }

  function getCurrentPlanPrice(priceID: string) {
    const plan = getCurrentPlan(priceID);
    console.log(plan);
    return plan ? plan?.price / 100 : 0;
  }

  async function handleSetDefaultPaymentMethod(paymentMethodID: string) {
    await api
      .patch(
        `/teams/${params.team}/billing/payment-methods/default/${paymentMethodID}`,
        {},
        {
          withCredentials: true,
        },
      )
      .then((res) => {
        setCustomer(res.data.data);
        toast({
          message: 'Default payment method updated.',
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

  async function handleRemovePaymentMethod(paymentMethodID: string) {
    await api
      .delete(
        `/teams/${params.team}/billing/payment-methods/${paymentMethodID}`,
        {
          withCredentials: true,
        },
      )
      .then((res) => {
        setCustomer(res.data.data);
        toast({
          message: 'Payment method deleted.',
          mode: 'success',
        });
        setPaymentMethods(
          paymentMethods.filter((method) => method.id !== paymentMethodID),
        );
      })
      .catch((err) => {
        toast({
          message: getErrorMessage(err.response.data.code),
          mode: 'error',
        });
      });
  }

  return (
    <>
      {loading ? (
        <Spinner />
      ) : (
        <>
          {paymentMethods.length === 0 && (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-md border border-warning-stroke-weak bg-warning-fill px-4 py-2">
              <span className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-warning" />

                <span className="text-sm text-warning">
                  Your subscription benefits will be paused without an active
                  payment method.
                </span>
              </span>

              <Button
                variant="unstyled"
                className="btn-small bg-warning-fill text-sm text-warning"
                handleClick={handleAddNewPaymentMethod}
              >
                Add a payment method
              </Button>
            </div>
          )}
          <div className="flex w-full flex-col items-start gap-6 pb-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-bold">Billing </h1>
              <p className="text-typography-weak">
                Manage your team&apos;s billing information and invoices.
              </p>
            </div>

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
                        $
                        {getCurrentPlanPrice(
                          subscription?.stripe_price_id || '',
                        )}
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
                    className="btn-small btn-brand-secondary w-full text-sm lg:w-fit"
                    handleClick={() => setChangeBillingIntervalModalOpen(true)}
                  >
                    Change Billing Interval
                  </Button>
                  <Link
                    href={`/${params.team}/settings/team/plans`}
                    className="btn-small btn-brand h-fit w-full text-sm no-underline lg:w-fit"
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
                    <Button
                      handleClick={handleAddNewPaymentMethod}
                      className="btn-brand btn-small text-sm"
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
                        handleClick={handleAddNewPaymentMethod}
                      >
                        Add a payment method
                      </Button>
                    </div>
                  )}
                  {paymentMethods.map((method: TeamPaymentMethod) => {
                    if (method.card !== null) {
                      return (
                        <PaymentMethod
                          key={method.id}
                          icon={<CreditCardIcon />}
                          name={`${method.card.brand[0].toUpperCase()}${method.card.brand.slice(1).toLowerCase()} •••• ${method.card.last4}`}
                          id={method.id}
                          isDefault={
                            customer?.invoice_settings?.default_payment_method
                              ?.id === method.id
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
                          customer?.invoice_settings?.default_payment_method
                            ?.id === method.id
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
                            customer?.invoice_settings?.default_payment_method
                              ?.id === method.id
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
                            customer?.invoice_settings?.default_payment_method
                              ?.id === method.id
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
                                        invoice?.status_transitions?.paid_at *
                                          1000,
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
            <form
              className="flex flex-col gap-4"
              onSubmit={handleUpdateBillingInterval}
            >
              <div
                onClick={() => setSelectedBillingInterval('month')}
                className={`mt-4 flex w-full cursor-pointer flex-col gap-2 rounded-md border p-4 ${
                  selectedBillingInterval === 'month'
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
                  {selectedBillingInterval === 'month' && (
                    <CheckIcon className="h-4 w-4 text-brand" />
                  )}
                </div>
                <span className="text-sm text-typography-weak">$29/month</span>
              </div>

              <div
                onClick={() => setSelectedBillingInterval('year')}
                className={`flex w-full cursor-pointer flex-col gap-2 rounded-md border p-4 ${
                  selectedBillingInterval === 'year'
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
                  {selectedBillingInterval === 'year' && (
                    <CheckIcon className="h-4 w-4 text-typography-strong" />
                  )}
                </div>
                <span className="text-sm text-typography-weak">$279/year</span>
              </div>

              <div className="flex w-full flex-col gap-2">
                <Button
                  disabled={
                    subscription?.interval === selectedBillingInterval ||
                    updateLoading
                  }
                  type="submit"
                  className="w-full"
                >
                  {updateLoading ? (
                    <div className="flex items-center gap-2">
                      <Spinner variant="dark" />
                      <span className="text-background">Updating...</span>
                    </div>
                  ) : (
                    'Update'
                  )}
                </Button>
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
