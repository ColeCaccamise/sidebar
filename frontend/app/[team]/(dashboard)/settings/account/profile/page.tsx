import { Metadata } from 'next';
import AccountSettings from './account-settings';

export const metadata: Metadata = {
  title: 'Account Settings',
};

export default function AccountSettingsPage() {
  return <AccountSettings />;
}
