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

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { team: string };
}) {
  const [team, setTeam] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchTeam() {
      const res = await api.get(`/teams/${params.team}`, {
        withCredentials: true,
      });
      setTeam(res.data.data.team);
    }

    fetchTeam();
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

  // dashboard
  const menuItems = [
    {
      divider: true,
    },
    {
      id: 'settings',
      label: 'Settings',
      kbd: 'G then S',
      href: `/${params.team}/settings/account/profile`,
    },
    {
      id: 'invite',
      label: 'Invite and manage members',
      href: `/${params.team}/settings/team/members`,
    },
    {
      divider: true,
    },
    {
      id: 'switch-team',
      label: 'Switch team',
      kbd: 'O then T',
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
          .then(async (response) => {
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
      href: `/${params.team}`,
      active: pathname === `/${params.team}`,
    },
    {
      id: 'analytics',
      icon: <ChartNoAxesColumn className="h-4 w-4" />,
      label: 'Analytics',
      href: `/${params.team}/analytics`,
      active: pathname === `/${params.team}/analytics`,
    },
  ];

  const secondarySidebarItems = [
    {
      id: 'billing',
      label: 'Billing',
      href: `/${params.team}/settings/team/billing`,
      icon: <CreditCardIcon className="h-4 w-4" />,
    },
    {
      id: 'help-and-support',
      label: 'Help and support',
      href: `/${params.team}/settings/team/help`,
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
      href: `/${params.team}/settings/account/profile`,
      active: pathname.startsWith(`/${params.team}/settings/account/profile`),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <BellIcon className="h-4 w-4" />,
      href: `/${params.team}/settings/account/notifications`,
      active: pathname.startsWith(
        `/${params.team}/settings/account/notifications`,
      ),
    },
    {
      id: 'security',
      label: 'Security and access',
      icon: <LockIcon className="h-4 w-4" />,
      href: `/${params.team}/settings/account/security`,
      active: pathname.startsWith(`/${params.team}/settings/account/security`),
    },
    {
      heading: 'Team',
      topMargin: true,
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: <CreditCardIcon className="h-4 w-4" />,
      href: `/${params.team}/settings/team/billing`,
      active: pathname.startsWith(`/${params.team}/settings/team/billing`),
    },
    {
      id: 'plans',
      label: 'Plans',
      icon: <StackIcon className="h-4 w-4" />,
      href: `/${params.team}/settings/team/plans`,
      active: pathname.startsWith(`/${params.team}/settings/team/plans`),
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: <LinkIcon className="h-4 w-4" />,
      href: `/${params.team}/settings/team/integrations`,
      active: pathname.startsWith(`/${params.team}/settings/team/integrations`),
    },
    {
      id: 'team',
      label: 'Team',
      icon: <ShieldIcon className="h-4 w-4" />,
      href: `/${params.team}/settings/team`,
      active: pathname === `/${params.team}/settings/team`,
    },
    {
      id: 'members',
      label: 'Members',
      icon: <UsersIcon className="h-4 w-4" />,
      href: `/${params.team}/settings/team/members`,
      active: pathname.startsWith(`/${params.team}/settings/team/members`),
    },
    {
      id: 'help',
      label: 'Help and support',
      icon: <QuestionMarkCircledIcon className="h-4 w-4" />,
      href: `/${params.team}/settings/team/help`,
      active: pathname.startsWith(`/${params.team}/settings/team/help`),
    },
  ];

  return (
    <div className="flex h-screen max-h-screen w-full flex-grow justify-start overflow-auto">
      {!pathname.startsWith(`/${params.team}/settings`) ? (
        <Sidebar
          teamName={team?.name}
          menuItems={menuItems}
          sidebarItems={sidebarItems}
          secondarySidebarItems={secondarySidebarItems}
          upsell={{
            title: '14 days left of your trial!',
            description: 'Upgrade to continue using all features',
            buttonText: 'Upgrade plan',
            buttonLink: `/${params.team}/settings/team/plans`,
            closeable: false,
          }}
          dropdownContent={
            <div className="flex flex-col gap-2">
              <span className="text-xs text-typography-weak">
                cole@colecaccamise.com
              </span>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-fill text-xs font-bold text-typography-strong">
                  C
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-typography-strong">
                    Owner
                  </span>
                  <span className="text-xs">Basic Plan (trial)</span>
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
              href={`/${params.team}`}
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
    </div>
  );
}
