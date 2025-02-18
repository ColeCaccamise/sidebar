'use client';

import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Logo from '@/components/ui/logo';
import toast from '@/lib/toast';
import { getErrorMessage, getResponseMessage } from '@/messages';
import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingTeamPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (teamName.length < 3) {
      toast({
        message: 'Team name must be at least 3 characters long',
        mode: 'error',
      });
      return;
    } else if (teamName.length > 32) {
      toast({
        message: 'Team name must be at most 32 characters long',
        mode: 'error',
      });
      return;
    }

    setLoading(true);

    await axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/teams`,
        {
          name: teamName,
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
          message: getResponseMessage(res.data.code),
          mode: 'success',
        });

        router.push(`/${res.data.data.slug}/onboarding/invite`);
      })
      .catch((err) => {
        toast({
          message: getErrorMessage(err.response.data.code),
          mode: 'error',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Logo />
        <h1>Create team</h1>
        <p>
          Create a new team to get started. This is where everything happens.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          label="Team name"
          placeholder='E.g. "Your company"'
          value={teamName}
          handleChange={(e) => setTeamName(e.target.value)}
          type="text"
        />

        <Button type="submit" disabled={!teamName} className="w-full">
          {loading ? 'Creating...' : 'Continue'}
        </Button>
      </form>
    </div>
  );
}
