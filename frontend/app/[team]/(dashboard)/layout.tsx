import TeamContainer from '@/app/[team]/(dashboard)/team-container';
import { Suspense } from 'react';
import { Team } from '@/types';
import { cookies } from 'next/headers';
import axios from 'axios';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { team: string };
}) {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  const teamData = await axios
    .get(`${process.env.NEXT_PUBLIC_API_URL}/teams/${params.team}`, {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
    })
    .then((resp) => {
      const team = resp.data.data.team;
      return {
        id: team.id,
        name: team.name,
      } as Team;
    })
    .catch(() => null);

  if (!teamData) {
    return <>{children}</>;
  }

  return (
    <Suspense>
      <TeamContainer slug={params.team} team={teamData}>
        {children}
      </TeamContainer>
    </Suspense>
  );
}
