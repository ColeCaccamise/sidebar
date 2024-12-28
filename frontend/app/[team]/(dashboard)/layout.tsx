import TeamContainer from '@/app/[team]/(dashboard)/team-container';
import api from '@/lib/axios';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Suspense } from 'react';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { team: string };
}) {
  const team = await api
    .get(`/teams/${params.team}`, {
      headers: {
        Cookie: `auth-token=${cookies().get('auth-token')?.value}`,
      },
      withCredentials: true,
    })
    .then((resp) => resp.data.data.team)
    .catch(() => null);

  if (!team) {
    notFound();
  }

  return (
    <Suspense>
      <TeamContainer slug={params.team} team={team}>
        {children}
      </TeamContainer>
    </Suspense>
  );
}
