'use client';

import Button from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await api.post('/auth/logout', {
      withCredentials: true,
    });
    router.push('/');
  };

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6 px-6 py-8 md:px-8">
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
      {children}
    </div>
  );
}
