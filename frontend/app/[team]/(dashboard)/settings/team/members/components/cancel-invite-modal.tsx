import Modal from '@/components/ui/modal';
import { TeamMemberResponse } from '@/types';

export default function CancelInviteModal({
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
