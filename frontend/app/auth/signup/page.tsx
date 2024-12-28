'use client';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import axios from 'axios';
import toast from '@/lib/toast';
import Link from 'next/link';
import { ApiError } from '@/types';
import Divider from '@/components/ui/divider';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardIcon } from '@radix-ui/react-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { getErrorMessage } from '@/messages';

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/signup`,
        { email, password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      );

      if (response.status === 200) {
        toast({
          message: 'Account created successfully',
          mode: 'success',
        });
        router.push(response.data.redirect_url);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const apiError = error.response.data as ApiError;
        toast({
          message: apiError.error,
          mode: 'error',
        });
      } else {
        toast({
          message: 'An unexpected error occurred',
          mode: 'error',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="py-4">
          <DashboardIcon className="h-8 w-8" />
        </span>
        <h1>Create a new Dashboard account</h1>
        <p>Free for 14 days &mdash; no credit card required.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="unstyled"
          className="btn flex w-full border border-stroke-weak bg-fill"
          disabled={true}
        >
          <span className="mr-2">
            <FontAwesomeIcon icon={faGoogle} />
          </span>
          Sign up with Google
        </Button>
      </div>

      <span className="text-center">OR</span>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Input
          value={email}
          handleChange={(e) => setEmail(e.target.value)}
          label="Work email address"
          type="email"
          name="email"
          placeholder="name@company.com"
          required
        />
        <Input
          value={password}
          handleChange={(e) => setPassword(e.target.value)}
          label="Password"
          type="password"
          name="password"
          placeholder="Minimum 8 characters, make it strong"
          required
        />
        <Button
          className="w-full"
          type="submit"
          disabled={isLoading || !email || !password}
        >
          {isLoading ? 'Loading...' : 'Sign up with email'}
        </Button>

        <div className="text-center">
          <Link className="no-underline" href="/auth/login">
            or login instead
          </Link>
        </div>
      </form>
    </div>
  );
}
