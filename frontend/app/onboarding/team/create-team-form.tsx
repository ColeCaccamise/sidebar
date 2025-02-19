'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from '@/lib/toast';
import { getErrorMessage, getResponseMessage } from '@/messages';
import axios from 'axios';
import Input from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Spinner from '@/components/ui/spinner';

export default function CreateTeamForm() {
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
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Input
        label="Team name"
        placeholder='E.g. "Your company"'
        value={teamName}
        handleChange={(e) => setTeamName(e.target.value)}
        type="text"
      />

      <Button type="submit" disabled={!teamName || loading} className="w-full">
        {loading ? (
          <p className="flex items-center gap-2">
            <Spinner variant="dark" />
            <span className="text-background">Creating...</span>
          </p>
        ) : (
          'Continue'
        )}
      </Button>
    </form>
  );
}
