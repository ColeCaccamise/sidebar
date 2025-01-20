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
import { inviteMembers, cancelInvites, resendInvite } from './actions';
import { getErrorMessage } from '@/messages';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Spinner from '@/components/ui/spinner';

function TeamManagement() {
  const queryClient = useQueryClient();
  const { team: teamSlug } = useParams();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<TeamMemberResponse | null>(null);
  const [memberToCancel, setMemberToCancel] =
    useState<TeamMemberResponse | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [isCancelInviteModalOpen, setIsCancelInviteModalOpen] = useState(false);
  const [memberToResendInvite, setMemberToResendInvite] =
    useState<TeamMemberResponse | null>(null);
  const [isResendInviteModalOpen, setIsResendInviteModalOpen] = useState(false);

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

  const {
    data: teamMembers,
    refetch: refetchTeamMembers,
    isLoading: isLoadingTeamMembers,
  } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const {
        data: {
          data: { team_members },
        },
      } = await api.get(`/teams/${teamSlug}/members`);

      console.log(team_members);

      return team_members;
    },
  });

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

  const handleCancelInvite = async () => {
    if (!memberToCancel) return;

    const resp = await cancelInvites({
      teamSlug: teamSlug as string,
      teamMemberId: memberToCancel.team_member.id,
    });

    if (resp.success) {
      toast({
        message: 'Invite cancelled successfully',
        mode: 'success',
      });
      queryClient.setQueryData(
        ['teamMembers'],
        (oldData: TeamMemberResponse[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(
            (member) => member.team_member.id !== memberToCancel.team_member.id,
          );
        },
      );
    } else {
      toast({
        message: getErrorMessage(resp.code || ''),
        mode: 'error',
      });
    }

    setIsCancelInviteModalOpen(false);
    setMemberToCancel(null);
  };

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
        if (selectedMember) {
          setMemberToResendInvite(selectedMember);
          setIsResendInviteModalOpen(true);
        }
      },
    },
    {
      id: 'cancel-invite',
      label: 'Cancel Invite',
      handleClick: () => {
        if (selectedMember) {
          setMemberToCancel(selectedMember);
          setIsCancelInviteModalOpen(true);
        }
      },
    },
  ];

  const otherOwnerExists = !teamMembers?.some(
    (member: TeamMemberResponse) =>
      member.team_member.team_role === 'owner' &&
      member.user?.id !== user?.id &&
      member.team_member.status === 'active',
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

  const handleInviteMemberSuccess = (newMembers: TeamMemberResponse[]) => {
    queryClient.setQueryData(
      ['teamMembers'],
      (oldData: TeamMemberResponse[]) => {
        console.log('Old data:', oldData);
        console.log('New members:', newMembers);

        if (!oldData) return newMembers;
        const merged = [...oldData, ...newMembers];
        console.log('Merged result:', merged);
        return merged;
      },
    );
  };

  const getStatus = (member: TeamMemberResponse) => {
    let statusText = '';
    if (member.team_member.status === 'pending') {
      statusText = 'Pending';
    } else if (member.team_member.status === 'active') {
      statusText = 'Active';
    } else if (member.team_member.status === 'inactive') {
      statusText = 'Inactive';
    }

    return (
      <span
        className={`rounded-md px-2 py-1 text-xs ${
          member.team_member.status === 'pending'
            ? 'bg-amber-800'
            : member.team_member.status === 'active'
              ? 'bg-green-800'
              : 'bg-error'
        } text-white`}
      >
        {statusText}
      </span>
    );
  };

  if (!teamMembers) {
    return <Spinner />;
  }

  return (
    <>
      <CancelInviteModal
        isOpen={isCancelInviteModalOpen}
        onClose={() => {
          setIsCancelInviteModalOpen(false);
          setMemberToCancel(null);
        }}
        handleSubmit={handleCancelInvite}
        memberToCancel={memberToCancel}
      />
      <InviteMemberModal
        isOpen={isInviteMemberModalOpen}
        onClose={() => setIsInviteMemberModalOpen(false)}
        teamSlug={teamSlug as string}
        onSuccess={handleInviteMemberSuccess}
      />
      <ResendInviteModal
        isOpen={isResendInviteModalOpen}
        onClose={() => setIsResendInviteModalOpen(false)}
        memberToResendInvite={memberToResendInvite}
        teamSlug={teamSlug as string}
      />
      <h1>Team Members</h1>

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
                          : member.team_member?.email[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-typography-strong">
                        {member.user?.first_name} {member.user?.last_name}
                      </span>
                      <span className="text-sm text-typography-weak">
                        {member.team_member.email ||
                          member.user?.email ||
                          'No email found'}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {capitalize(member.team_member.team_role)}
                </TableCell>
                <TableCell>{getStatus(member)}</TableCell>
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
  memberToCancel,
}: {
  isOpen: boolean;
  onClose: () => void;
  handleSubmit: () => void;
  memberToCancel: TeamMemberResponse | null;
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
          Are you sure you want to cancel{' '}
          <b> {memberToCancel?.team_member?.email}</b>'s invite? They will not
          be able to join your team.
        </p>
      </div>
    </Modal>
  );
}

function InviteMemberModal({
  isOpen,
  onClose,
  teamSlug,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  teamSlug: string;
  onSuccess: (newMembers: TeamMemberResponse[]) => void;
}) {
  const [emails, setEmails] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState('member');

  async function handleSubmit() {
    const emailsArray = emails.split(/[\s,]+/);
    const validEmails = emailsArray.filter((email) => email.trim().length > 0);

    if (validEmails.length === 0) {
      setError('Please enter at least one email address');
      return;
    }

    if (!role) {
      setError('Please select a role');
      return;
    }

    const invalidEmails = validEmails.filter((email) => !isValidEmail(email));

    if (invalidEmails.length > 0) {
      setError(
        `Invalid email${invalidEmails.length > 1 ? 's' : ''}: ${invalidEmails.join(', ')}`,
      );
      return;
    }

    setError('');
    onClose();

    const resp = await inviteMembers({
      teamSlug,
      emails: validEmails,
      role,
    });

    if (resp.success) {
      console.log('resp:', resp);
      onSuccess(resp.data);

      toast({
        message: 'Invites sent.',
        mode: 'success',
      });
    } else {
      console.log('error:', resp);
      toast({
        message: getErrorMessage(resp.code || ''),
        mode: 'error',
      });
    }

    setEmails('');
    setRole('member');
    setError('');
    onClose();
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Invite to your team"
      handleSubmit={handleSubmit}
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
        <Select value={role} onValueChange={(value) => setRole(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Modal>
  );
}

function ResendInviteModal({
  isOpen,
  onClose,
  memberToResendInvite,
  teamSlug,
}: {
  isOpen: boolean;
  onClose: () => void;
  memberToResendInvite: TeamMemberResponse | null;
  teamSlug: string;
}) {
  async function handleSubmit() {
    const resp = await resendInvite({
      teamSlug,
      teamMemberId: memberToResendInvite?.team_member?.id || '',
    });

    if (resp.success) {
      toast({
        message: 'Invite resent',
        mode: 'success',
      });
      onClose();
    } else {
      console.log('error:', resp);
      toast({
        message: getErrorMessage(resp.code || ''),
        mode: 'error',
      });
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Resend Invite"
      className="w-full max-w-lg"
      handleSubmit={handleSubmit}
      submitText="Resend Invite"
      cancelText="Back"
    >
      <p>
        Are you sure you want to send a new invite to{' '}
        <b>{memberToResendInvite?.team_member?.email}</b>? This will cancel
        their existing invite.
      </p>
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
