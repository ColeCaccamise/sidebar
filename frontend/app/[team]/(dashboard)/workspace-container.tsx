'use client';

import { User, Workspace, WorkspaceMember } from '@/types';
import { notFound } from 'next/navigation';
import Sidebar from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import api from '@/lib/axios';
import { logout, switchTeam } from './actions';
import {
  PanelsTopLeft,
  ChartNoAxesColumn,
  CreditCardIcon,
  BellIcon,
  LockIcon,
  LinkIcon,
  ShieldIcon,
  UsersIcon,
  ChevronLeftIcon,
} from 'lucide-react';
import {
  QuestionMarkCircledIcon,
  PersonIcon,
  StackIcon,
} from '@radix-ui/react-icons';
import CommandMenu from '@/components/command-menu';
import SwitchWorkspaceModal from './switch-workspace-modal';

interface WorkspaceContainerProps {
  slug: string;
  workspace: Workspace | undefined | null;
  children: React.ReactNode;
  user: User;
  member: WorkspaceMember;
  workspaces: Workspace[];
}

export default function WorkspaceContainer({
  slug,
  workspace,
  children,
  user,
  member,
  workspaces,
}: WorkspaceContainerProps) {
  if (!workspace) {
    notFound();
  }
  const pathname = usePathname();

  const menuItems = [
    {
      divider: true,
    },
    {
      id: 'settings',
      label: 'Settings',
      kbd: 'G then S',
      href: `/${slug}/settings/account/profile`,
    },
    {
      id: 'invite',
      label: 'Invite and manage members',
      href: `/${slug}/settings/team/members`,
    },
    {
      divider: true,
    },
    {
      id: 'switch-team',
      label: 'Switch team',
      kbd: 'O then T',
      handleClick: () => setSwitchTeamOpen(true),
    },
    {
      id: 'logout',
      label: 'Log out',
      kbd: '⌥ ⇧ Q',
      handleClick: () => {
        api
          .post('/auth/logout', {
            withCredentials: true,
          })
          .then(async () => {
            await logout();
            router.push('/');
          });
      },
    },
  ];

  const sidebarItems = [
    {
      id: 'overview',
      icon: <PanelsTopLeft className="h-4 w-4" />,
      label: 'Overview',
      href: `/${slug}`,
      active: pathname === `/${slug}`,
    },
    {
      id: 'analytics',
      icon: <ChartNoAxesColumn className="h-4 w-4" />,
      label: 'Analytics',
      href: `/${slug}/analytics`,
      active: pathname === `/${slug}/analytics`,
    },
  ];

  const secondarySidebarItems = [
    {
      id: 'billing',
      label: 'Billing',
      href: `/${slug}/settings/team/billing`,
      icon: <CreditCardIcon className="h-4 w-4" />,
    },
    {
      id: 'help-and-support',
      label: 'Help and support',
      href: `/${slug}/settings/team/help`,
      icon: <QuestionMarkCircledIcon className="h-4 w-4" />,
    },
  ];

  // settings
  const settingsSidebarItems = [
    {
      heading: 'Account',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <PersonIcon className="h-4 w-4" />,
      href: `/${slug}/settings/account/profile`,
      active: pathname.startsWith(`/${slug}/settings/account/profile`),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <BellIcon className="h-4 w-4" />,
      href: `/${slug}/settings/account/notifications`,
      active: pathname.startsWith(`/${slug}/settings/account/notifications`),
    },
    {
      id: 'security',
      label: 'Security and access',
      icon: <LockIcon className="h-4 w-4" />,
      href: `/${slug}/settings/account/security`,
      active: pathname.startsWith(`/${slug}/settings/account/security`),
    },
    {
      heading: 'Team',
      topMargin: true,
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: <CreditCardIcon className="h-4 w-4" />,
      href: `/${slug}/settings/team/billing`,
      active: pathname.startsWith(`/${slug}/settings/team/billing`),
    },
    {
      id: 'plans',
      label: 'Plans',
      icon: <StackIcon className="h-4 w-4" />,
      href: `/${slug}/settings/team/plans`,
      active: pathname.startsWith(`/${slug}/settings/team/plans`),
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: <LinkIcon className="h-4 w-4" />,
      href: `/${slug}/settings/team/integrations`,
      active: pathname.startsWith(`/${slug}/settings/team/integrations`),
    },
    {
      id: 'team',
      label: 'Team',
      icon: <ShieldIcon className="h-4 w-4" />,
      href: `/${slug}/settings/team`,
      active: pathname === `/${slug}/settings/team`,
    },
    {
      id: 'members',
      label: 'Members',
      icon: <UsersIcon className="h-4 w-4" />,
      href: `/${slug}/settings/team/members`,
      active: pathname.startsWith(`/${slug}/settings/team/members`),
    },
    {
      id: 'help',
      label: 'Help and support',
      icon: <QuestionMarkCircledIcon className="h-4 w-4" />,
      href: `/${slug}/settings/team/help`,
      active: pathname.startsWith(`/${slug}/settings/team/help`),
    },
  ];

  const planMap = {
    basic: 'Basic Plan',
    pro: 'Pro Plan',
    premium: 'Premium Plan',
  };

  const roleMap = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
  };

  const router = useRouter();
  const [switchWorkspaceOpen, setSwitchWorkspaceOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const subscription = {
    plan_type: 'basic',
    free_trial_active: false,
  };

  const switchWorkspace = (slug: string) => {
    // todo extra logic -- server action refactor (not even here propbably just in the component)
    router.push(`/${slug}`);
  };

  return (
    <div className="flex h-screen max-h-screen w-full flex-grow justify-start overflow-auto">
      {!pathname.startsWith(`/${slug}/settings`) ? (
        <Sidebar
          teamName={workspace?.name || 'Loading...'}
          menuItems={menuItems}
          sidebarItems={sidebarItems}
          secondarySidebarItems={secondarySidebarItems}
          dropdownContent={
            <div className="flex flex-col gap-2">
              <span className="text-xs text-typography-weak">
                {user?.email}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fill text-xs font-bold text-typography-strong">
                  {!user && !workspace
                    ? null
                    : user?.first_name && user?.last_name
                      ? `${user.first_name.charAt(0).toUpperCase()}${user.last_name.charAt(0).toUpperCase()}`
                      : user?.email?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-typography-strong">
                    {user?.first_name && user?.last_name
                      ? `${user.first_name} ${user.last_name} (${roleMap[member?.role as keyof typeof roleMap]})`
                      : roleMap[member?.role as keyof typeof roleMap] || ''}
                  </span>
                  <span className="text-xs">
                    {subscription?.plan_type
                      ? planMap[subscription?.plan_type as keyof typeof planMap]
                      : ''}
                    {subscription?.free_trial_active === true && ' (trial)'}
                  </span>
                </div>
              </div>
            </div>
          }
        />
      ) : (
        <Sidebar
          menuItems={menuItems}
          header={
            <Link
              href={`/${slug}`}
              className="flex items-center gap-2 no-underline"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="text-sm font-medium text-typography-strong">
                Back to app
              </span>
            </Link>
          }
          sidebarItems={settingsSidebarItems}
        />
      )}

      <div className="flex h-full max-h-screen flex-grow justify-center overflow-y-auto p-8">
        {children}
      </div>

      <CommandMenu open={open} setOpen={setOpen} />

      <SwitchWorkspaceModal
        open={switchWorkspaceOpen}
        setOpen={setSwitchWorkspaceOpen}
        workspaces={workspaces}
        workspace={workspace}
        switchWorkspace={switchWorkspace}
      />
    </div>
  );
}
