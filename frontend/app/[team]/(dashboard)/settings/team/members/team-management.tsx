'use client';

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Image from 'next/image';
import Dropdown from '@/components/ui/dropdown';
import { Pencil } from 'lucide-react';
import { DotsHorizontalIcon, DotsVerticalIcon } from '@radix-ui/react-icons';
import { TeamMember, TeamMemberResponse } from '@/types';
import Button from '@/components/ui/button';
import { useState } from 'react';
import { capitalize } from '@/lib/sting';
import Modal from '@/components/ui/modal';
import Input from '@/components/ui/input';
import { isValidEmail } from '@/lib/validation';
import toast from '@/lib/toast';

function TeamManagement() {
  const { team: teamSlug } = useParams();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<TeamMemberResponse | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [isCancelInviteModalOpen, setIsCancelInviteModalOpen] = useState(false);

  const { data: team } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const {
        data: {
          data: { team },
        },
      } = await api.get(`/teams/${teamSlug}`);
      return team;
    },
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const {
        data: {
          data: { team_members },
        },
      } = await api.get(`/teams/${teamSlug}/members`);

      return team_members;
    },
  });

  console.log(teamMembers);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const {
        data: {
          data: { user },
        },
      } = await api.get('/auth/identity');

      console.log(user);

      return user;
    },
  });

  const teamMemberActions = [
    {
      id: 'update-name',
      label: 'Update Name',
    },
    {
      id: 'update-role',
      label: 'Update Role',
    },
    {
      id: 'remove-member',
      label: 'Remove Member',
    },
  ];

  const pendingMemberActions = [
    {
      id: 'resend-invite',
      label: 'Resend Invite',
      handleClick: () => {
        toast({
          message: 'Invite resent',
          mode: 'success',
        });
      },
    },
    {
      id: 'cancel-invite',
      label: 'Cancel Invite',
      handleClick: () => {
        setIsCancelInviteModalOpen(true);
      },
    },
  ];

  const otherOwnerExists = !teamMembers?.some(
    (member: TeamMemberResponse) =>
      member.team_member.team_role === 'owner' && member.user?.id !== user?.id,
  );

  const currentUserActions = [
    {
      id: 'leave-team',
      label: otherOwnerExists ? 'Leave team (add another owner)' : 'Leave Team',
      // disable if the user is the only owner
      disabled: otherOwnerExists,
    },
  ];

  const getMenuItems = () => {
    if (selectedMember?.team_member.status === 'pending') {
      return pendingMemberActions;
    } else if (selectedMember?.user?.id === user?.id) {
      return currentUserActions;
    } else if (selectedMember?.team_member.status === 'active') {
      return teamMemberActions;
    }
  };

  return (
    <>
      <CancelInviteModal
        isOpen={isCancelInviteModalOpen}
        onClose={() => setIsCancelInviteModalOpen(false)}
        handleSubmit={() => {
          console.log('cancel invite');
        }}
      />
      <InviteMemberModal
        isOpen={isInviteMemberModalOpen}
        onClose={() => setIsInviteMemberModalOpen(false)}
      />
      <div className="flex flex-col items-end gap-4">
        <Button
          variant="unstyled"
          className="btn bg-brand-secondary text-typography-strong"
          handleClick={() => setIsInviteMemberModalOpen(true)}
        >
          Invite member
        </Button>

        <Table>
          <TableHeader>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead></TableHead>
          </TableHeader>
          <TableBody>
            {teamMembers?.map((member: TeamMemberResponse) => (
              <TableRow
                key={member.team_member.id}
                selected={
                  member.team_member.id === selectedMember?.team_member.id &&
                  selectedMember !== null
                }
                className="group"
              >
                <TableCell>
                  <div className="flex items-center gap-4">
                    {member.user?.avatar_url ? (
                      <Image
                        src={member.user.avatar_url}
                        alt="avatar"
                        width={32}
                        height={32}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm text-white">
                        {member.user?.first_name && member.user?.last_name
                          ? `${member.user.first_name[0]}${member.user.last_name[0]}`
                          : member.user?.email[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-typography-strong">
                        {member.user?.first_name} {member.user?.last_name}
                      </span>
                      <span className="text-sm text-typography-weak">
                        {member.user?.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {capitalize(member.team_member.team_role)}
                </TableCell>
                <TableCell>
                  <span className="rounded-md bg-green-800 px-2 py-1 text-xs text-white">
                    {capitalize(member.team_member.status)}
                  </span>
                </TableCell>
                <TableCell>
                  {member.team_member.joined_at &&
                    new Date(member.team_member.joined_at).toLocaleDateString(
                      'en-US',
                      {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      },
                    )}
                </TableCell>
                <TableCell className="w-[50px] text-right opacity-0 group-hover:opacity-100">
                  <Button
                    variant="unstyled"
                    handleClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setDropdownPosition({
                        top: rect.top + window.scrollY,
                        left: rect.left + window.scrollX,
                      });
                      setIsDropdownOpen((prev) => !prev);
                      setSelectedMember(member);
                    }}
                  >
                    <DotsHorizontalIcon className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div
        style={{
          position: 'absolute',
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
        }}
      >
        <Dropdown
          position="right"
          open={isDropdownOpen}
          onClose={() => {
            setIsDropdownOpen(false);
            setSelectedMember(null);
          }}
          menuItems={getMenuItems()}
        ></Dropdown>
      </div>
    </>
  );
}

function CancelInviteModal({
  isOpen,
  onClose,
  handleSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  handleSubmit: () => void;
}) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Cancel Invite"
      className="w-full max-w-lg"
      handleSubmit={() => {
        handleSubmit();
      }}
      submitText="Cancel Invite"
      cancelText="Back"
    >
      <div className="flex flex-col gap-4">
        <p>
          Are you sure you want to cancel this invite? The invitee will not be
          able to join your team.
        </p>
      </div>
    </Modal>
  );
}

function InviteMemberModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [emails, setEmails] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    const emailsArray = emails.split(/[\s,]+/);
    const validEmails = emailsArray.filter((email) => email.trim().length > 0);

    if (validEmails.length === 0) {
      setError('Please enter at least one email address');
      return;
    }

    const invalidEmails = validEmails.filter((email) => !isValidEmail(email));

    if (invalidEmails.length > 0) {
      setError(
        `Invalid email${invalidEmails.length > 1 ? 's' : ''}: ${invalidEmails.join(', ')}`,
      );
      return;
    }

    console.log(validEmails);

    setError('');
    onClose();

    toast({
      message: 'Invites sent',
      mode: 'success',
    });
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Invite to your team"
      handleSubmit={() => {
        handleSubmit();
      }}
      submitText="Send invites"
      className="w-full max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <p>
          Enter email addresses, separated by commas or spaces, to invite team
          members
        </p>
        <Input
          variant="textarea"
          placeholder="email1@company.com, email2@company.com, email3@company.com"
          value={emails}
          handleChange={(e) => setEmails(e.target.value)}
        />
        {error && <p className="text-error">{error}</p>}
      </div>
    </Modal>
  );
}

export default function TeamManagementPage() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <TeamManagement />
    </QueryClientProvider>
  );
}
