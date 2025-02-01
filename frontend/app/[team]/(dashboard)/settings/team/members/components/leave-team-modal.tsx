import Modal from '@/components/ui/modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  handleSubmit: () => void;
};

export default function LeaveTeamModal({
  isOpen,
  onClose,
  handleSubmit,
}: Props) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Leave Team"
      handleSubmit={handleSubmit}
      submitText="Leave Team"
      className="w-full max-w-lg"
    >
      <p>
        Are you sure you want to leave this team? This action is irreversible
        and you will lose access to all team resources.
      </p>
    </Modal>
  );
}
