'use client';

import Button from '@/components/ui/button';
import api from '@/lib/axios';
import toast from '@/lib/toast';
import { TeamInvite } from '@/types';
import { useRouter } from 'next/navigation';

export default function AcceptInviteForm({ data }: { data: TeamInvite }) {
  const router = useRouter();

  async function handleAccept() {
    if (!data?.team_slug || !data?.slug) {
      console.error(data);
      return;
    }

    try {
      const response = await api.post(
        `/teams/${data.team_slug}/join/${data.slug}/accept`,
        {},
      );

      console.log('response', response);

      router.push(`/${data.team_slug}/onboarding/welcome`);

      toast({
        message: 'Invite accepted',
        mode: 'success',
      });
    } catch (error) {
      console.error('Error accepting invite', error);

      toast({
        message: 'Error accepting invite',
        mode: 'error',
      });
    }
  }
  async function handleDecline() {
    if (!data?.team_slug || !data?.slug) {
      console.error(data);
      return;
    }

    try {
      await api.post(`/teams/${data.team_slug}/join/${data.slug}/decline`);

      toast({
        message: 'Invite declined',
        mode: 'success',
      });
    } catch (error) {
      console.error('Error declining invite', error);

      toast({
        message: 'Error declining invite',
        mode: 'error',
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button className="w-full" handleClick={handleAccept}>
        Join Team
      </Button>
      <Button
        className="btn w-full justify-center text-center"
        variant="unstyled"
        handleClick={handleDecline}
      >
        Decline
      </Button>
    </div>
  );
}
