'use client';

import Sidebar from '@/components/ui/sidebar';
import api from '@/lib/axios';
import { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command-menu';
import { useRouter } from 'next/navigation';
import { logout } from './actions';
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
import Image from 'next/image';
import { Team, Subscription, User, TeamMember } from '@/types';
import Modal from '@/components/ui/modal';

export default function TeamContainer({
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
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    // fetch teams
    async function fetchTeams() {
      try {
        const response = await api.get('/teams', {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        setTeams(response.data.data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchTeams();
  }, []);

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

  useEffect(() => {
    async function handleGetSubscription() {
      setIsLoading(true);
      await api
        .get(`/teams/${slug}/billing/subscription`, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then((res) => {
          setSubscription(res?.data?.data?.subscription);
        })
        .catch((err) => {
          console.error(err?.response?.data);
          setSubscription(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    handleGetSubscription();

    async function handleGetUser() {
      setIsLoading(true);
      await api
        .get(`/auth/identity`, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then((res) => {
          setUser(res?.data?.data?.user);
        })
        .catch((err) => {
          console.error(err?.response?.data);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }

    handleGetUser();

    async function handleGetTeamMember() {
      setIsLoading(true);
      await api
        .get(`/teams/${slug}/member`, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then((res) => {
          setTeamMember(res?.data?.data?.team_member);
        })
        .catch((err) => {
          console.error(err?.response?.data);
          setTeamMember(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    handleGetTeamMember();
  }, [slug]);

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

  if (isLoading) {
    return null;
  }

  return (
    <div className="flex h-screen max-h-screen w-full flex-grow justify-start overflow-auto">
      {!pathname.startsWith(`/${slug}/settings`) ? (
        <Sidebar
          teamName={team?.name}
          menuItems={menuItems}
          sidebarItems={sidebarItems}
          secondarySidebarItems={secondarySidebarItems}
          upsell={
            subscription?.free_trial_duration_remaining || 0 > 0
              ? {
                  title: `${subscription?.free_trial_duration_remaining || 0} days left of your trial!`,
                  description: 'Upgrade to continue using all features',
                  buttonText: 'Upgrade plan',
                  buttonLink: `/${slug}/settings/team/plans`,
                  closeable: false,
                }
              : undefined
          }
          dropdownContent={
            <Link
              href={`/${slug}/settings/account/profile`}
              className="flex flex-col gap-2 no-underline hover:opacity-100"
            >
              <span className="text-xs text-typography-weak">
                {user?.email}
              </span>
              <div className="flex items-center gap-2">
                {user?.avatar_url ? (
                  <Image
                    src={user?.avatar_url}
                    alt="User avatar"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fill text-xs font-bold text-typography-strong">
                    {user?.first_name?.charAt(0).toUpperCase() ||
                      user?.email?.charAt(0).toUpperCase() ||
                      teamMember?.team_role?.charAt(0).toUpperCase() ||
                      'U'}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-typography-strong">
                    {teamMember?.team_role
                      ? roleMap[teamMember?.team_role as keyof typeof roleMap]
                      : ''}
                  </span>
                  <span className="text-xs">
                    {subscription?.plan_type
                      ? planMap[subscription?.plan_type as keyof typeof planMap]
                      : ''}
                    {subscription?.free_trial_active === true && ' (trial)'}
                  </span>
                </div>
              </div>
            </Link>
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

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              Calendar <CommandShortcut>⌘K</CommandShortcut>
            </CommandItem>
            <CommandItem>Search</CommandItem>
            <CommandItem>Settings</CommandItem>
          </CommandGroup>

          <CommandGroup heading="Billing">
            <CommandItem>Upgrade plan</CommandItem>
            <CommandItem>Billing</CommandItem>
            <CommandItem>Help and support</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Modal
        open={switchTeamOpen}
        setOpen={setSwitchTeamOpen}
        title="Switch team"
        className="w-full max-w-lg"
      >
        <div className="flex w-full flex-col gap-4">
          <p className="text-sm text-typography-weak">
            Select a team to switch to
          </p>
          <div className="grid gap-4">
            {teams?.map((team: Team) => (
              <button
                key={team.id}
                onClick={() => {
                  router.push(`/${team.slug}`);
                  setSwitchTeamOpen(false);
                }}
                className="flex items-center justify-between rounded-lg border border-stroke-weak bg-background p-4 text-left hover:bg-fill"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stroke-weak bg-fill">
                    <span className="text-sm font-medium">
                      {team.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-xs text-typography-weak">
                      {process.env.NEXT_PUBLIC_APP_URL}/{team.slug}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            <button
              onClick={() => {
                router.push('/onboarding/team');
                setSwitchTeamOpen(false);
              }}
              className="flex items-center justify-between rounded-lg border border-stroke-weak bg-background p-4 text-left hover:bg-fill"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stroke-weak bg-fill">
                  <span className="text-sm font-medium">+</span>
                </div>
                <div>
                  <p className="font-medium">Create or join a new team</p>
                  <p className="text-xs text-typography-weak">
                    Start fresh with a new team
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
