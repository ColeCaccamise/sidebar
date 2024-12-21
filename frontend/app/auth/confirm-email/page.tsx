'use client';

import Button from '@/components/ui/button';
import toast from '@/lib/toast';
import Link from 'next/link';
import Divider from '@/components/ui/divider';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Spinner from '@/components/ui/spinner';
import { handleResendEmail } from './actions';
import axios from 'axios';
import { EnvelopeClosedIcon } from '@radix-ui/react-icons';
import { getErrorMessage } from '@/messages';
import { useRouter } from 'next/navigation';
export default function ConfirmEmailPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [noCookie, setNoCookie] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    setIsLoading(false);
  }, [searchParams]);

  useEffect(() => {
    const error = searchParams.get('error');
    console.log(error);
    if (error) {
      toast({
        message: getErrorMessage(error),
        mode: 'error',
      });
    }
  }, [searchParams]);

  useEffect(() => {
    async function getIdentity() {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/identity`,
          {
            withCredentials: true,
          },
        );
        if (response.data.email) {
          setEmail(response.data.email);
        }
      } catch (error) {
        if (!email) {
          setNoCookie(true);
        }

        router.push('/auth/login');
      }
    }

    if (!email) {
      getIdentity();
    }
  }, [email]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-12 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-12">
            <span>
              <EnvelopeClosedIcon className="h-8 w-8" />
            </span>
            <h1>Let&apos;s verify your email</h1>
          </div>
          <p>
            Check
            {email ? (
              <>
                <strong> {email} </strong>
              </>
            ) : (
              ' your email '
            )}
            to verify your account and get started.
          </p>
        </div>
        <p>
          Need help?{' '}
          <Link
            className="no-underline"
            href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
          >
            Contact support
          </Link>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm">
          {!noCookie ? (
            <Button
              handleClick={() =>
                handleResendEmail()
                  .then(() =>
                    toast({
                      message: 'Email resent',
                      mode: 'success',
                    }),
                  )
                  .catch(() => {
                    setNoCookie(true);
                    toast({
                      message:
                        'We could not verify your identity. Please log in and try again.',
                      mode: 'error',
                    });
                  })
              }
              variant="link"
            >
              Resend email
            </Button>
          ) : (
            <Link href="/auth/login">Login instead</Link>
          )}
        </p>
      </div>
    </div>
  );
}
