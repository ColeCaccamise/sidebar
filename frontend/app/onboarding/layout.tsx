import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { parseJwt } from '@/lib/jwt';
import { getRedis } from '@/lib/redis';
import { User, Workspace } from '@/types';
import { ChevronLeftIcon } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import OnboardingActions from './onboarding-actions';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  async function handleLogout() {
    'use server';

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`;

    try {
      const res = await api.post<{ data: { redirect_url: string } }>(
        '/auth/logout',
      );
      redirect(res.data.data.redirect_url || loginUrl);
    } catch (error) {
      console.error('error logging out: ', error);
      redirect(loginUrl);
    }
  }

  const cookieStore = cookies();
  // const teams = await api
  //   .get<{ data: { teams: Team[] } }>('/teams')
  //   .then((res) => res.data.data.teams)
  //   .catch(() => []);

  const authToken = cookieStore.get('auth-token');
  const access = parseJwt(authToken?.value ?? '');
  console.log('access', access);
  const orgId = access?.orgId;
  const { data: workspace } = await getRedis({
    key: `workspace:${orgId}`,
  });
  console.log(`workspace:${orgId}`);
  console.log(`user:${access?.sub}`);
  const { data: user, success } = await getRedis({
    key: `user:${access?.sub}`,
  });
  if (!success) {
    redirect('/auth/login');
  }

  return (
    <>
      {children}
      <OnboardingActions
        workspace={workspace as Workspace}
        user={user as User}
        handleLogout={handleLogout}
      />
    </>
  );
}
