import Modal from '@/components/ui/modal';
import { TeamMemberResponse } from '@/types';
import { resendInvite } from '../actions';
import { getErrorMessage } from '@/messages';
import toast from '@/lib/toast';

export default function ResendInviteModal({
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
