import { Metadata } from 'next';
import AccountSettings from './account-settings';
import { getCurrentUserData } from '@/lib/user';

export const metadata: Metadata = {
  title: 'Account Settings',
};

export default async function AccountSettingsPage() {
  const { user, success, error } = await getCurrentUserData();

  if (success && user) {
    return <AccountSettings user={user} />;
  }

  return <div>Error: {error}</div>;
}
