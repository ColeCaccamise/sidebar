import Logo from '@/components/ui/logo';
import CreateTeamForm from './create-team-form';
import api from '@/lib/api';
import { TeamInvite, TeamMember } from '@/types';
import { getTeamRoleLanguage } from '@/lib/team';
import Button from '@/components/ui/button';
import AcceptInviteForm from './accept-invite-form';

export default async function OnboardingTeamPage() {
  async function listInvites() {
    try {
      const response = await api.get<{ data: { invites: TeamInvite[] } }>(
        '/users/invites',
      );
      return response.data.data.invites;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  async function listTeamMembers() {
    try {
      const response = await api.get<{ data: { members: TeamMember[] } }>(
        '/users/members',
      );
      return response.data.data.members;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  const invites = await listInvites();
  const latestInvite: TeamInvite = invites?.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  const teamMembers = await listTeamMembers();
  const activeTeamMember = teamMembers.find(
    (member) => member.status === 'active',
  );

  console.log('latest invite', latestInvite);
  console.log('team members', teamMembers);
  console.log('active team member', activeTeamMember);

  if (latestInvite) {
    const teamName = latestInvite.team_name;
    const role = getTeamRoleLanguage(latestInvite.team_role);

    return (
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col gap-4">
          <Logo />
          <div className="flex flex-col gap-2">
            <h1>Join {teamName}</h1>
            <p>
              You've been invited to join {teamName} as {role}. Click the button
              below to accept the invite.
            </p>
          </div>
        </div>

        <AcceptInviteForm data={latestInvite} />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Logo />
        <div className="flex flex-col gap-2">
          <h1>Create team</h1>
          <p>
            Create a new team to get started. This is where everything happens.
          </p>
        </div>
      </div>

      <CreateTeamForm />
    </div>
  );
}
