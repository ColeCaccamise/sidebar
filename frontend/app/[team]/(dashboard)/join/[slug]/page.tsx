'use client';

import Modal from '@/components/ui/modal';
import api from '@/lib/axios';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Spinner from '@/components/ui/spinner';
import Button from '@/components/ui/button';
import Logo from '@/components/ui/logo';
import { Invite } from '@/types';

export default function JoinPage() {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const params = useParams();
  const teamSlug = params.team;
  const slug = params.slug;

  async function submitInvite() {
    await api.post(`/teams/${teamSlug}/join/${slug}`, {});
  }

  useEffect(() => {
    const fetchInvite = async () => {
      setLoading(true);

      await api
        .get(`/teams/${teamSlug}/join/${slug}`)
        .then((res) => {
          console.log(res.data);
          setInvite(res.data);
          setInviteValid(true);
        })
        .catch((err) => {
          console.error(err.response.data);
          const response = err.response.data;

          setInviteValid(false);

          if (response?.data?.team_name) {
            setInvite(response.data);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    };
    fetchInvite();
  }, [teamSlug, slug]);

  if (loading) {
    return <Spinner />;
  }

  return (
    <>
      <Modal
        className="flex w-full max-w-md flex-col gap-8"
        open={true}
        setOpen={() => {}}
      >
        <div className="flex flex-col gap-2">
          <Logo />
          <h1>Join {invite?.data?.team_name}</h1>
          {invite?.data?.team_name ? (
            <p>
              You&apos;ve been invited to join the {invite?.data?.team_name}{' '}
              team.
            </p>
          ) : (
            <p>You&apos;ve been invited to join a team.</p>
          )}
        </div>

        {inviteValid && (
          <Button handleClick={submitInvite} className="w-full">
            Log in
          </Button>
        )}
      </Modal>
    </>
  );
}
