import Modal from '@/components/ui/modal';
import { TeamMemberResponse } from '@/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberResponse | null;
  handleSubmit: () => void;
};

export default function ConfirmRemoveModal({
  isOpen,
  onClose,
  member,
  handleSubmit,
}: Props) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Remove Member"
      handleSubmit={handleSubmit}
      submitText="Remove"
      className="w-full max-w-lg"
      destructive
    >
      <p>
        Are you sure you want to remove {member?.team_member.email} from the
        team? from the team?
      </p>
    </Modal>
  );
}
