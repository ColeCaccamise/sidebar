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

  return (
    <>
      <>{children}</>
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
