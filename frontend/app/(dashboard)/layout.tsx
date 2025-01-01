'use client';

import Header from '@/components/ui/header';
import Dropdown from '@/components/ui/dropdown';
import { ExitIcon, GearIcon } from '@radix-ui/react-icons';
import { handleLogout, handleRestoreUser } from './actions';
import axios from 'axios';
import Modal from '@/components/ui/modal';
import { useEffect, useState } from 'react';
import { getResponseMessage } from '@/messages';
import Button from '@/components/ui/button';
import { getErrorMessage } from '@/messages';
import toast from '@/lib/toast';
import { useRouter } from 'next/navigation';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const menuItems = [
    {
      id: 'settings',
      label: 'Settings',
      icon: <GearIcon />,
      href: '/settings/account',
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: <ExitIcon />,
      handleClick: async () => {
        await handleLogout();
      },
    },
  ];

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);

  useEffect(() => {
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/auth/identity`, {
        withCredentials: true,
      })
      .then((res) => {
        setUser(res.data);
        setAccountDeleted(Boolean(res.data?.deleted_at));
      })
      .catch((err) => {
        if (err.response.data.code === 'session_expired') {
          toast({
            message: getErrorMessage('session_expired'),
            mode: 'error',
          });

          router.push('/auth/login');
        }
      });
  }, [router]);

  async function handleRestore() {
    setLoading(true);

    await handleRestoreUser()
      .then((resp) => {
        console.log(resp.error);
        if (resp?.error) {
          console.log(resp?.code);
          toast({
            message: getErrorMessage(resp.code),
            mode: 'error',
          });
        } else {
          setUser(resp?.data?.user);
          setAccountDeleted(Boolean(resp?.data?.deleted_at));
          toast({
            message: getResponseMessage('user_restored'),
            mode: 'success',
          });
        }
      })
      .catch((err) => {
        if (err.code) {
          toast({
            message: getErrorMessage(err.code),
            mode: 'error',
          });
        } else {
          toast({
            message: getErrorMessage('internal_server_error'),
            mode: 'error',
          });
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div className="flex w-full flex-grow flex-col items-center justify-center">
      {accountDeleted && (
        <Modal
          title="Your account has been deleted."
          open={accountDeleted}
          onClose={() => {}}
          canClose={!accountDeleted}
        >
          <div className="flex flex-col gap-6 py-2">
            <p>
              A deletion request was initiated on{' '}
              {user?.deleted_at ? (
                <b>{new Date(user.deleted_at).toLocaleString()}.</b>
              ) : (
                ''
              )}
            </p>
            <p>
              If no further action is taken, your account will be permanently
              deleted on{' '}
              <b>
                {new Date(
                  user?.deleted_at
                    ? new Date(user.deleted_at).getTime() +
                      30 * 24 * 60 * 60 * 1000
                    : Date.now(),
                ).toLocaleString()}
              </b>
              .
            </p>
            <p>
              If this was not you, please contact support immediately. After
              permanent deletion, any data associated with your account will no
              longer be recoverable.
            </p>
            <Button
              disabled={loading}
              className="w-full"
              handleClick={handleRestore}
            >
              {loading ? 'Restoring Account...' : 'Restore Account'}
            </Button>
          </div>
        </Modal>
      )}
      <Header>
        <Dropdown menuItems={menuItems}>Account</Dropdown>
      </Header>

      <div className="flex h-full w-full max-w-screen-xl flex-grow flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
