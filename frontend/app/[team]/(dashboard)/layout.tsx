'use client';

import TeamContainer from '@/app/[team]/(dashboard)/team-container';
import { Suspense } from 'react';
import api from '@/lib/axios';
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { notFound } from 'next/navigation';

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { team: string };
}) {
  const queryClient = new QueryClient();
  function TeamContent() {
    const { data: team, isLoading } = useQuery({
      queryKey: ['team'],
      queryFn: async () => {
        const response = await api
          .get(`/teams/${params.team}`, {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
            },
          })
          .then((res) => res.data.data.team)
          .catch(() => null);
        return response;
      },
    });

    if (!isLoading && team === null) {
      return notFound();
    }

    return (
      <TeamContainer slug={params.team} team={team}>
        {children}
      </TeamContainer>
    );
  }

  return (
    <Suspense>
      <QueryClientProvider client={queryClient}>
        <TeamContent />
      </QueryClientProvider>
    </Suspense>
  );
}
