'use client';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import axios from 'axios';
import toast from '@/lib/toast';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { getErrorMessage } from '@/messages';
import api from '@/lib/axios';
import Divider from '@/components/ui/divider';
import getOauthUrl from '../actions';

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    if (!email) {
      toast({
        message: 'Email is required',
        mode: 'error',
      });
      return;
    }

    setIsLoading(true);

    await api
      .post(
        '/auth/signup',
        { email, redirect: redirectUrl || undefined },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      )
      .then(() => {
        setEmailSent(true);
      })
      .catch((error) => {
        if (axios.isAxiosError(error) && error.response) {
          toast({
            message: getErrorMessage(error.response.data.code),
            mode: 'error',
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  if (emailSent) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h1>Check your email</h1>
          <div className="flex flex-col gap-2">
            <p>We&apos;ve sent a temporary login link.</p>
            <p>
              Please check your inbox at{' '}
              <b className="text-typography-strong">{email}</b>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1>Get started with Dashboard</h1>
        <div className="flex items-center gap-1">
          <p>Already have an account?</p>
          <Link
            href={`/auth/login${redirectUrl ? `?redirect=${redirectUrl}` : ''}`}
            className="flex items-center gap-1 no-underline"
          >
            Sign in <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="flex w-full flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Input
            label="Enter your email"
            type="email"
            name="email"
            placeholder="name@company.com"
            required
            value={email}
            handleChange={(e) => setEmail(e.target.value)}
          />

          <Button
            className="w-full"
            type="submit"
            disabled={isLoading || !email}
            loading={isLoading}
          >
            Continue with email
          </Button>
        </form>
        <span className="flex items-center gap-2">
          <Divider />
          <span className="px-2 text-xs text-typography-muted">OR</span>
          <Divider />
        </span>
        <div className="flex flex-col gap-2">
          <Button
            variant="unstyled"
            className="btn flex w-full border border-stroke-weak bg-fill"
            handleClick={async () => {
              const res = await getOauthUrl({ provider: 'google' });
              if (res.redirectUrl) {
                router.push(res.redirectUrl);
              } else {
                toast({
                  message: getErrorMessage(res.code || ''), // Provide empty string fallback
                  mode: 'error',
                });
              }
            }}
          >
            <span className="mr-2">
              <FontAwesomeIcon icon={faGoogle} />
            </span>
            Continue with Google
          </Button>
          <Button
            variant="unstyled"
            className="btn flex w-full border border-stroke-weak bg-fill"
            handleClick={async () => {
              const res = await getOauthUrl({
                provider: 'github',
                redirectUrl: redirectUrl || undefined,
              });
              if (res.redirectUrl) {
                router.push(res.redirectUrl);
              } else {
                toast({
                  message: getErrorMessage(res.code || ''),
                  mode: 'error',
                });
              }
            }}
          >
            <span className="mr-2">
              <FontAwesomeIcon icon={faGithub} />
            </span>
            Continue with GitHub
          </Button>
        </div>
      </div>

      <p className="text-muted">
        By signing up, you agree to the{' '}
        <Link href="/legal/terms">Terms of Service</Link> and{' '}
        <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>
    </>
  );
}
