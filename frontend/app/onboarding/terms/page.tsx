'use client';

import Button from '@/components/ui/button';
import toast from '@/lib/toast';
import { getErrorMessage, getResponseMessage } from '@/messages';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OnboardingTermsPage() {
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();
  async function handleAgree() {
    setAgreed(true);
    setLoading(true);

    await axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/users/accept-terms`,
        {
          terms_accepted: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      )
      .then((res) => {
        toast({
          message: getResponseMessage(res?.data?.code),
          mode: 'success',
        });

        router.push(res?.data?.redirect_url || '/onboarding/team');
      })
      .catch((err) => {
        toast({
          message: getErrorMessage(err.response?.data?.code),
          mode: 'error',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div className="flex max-w-md flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1>Terms of Service & Privacy Policy</h1>
        <p>
          By clicking below and continuing you agree that you've read and
          accepted our <Link href="/legal/terms">Terms of Service</Link> &{' '}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </div>
      <Button
        className="w-full"
        handleClick={handleAgree}
        loading={loading}
        disabled={loading || agreed}
      >
        {loading ? 'Agreeing...' : agreed ? 'Agreed' : 'Agree and continue'}
      </Button>
    </div>
  );
}
