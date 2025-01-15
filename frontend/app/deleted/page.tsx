'use client';

import Modal from '@/components/ui/modal';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';

export default function DeletedPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api
      .get('/auth/identity')
      .then((res) => {
        setUser(res.data.data.user);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    router.push('/auth/login');
  };

  const handleRestore = async () => {
    await api.post('/users/restore');
    router.push('/');
  };

  if (loading) {
    return null;
  }

  return (
    <>
      <Modal
        title="Your account has been deleted"
        open={true}
        submitText={user?.restorable ? 'Restore account' : 'Log out'}
        cancelText={user?.restorable ? 'Log out' : undefined}
        showSubmitButton={true}
        showCancelButton={user?.restorable}
        canClose={false}
        handleSubmit={user?.restorable ? handleRestore : handleLogout}
        onClose={handleLogout}
        className="w-full max-w-md"
      >
        <div>
          <p>
            Your account has been deleted.{' '}
            {user?.restorable
              ? 'You can restore your account within 60 days of deletion.'
              : null}{' '}
            If you believe this was a mistake, please{' '}
            <Link href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}>
              contact support
            </Link>
            .
          </p>
        </div>
      </Modal>
    </>
  );
}
