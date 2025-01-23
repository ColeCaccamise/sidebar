'use client';

import Button from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { ChevronLeftIcon } from 'lucide-react';

// create a client
const queryClient = new QueryClient();

function OnboardingLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  async function handleLogout() {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`;

    try {
      const res = await api.post('/auth/logout');
      router.push(res.data.data.redirect_url || loginUrl);
    } catch (error) {
      console.error('error logging out: ', error);
      router.push(loginUrl);
    }
  }

  const { data: teams } = useQuery({
    queryKey: ['existingTeams'],
    queryFn: async () => {
      const {
        data: { data },
      } = await api.get('/teams');
      return data;
    },
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const {
        data: {
          data: { user },
        },
      } = await api.get('/auth/identity');
      return user;
    },
  });

  return (
    <>
      {children}

      {teams?.length > 0 &&
        user?.default_team_slug &&
        user?.onboarding_completed && (
          <div className="fixed left-8 top-8">
            <Button
              className="transition-effect flex items-center gap-1 hover:opacity-90"
              variant="unstyled"
              type="submit"
              handleClick={() => router.push(`/${user?.default_team_slug}`)}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back to dashboard
            </Button>
          </div>
        )}

      <div className="fixed right-8 top-8">
        <Button
          className="transition-effect hover:opacity-90"
          variant="unstyled"
          type="submit"
          handleClick={handleLogout}
        >
          Log out
        </Button>
      </div>
    </>
  );
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <OnboardingLayoutContent>{children}</OnboardingLayoutContent>
    </QueryClientProvider>
  );
}
