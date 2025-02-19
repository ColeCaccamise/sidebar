import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { parseJwt, isTokenExpired } from '@/lib/jwt';
import { getRedis } from '@/lib/redis';
import { Workspace, User, WorkspaceMember } from '@/types';
import api from '@/lib/api';
import { Metadata } from 'next';
import { getCurrentWorkspace } from '@/lib/workspace';
import WorkspaceContainer from './workspace-container';
import { getCurrentMember, getCurrentUser } from '@/lib/user';
export async function generateMetadata({
  params,
}: {
  params: { team: string };
}): Promise<Metadata> {
  const { workspace, success } = await getCurrentWorkspace();
  const workspaceName = workspace?.name;

  if (success && workspace?.slug === params.team) {
    return {
      title: {
        default: workspaceName ?? 'Workspace',
        template: '%s | Sidebar',
      },
    };
  }
  return {
    title: {
      default: 'Workspace not found',
      template: '%s | Sidebar',
    },
  };
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { team: string };
}) {
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  if (!authToken) {
    console.log('no auth token');
    // redirect('/auth/login');
  }
  const access = parseJwt(authToken ?? '');
  const isExpired = isTokenExpired(authToken ?? '');
  if (!access || isExpired) {
    console.log('access?', access);
    console.log('isExpired?', isExpired);
    // redirect('/auth/login');
  }

  const orgId = access.org_id;
  const workspaceData = await getRedis({ key: `workspace:${orgId}` });
  const currentWorkspace = workspaceData.data as Workspace;
  const workspaces: Workspace[] = [];

  if (currentWorkspace?.slug !== params.team) {
    try {
      const workspace = await api.get<{ data: { workspace: Workspace } }>(
        `/teams/${params.team}`,
      );
    } catch (error) {
      notFound();
    }
  }

  const { user, success: userSuccess } = await getCurrentUser();
  if (!userSuccess) {
    notFound();
  }

  const { member, success: memberSuccess } = await getCurrentMember();
  if (!memberSuccess) {
    notFound();
  }

  return (
    <WorkspaceContainer
      slug={params.team}
      workspace={currentWorkspace}
      user={user as User}
      member={member as WorkspaceMember}
      workspaces={workspaces}
    >
      {children}
    </WorkspaceContainer>
  );
}
