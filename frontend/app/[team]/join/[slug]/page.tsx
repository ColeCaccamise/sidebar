import { ApiResponse } from '@/types';
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
  async function fetchInvite(): Promise<{
    data: {
      active: boolean;
      team: {
        name: string;
        slug: string;
      };
      invite: {
        token: string;
        team_role: string;
      };
      user_exists: boolean;
    };
  } | null> {
    const response = await api
      .get(`/teams/${params.team}/join/${params.slug}`)
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        if (err.response?.data) {
          console.error('invite fetch failed:', err.response.data);
        } else {
          console.error('invite fetch failed:', err.message);
        }
        return null;
      });

    return response as {
      data: {
        active: boolean;
        team: {
          name: string;
          slug: string;
        };
        invite: {
          token: string;
          team_role: string;
        };
        user_exists: boolean;
      };
    };
  }

  async function verifyAuth() {
    const response = await api
      .get('/auth/verify')
      .then(() => {
        return true;
      })
      .catch(() => {
        return false;
      });
    return response;
  }

  async function verifyTeamMember() {
    const response = await api
      .get<ApiResponse>(`/teams/${params.team}/member`)
      .then((res) => {
        if (res.data.data.team_member.status === 'active') {
          return true;
        } else {
          return false;
        }
      })
      .catch(() => {
        return false;
      });
    return response;
  }

  const alreadyMember = await verifyTeamMember();
  const isAuthenticated = await verifyAuth();
  const invite = await fetchInvite();

  if (invite?.data.active) {
    redirect(`/${params.team}`);
  }

  if (alreadyMember) {
    redirect(`/${params.team}`);
  }

  // auto-accept invite if accept param is present
  if (searchParams.accept && invite && isAuthenticated) {
    try {
      await api.post(`/teams/${params.team}/join/${params.slug}/accept`);
      redirect(`/${params.team}/onboarding/welcome`);
    } catch (err) {
      console.error('error auto-accepting invite:', err);
    }
  }

  return (
    <JoinModal
      data={invite ? invite.data : undefined}
      isAuthenticated={isAuthenticated}
    />
  );
}
