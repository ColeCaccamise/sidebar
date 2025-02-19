'use client';

import api from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import Link from 'next/link';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await api.post('/auth/logout', {
      withCredentials: true,
    });
    router.push('/auth/login');
  };

  return (
    <Button asChild variant="ghost" onClick={handleLogout}>
      <Link href="/auth/login" className="no-underline">
        Log out
      </Link>
    </Button>
  );
}
