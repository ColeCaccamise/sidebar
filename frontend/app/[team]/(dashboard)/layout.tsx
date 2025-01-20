'use client';

import TeamContainer from '@/app/[team]/(dashboard)/team-container';
import { Suspense, useEffect } from 'react';
import api from '@/lib/axios';
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { team: string };
}) {
  const router = useRouter();
  const queryClient = new QueryClient();
  function TeamContent() {
    const { data: team } = useQuery({
      queryKey: ['team'],
      queryFn: async () => {
        const response = await api.get(`/teams/${params.team}`, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return response.data.data.team;
      },
    });

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
