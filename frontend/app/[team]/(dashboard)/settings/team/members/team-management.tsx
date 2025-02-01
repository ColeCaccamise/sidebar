'use client';

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useParams, useRouter } from 'next/navigation';
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
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { TeamMemberResponse } from '@/types';
import Button from '@/components/ui/button';
import { useState } from 'react';
import { capitalize } from '@/lib/sting';
import Modal from '@/components/ui/modal';
import toast from '@/lib/toast';
import {
  cancelInvites,
  resendInvite,
  removeMember,
  leaveTeam,
} from './actions';
import { getErrorMessage } from '@/messages';
import Spinner from '@/components/ui/spinner';
import UpdateNameModal from './components/update-name-modal';
import UpdateRoleModal from './components/update-role-modal';
import ConfirmRemoveModal from './components/confirm-remove-modal';
import LeaveTeamModal from './components/leave-team-modal';
import CancelInviteModal from './components/cancel-invite-modal';
import InviteMemberModal from './components/invite-modal';
import ResendInviteModal from './components/resend-invite-modal';

function TeamManagement() {
  const queryClient = useQueryClient();
  const { team: teamSlug } = useParams();
  const router = useRouter();

  const [state, setState] = useState({
    isDropdownOpen: false,
    selectedMember: null as TeamMemberResponse | null,
    memberToCancel: null as TeamMemberResponse | null,
    dropdownPosition: { top: 0, left: 0 },
    isInviteMemberModalOpen: false,
    isCancelInviteModalOpen: false,
    memberToResendInvite: null as TeamMemberResponse | null,
    isResendInviteModalOpen: false,
    isUpdateNameModalOpen: false,
    isUpdateRoleModalOpen: false,
    isConfirmRemoveModalOpen: false,
    isLeaveTeamModalOpen: false,
  });

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

  const handleRemoveMember = async () => {
    if (!state.selectedMember) return;

    const resp = await removeMember({
      teamSlug: teamSlug as string,
      teamMemberId: state.selectedMember.team_member.id,
    });

    if (resp.success) {
      toast({
        message: 'Member removed successfully',
        mode: 'success',
      });
      queryClient.setQueryData(
        ['teamMembers'],
        (oldData: TeamMemberResponse[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(
            (member) =>
              member.team_member.id !== state.selectedMember?.team_member.id,
          );
        },
      );
    } else {
      toast({
        message: getErrorMessage(resp.code || ''),
        mode: 'error',
      });
    }

    setState((prev) => ({
      ...prev,
      isConfirmRemoveModalOpen: false,
    }));
  };

  const handleCancelInvite = async () => {
    if (!state.memberToCancel) return;

    const resp = await cancelInvites({
      teamSlug: teamSlug as string,
      teamMemberId: state.memberToCancel.team_member.id,
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
            (member) =>
              member.team_member.id !== state.memberToCancel?.team_member.id,
          );
        },
      );
    } else {
      toast({
        message: getErrorMessage(resp.code || ''),
        mode: 'error',
      });
    }

    setState((prev) => ({
      ...prev,
      isCancelInviteModalOpen: false,
      memberToCancel: null,
    }));
  };

  const teamMemberActions = [
    {
      id: 'update-name',
      label: 'Update Name',
      handleClick: () => {
        console.log('update name');
        console.log(state.selectedMember);
        setState((prev) => ({
          ...prev,
          isUpdateNameModalOpen: true,
        }));
      },
    },
    {
      id: 'update-role',
      label: 'Update Role',
      handleClick: () => {
        console.log('update role');
        console.log(state.selectedMember);
        setState((prev) => ({
          ...prev,
          isUpdateRoleModalOpen: true,
        }));
      },
    },
    {
      id: 'remove-member',
      label: 'Remove Member',
      handleClick: () => {
        console.log('remove member');
        console.log(state.selectedMember);
        setState((prev) => ({
          ...prev,
          isConfirmRemoveModalOpen: true,
        }));
      },
    },
  ];

  const pendingMemberActions = [
    {
      id: 'resend-invite',
      label: 'Resend Invite',
      handleClick: () => {
        if (state.selectedMember) {
          setState((prev) => ({
            ...prev,
            memberToResendInvite: state.selectedMember,
            isResendInviteModalOpen: true,
          }));
        }
      },
    },
    {
      id: 'cancel-invite',
      label: 'Cancel Invite',
      handleClick: () => {
        if (state.selectedMember) {
          setState((prev) => ({
            ...prev,
            memberToCancel: state.selectedMember,
            isCancelInviteModalOpen: true,
          }));
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
      handleClick: () => {
        setState((prev) => ({
          ...prev,
          isLeaveTeamModalOpen: true,
        }));
      },
    },
  ];

  const getMenuItems = () => {
    if (state.selectedMember?.team_member.status === 'pending') {
      return pendingMemberActions;
    } else if (state.selectedMember?.user?.id === user?.id) {
      return currentUserActions;
    } else if (state.selectedMember?.team_member.status === 'active') {
      return teamMemberActions;
    }
  };

  const handleInviteMemberSuccess = (newMembers: TeamMemberResponse[]) => {
    console.log('New members:', newMembers);
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

  const handleLeaveTeam = async () => {
    const resp = await leaveTeam({
      teamSlug: teamSlug as string,
    });

    if (resp.success) {
      toast({
        message: 'You have left the team',
        mode: 'success',
      });

      router.push('/');
    } else {
      toast({
        message: getErrorMessage(resp.code || ''),
        mode: 'error',
      });
    }
  };

  const ActionModals = () => {
    return (
      <>
        <CancelInviteModal
          isOpen={state.isCancelInviteModalOpen}
          onClose={() => {
            setState((prev) => ({
              ...prev,
              isCancelInviteModalOpen: false,
              memberToCancel: null,
            }));
          }}
          handleSubmit={handleCancelInvite}
          memberToCancel={state.memberToCancel}
        />

        <InviteMemberModal
          isOpen={state.isInviteMemberModalOpen}
          onClose={() =>
            setState((prev) => ({ ...prev, isInviteMemberModalOpen: false }))
          }
          teamSlug={teamSlug as string}
          onSuccess={handleInviteMemberSuccess}
        />

        <ResendInviteModal
          isOpen={state.isResendInviteModalOpen}
          onClose={() =>
            setState((prev) => ({ ...prev, isResendInviteModalOpen: false }))
          }
          memberToResendInvite={state.memberToResendInvite}
          teamSlug={teamSlug as string}
        />

        <UpdateNameModal
          isOpen={state.isUpdateNameModalOpen}
          onClose={() => {
            setState((prev) => ({
              ...prev,
              isUpdateNameModalOpen: false,
              selectedMember: null,
            }));
          }}
          user={state.selectedMember?.user || null}
        />

        <UpdateRoleModal
          isOpen={state.isUpdateRoleModalOpen}
          onClose={() => {
            setState((prev) => ({
              ...prev,
              isUpdateRoleModalOpen: false,
              selectedMember: null,
            }));
          }}
          member={state.selectedMember}
        />

        <ConfirmRemoveModal
          isOpen={state.isConfirmRemoveModalOpen}
          onClose={() => {
            setState((prev) => ({
              ...prev,
              isConfirmRemoveModalOpen: false,
              selectedMember: null,
            }));
          }}
          member={state.selectedMember}
          handleSubmit={handleRemoveMember}
        />

        <LeaveTeamModal
          isOpen={state.isLeaveTeamModalOpen}
          onClose={() =>
            setState((prev) => ({ ...prev, isLeaveTeamModalOpen: false }))
          }
          handleSubmit={handleLeaveTeam}
        />
      </>
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
      <ActionModals />

      <h1>Team Members</h1>
      <div className="flex flex-col items-end gap-4 pb-16">
        <Button
          variant="unstyled"
          className="btn bg-brand-secondary text-typography-strong"
          handleClick={() =>
            setState((prev) => ({ ...prev, isInviteMemberModalOpen: true }))
          }
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
                  member.team_member.id ===
                    state.selectedMember?.team_member.id &&
                  state.selectedMember !== null
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
                      setState((prev) => ({
                        ...prev,
                        dropdownPosition: {
                          top: rect.top + window.scrollY,
                          left: rect.left + window.scrollX,
                        },
                        isDropdownOpen: !prev.isDropdownOpen,
                        selectedMember: member,
                      }));
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
          top: `${state.dropdownPosition.top}px`,
          left: `${state.dropdownPosition.left}px`,
        }}
      >
        <Dropdown
          position="right"
          open={state.isDropdownOpen}
          onClose={() => {
            setState((prev) => ({
              ...prev,
              isDropdownOpen: false,
              selectedMember: null,
            }));
          }}
          menuItems={getMenuItems()}
        ></Dropdown>
      </div>
    </>
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
