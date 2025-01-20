'use client';

import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { Invite } from '@/types';
import Link from 'next/link';
import { UsersIcon } from 'lucide-react';
import { ExternalLinkIcon } from '@radix-ui/react-icons';

export default function JoinModal({
  invite,
  isAuthenticated,
}: {
  invite: Invite;
  isAuthenticated: boolean;
}) {
  function getTeamRoleLanguage(role: string) {
    if (role === 'member') {
      return 'a member';
    } else if (role === 'admin') {
      return 'an admin';
    } else if (role === 'owner') {
      return 'an owner';
    } else {
      return null;
    }
  }

  const team = invite.data.team;
  const role = invite.data.invite.team_role;

  return (
    <Modal open={true} showCancelButton={false} className="w-full max-w-md">
      <div className="flex flex-col gap-4">
        <UsersIcon className="h-8 w-8" />
        <h1 className="text-xl font-bold">Join {team.name}</h1>
        <p>
          You've been invited to join as {getTeamRoleLanguage(role)} of the
          team.
        </p>

        <div className="flex flex-col gap-2">
          {isAuthenticated ? (
            <Button className="w-full">Join Team</Button>
          ) : (
            <Link
              className="btn btn-brand flex w-full items-center gap-1 no-underline"
              href={`/auth/login?next=/${team.slug}/join/${invite.data.invite.token}`}
            >
              Sign in to Join Team <ExternalLinkIcon className="h-4 w-4" />
            </Link>
          )}
          <p className="text-sm">
            <span>By joining, you agree to our</span>{' '}
            <Link href="/terms">Terms of Service</Link> <span>and</span>{' '}
            <Link href="/privacy">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </Modal>
  );
}
