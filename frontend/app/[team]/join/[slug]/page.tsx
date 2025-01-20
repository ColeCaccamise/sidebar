import { Invite, TeamMember } from '@/types';
import api from '@/lib/api';
import JoinModal from './join-modal';
import { redirect } from 'next/navigation';

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: { team: string; slug: string };
  searchParams: { accept?: string };
}) {
  async function fetchInvite(): Promise<Invite | null> {
    const response = await api
      .get(`/teams/${params.team}/join/${params.slug}`)
      .then((res) => {
        return res.data as Invite;
      })
      .catch((err) => {
        if (err.response?.data) {
          console.error('invite fetch failed:', err.response.data);
        } else {
          console.error('invite fetch failed:', err.message);
        }
        return null;
      });

    return response;
  }

  async function verifyAuth() {
    const response = await api
      .get('/auth/verify')
      .then((res) => {
        return true;
      })
      .catch((err) => {
        console.error('auth verification failed:', err.message);
        return false;
      });
    return response;
  }

  async function verifyTeamMember() {
    const response = await api
      .get(`/teams/${params.team}/member`)
      .then((res) => {
        return true;
      })
      .catch((err) => {
        console.error('team member fetch failed:', err.message);
        return false;
      });
    return response;
  }

  const alreadyMember = await verifyTeamMember();
  const isAuthenticated = await verifyAuth();
  const invite = await fetchInvite();

  if (alreadyMember) {
    redirect(`/${params.team}`);
  }

  // auto-accept invite if accept param is present
  if (searchParams.accept && invite && isAuthenticated) {
    console.log('auto accepting invite');
  }

  if (invite) {
    return <JoinModal invite={invite} isAuthenticated={isAuthenticated} />;
  } else {
    return <div>Invite invalid or expired</div>;
  }
}
