import { getRedis } from '@/lib/redis';
import { cookies } from 'next/headers';
import { parseJwt } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { Workspace } from '@/types';
import OnboardingForm from './onboarding-form';

export const metadata = {
  title: 'Workspace Onboarding',
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
  const response = await getRedis({
    key: `workspace:${workspaceId}`,
  });

  const workspace = response.data as Workspace;

  return <OnboardingForm workspace={workspace} />;
}
