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

type Props = {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberResponse | null;
};

function ConfirmUpdateRoleModal({ isOpen, onClose, member }: Props) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Confirm Update Role"
      className="w-full max-w-md"
    >
      <p>
        Are you sure you want to update the role of {member?.user?.first_name}{' '}
        {member?.user?.last_name} to {member?.team_member.team_role}?
      </p>
    </Modal>
  );
}

export default function UpdateRoleModal({ isOpen, onClose, member }: Props) {
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsConfirmModalOpen(true);
  };

  return (
    <>
      <ConfirmUpdateRoleModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        member={member}
      />
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Update Role"
        className="w-full max-w-lg"
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
            type="submit"
            disabled={roleChanged || isLoading}
          >
            Update Role
          </Button>
        </form>
      </Modal>
    </>
  );
}
