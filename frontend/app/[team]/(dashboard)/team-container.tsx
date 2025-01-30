'use client';

import Sidebar from '@/components/ui/sidebar';
import api from '@/lib/axios';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout, switchTeam } from './actions';
import {
  PanelsTopLeft,
  UsersIcon,
  ChartNoAxesColumn,
  CreditCardIcon,
  BellIcon,
  LockIcon,
  LinkIcon,
  ShieldIcon,
} from 'lucide-react';
import {
  ChevronLeftIcon,
  PersonIcon,
  QuestionMarkCircledIcon,
  StackIcon,
} from '@radix-ui/react-icons';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Team } from '@/types';
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useTeamStore } from '@/state/team';
import { useUserStore } from '@/state/user';
import SwitchTeamModal from './switch-team-modal';
import CommandMenu from '@/components/command-menu';

function TeamContainerContent({
  slug,
  team,
  children,
}: {
  slug: string;
  team: Team;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [switchTeamOpen, setSwitchTeamOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { setTeam, setIsLoading } = useTeamStore();
  const { user, setUser } = useUserStore();

  useEffect(() => {
    setTeam(team);
    setIsLoading(false);
  }, [team, setTeam, setIsLoading]);

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await api.get('/teams', {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data.data;
    },
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', slug],
    queryFn: async () => {
      const response = await api.get(`/teams/${slug}/billing/subscription`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data.data.subscription;
    },
  });

  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await api.get('/auth/identity', {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data.data.user;
    },
  });

  useEffect(() => {
    setUser(userData);
  }, [userData, setUser]);

  const { data: teamMember } = useQuery({
    queryKey: ['teamMember', slug],
    queryFn: async () => {
      setIsLoading(true);
      const response = await api.get(`/teams/${slug}/member`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setIsLoading(false);
      return response.data.data.team_member;
    },
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // dashboard
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

  return (
    <div className="flex h-screen max-h-screen w-full flex-grow justify-start overflow-auto">
      {!pathname.startsWith(`/${slug}/settings`) ? (
        <Sidebar
          teamName={team?.name || 'Loading...'}
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
                  {!user && !team
                    ? null
                    : user?.first_name && user?.last_name
                      ? `${user.first_name.charAt(0).toUpperCase()}${user.last_name.charAt(0).toUpperCase()}`
                      : user?.email?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-typography-strong">
                    {user?.first_name && user?.last_name
                      ? `${user.first_name} ${user.last_name} (${roleMap[teamMember?.team_role as keyof typeof roleMap]})`
                      : roleMap[
                          teamMember?.team_role as keyof typeof roleMap
                        ] || ''}
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

      <SwitchTeamModal
        open={switchTeamOpen}
        setOpen={setSwitchTeamOpen}
        teams={teams}
        team={team}
        switchTeam={switchTeam}
      />
    </div>
  );
}

export default function TeamContainer(props: {
  slug: string;
  team: Team;
  children: React.ReactNode;
}) {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <TeamContainerContent {...props} />
    </QueryClientProvider>
  );
}
