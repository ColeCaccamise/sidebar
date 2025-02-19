import { getRedis } from '@/lib/redis';
import { cookies } from 'next/headers';
import { parseJwt } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { User, Workspace } from '@/types';
import OnboardingForm from './onboarding-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Onboarding',
};

export default async function Onboarding() {
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  const access = parseJwt(authToken ?? '');

  if (!access) {
    return redirect('/auth/login');
  }

  const userId = access.sub;
  const workspaceId = access.org_id;

  const redisUser = await getRedis({ key: `user:${userId}` });
  if (!redisUser.success || !redisUser.data) {
    throw new Error('Failed to fetch user data');
  }
  const user = redisUser.data as User;
  let workspace: Workspace | undefined = undefined;

  // handle workspace onboarding
  if (workspaceId) {
    const redisWorkspace = await getRedis({ key: `workspace:${workspaceId}` });
    if (!redisWorkspace.success || !redisWorkspace.data) {
      throw new Error('Failed to fetch workspace data');
    }
    workspace = redisWorkspace.data as Workspace;

    if (user.onboarded) {
      return redirect(`/${workspace.slug}`);
    }
  }

  return <OnboardingForm user={user} workspace={workspace} />;
}
