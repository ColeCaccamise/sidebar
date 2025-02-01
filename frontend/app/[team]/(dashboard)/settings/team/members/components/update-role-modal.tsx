import Modal from '@/components/ui/modal';
import { TeamMemberResponse } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import Button from '@/components/ui/button';
import { updateRole } from '../actions';
import toast from '@/lib/toast';
import { getErrorMessage } from '@/messages';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberResponse | null;
  teamSlug: string;
  onSuccess?: (updatedMember: TeamMemberResponse) => void;
}

interface ConfirmUpdateRoleModalProps extends Props {
  newRole: string;
  handleSubmit: () => Promise<void>;
}

const ConfirmUpdateRoleModal = ({
  isOpen,
  onClose,
  member,
  newRole,
  handleSubmit,
}: ConfirmUpdateRoleModalProps) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Confirm Update Role"
      className="w-full max-w-md"
      handleSubmit={handleSubmit}
      submitText="Update Role"
      cancelText="Cancel"
    >
      <p>
        Are you sure you want to update the role of {member?.team_member.email}{' '}
        to <strong>{newRole}</strong>?
      </p>
    </Modal>
  );
};

export default function UpdateRoleModal({
  isOpen,
  onClose,
  member,
  teamSlug,
  onSuccess,
}: Props) {
  const [values, setValues] = useState({
    initial: {
      role: member?.team_member.team_role || 'member',
    },
    current: {
      role: member?.team_member.team_role || 'member',
    },
    isLoading: false,
  });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const isLoading = values.isLoading;
  const roleChanged = values.current.role === values.initial.role;

  const handleChange = (value: string) => {
    setValues((prev) => ({
      ...prev,
      current: {
        ...prev.current,
        role: value,
      },
    }));
  };

  const handleSubmit = async () => {
    const { success, data, code } = await updateRole({
      teamSlug: teamSlug,
      teamMemberId: member?.team_member.id,
      role: values.current.role,
    });

    if (success) {
      toast({
        message: 'Role updated',
        mode: 'success',
      });

      console.log('the data', data);
      onSuccess?.(data);

      onClose();
    } else {
      toast({
        message: getErrorMessage(code || ''),
        mode: 'error',
      });
    }

    setIsConfirmModalOpen(false);
  };

  return (
    <>
      {isConfirmModalOpen && (
        <ConfirmUpdateRoleModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          member={member}
          newRole={values.current.role}
          handleSubmit={handleSubmit}
          teamSlug={teamSlug}
        />
      )}
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Update Role"
        className="w-full max-w-lg"
      >
        <div className="flex flex-col gap-4">
          <p>
            Update team role for <strong>{member?.team_member.email}</strong>
          </p>

          <Select value={values.current.role} onValueChange={handleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
            </SelectContent>
          </Select>

          <Button
            className="w-full"
            disabled={roleChanged || isLoading}
            handleClick={() => setIsConfirmModalOpen(true)}
          >
            Update Role
          </Button>
        </div>
      </Modal>
    </>
  );
}
