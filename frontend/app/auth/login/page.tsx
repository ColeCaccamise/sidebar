'use client';

import { Button } from '@/components/ui/button';
import Input from '@/components/ui/input';
import axios from 'axios';
import toast from '@/lib/toast';
import Link from 'next/link';
import { RawApiResponse } from '@/types';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getErrorMessage } from '@/messages';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faGoogle } from '@fortawesome/free-brands-svg-icons';
import Divider from '@/components/ui/divider';
import getOauthUrl from '../actions';
import api from '@/lib/axios';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'confirm-email-token-invalid') {
      toast({
        message:
          'The confirmation link was invalid or has expired. Please login to request a new one.',
        mode: 'error',
      });
      router.replace('/auth/login');
    } else if (error === 'session_expired') {
      toast({
        message: getErrorMessage('session_expired'),
        mode: 'error',
      });
      router.replace('/auth/login');
    }

    const message = searchParams.get('message');
    if (message === 'email_updated') {
      toast({
        message:
          'Email updated successfully. You have been securely logged out of all devices.',
        mode: 'success',
      });
      router.replace('/auth/login');
    }
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        redirect: redirectUrl,
      });

      if (response.status === 200) {
        setEmailSent(true);
      }
    } catch (error) {
      console.log(error);
      if (axios.isAxiosError(error) && error.response) {
        const apiError = error.response.data as RawApiResponse;
        toast({
          message: getErrorMessage(apiError.code),
          mode: 'error',
        });
      } else {
        toast({
          message: getErrorMessage('internal_server_error'),
          mode: 'error',
        });
      }
    }

    setIsLoading(false);
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
        <h1>Sign in to Dashboard</h1>
        <div className="flex items-center gap-1">
          <p>Don&apos;t have an account?</p>
          <Link
            href={`/auth/signup${redirectUrl ? `?redirect=${redirectUrl}` : ''}`}
            className="flex items-center gap-1 no-underline"
          >
            Get started <ArrowRightIcon className="h-4 w-4" />
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
          >
            {isLoading ? 'Continuing...' : 'Continue with email'}
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
            onClick={async () => {
              const res = await getOauthUrl({
                provider: 'google',
                redirectUrl: redirectUrl || undefined,
              });
              if (res?.redirectUrl) {
                router.push(res.redirectUrl);
              } else {
                toast({
                  message: getErrorMessage(res.code || ''),
                  mode: 'error',
                });
              }
            }}
          >
            <span className="mr-1 flex items-center justify-center">
              <FontAwesomeIcon icon={faGoogle} />
            </span>
            Continue with Google
          </Button>
          <Button
            variant="unstyled"
            className="btn flex w-full border border-stroke-weak bg-fill"
            onClick={async () => {
              const res = await getOauthUrl({
                provider: 'github',
                redirectUrl: redirectUrl || undefined,
              });
              console.log(res);
              if (res?.redirectUrl) {
                router.push(res.redirectUrl);
              } else {
                toast({
                  message: getErrorMessage(res.code || ''),
                  mode: 'error',
                });
              }
            }}
          >
            <span className="mr-1 flex items-center justify-center">
              <FontAwesomeIcon icon={faGithub} />
            </span>
            Continue with GitHub
          </Button>
        </div>
      </div>

      <p className="text-muted">
        By signing in, you agree to the{' '}
        <Link href="/legal/terms">Terms of Service</Link> and{' '}
        <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>
    </>
  );
}
