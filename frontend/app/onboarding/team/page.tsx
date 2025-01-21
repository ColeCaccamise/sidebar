import Logo from '@/components/ui/logo';
import CreateTeamForm from './create-team-form';
import api from '@/lib/api';
import { ListInvitesResponse } from '@/types';

export default async function OnboardingTeamPage() {
  async function listInvites() {
    try {
      const response = await api.get<ListInvitesResponse>('/users/invites');
      console.log(response.data);
      return response.data.data.invites;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  const invites = await listInvites();
  const latestInvite = invites?.sort(
    (a, b) =>
      new Date(b.data.invite.created_at).getTime() -
      new Date(a.data.invite.created_at).getTime(),
  )[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Logo />
        <h1>Create team</h1>
        <p>
          Create a new team to get started. This is where everything happens.
        </p>
      </div>

      <p>You have {invites?.length || 0} invites</p>

      <CreateTeamForm />
    </div>
  );
}
