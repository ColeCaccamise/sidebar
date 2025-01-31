import Modal from '@/components/ui/modal';
import { Session } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

export default function RevokeAllSessionsModal({
  revokeAllModalOpen,
  setRevokeAllModalOpen,
  revokeAllSessions,
  currentSessionId,
}: {
  revokeAllModalOpen: boolean;
  setRevokeAllModalOpen: (open: boolean) => void;
  revokeAllSessions: () => Promise<{ error: boolean; code: string }>;
  currentSessionId: string;
}) {
  const queryClient = useQueryClient();

  return (
    <Modal
      title="Revoke all sessions?"
      open={revokeAllModalOpen}
      submitText="Revoke all sessions"
      onClose={() => {
        setRevokeAllModalOpen(false);
      }}
      handleSubmit={async () => {
        const res = await revokeAllSessions();
        if (!res.error) {
          queryClient.setQueryData(['sessions'], (oldData: any) => ({
            ...oldData,
            sessions: oldData.sessions.filter(
              (s: Session) => s.id === currentSessionId,
            ),
          }));
          setRevokeAllModalOpen(false);
        } else {
          console.error(res.code);
        }
      }}
    >
      <div className="flex flex-col gap-2">
        <p>Are you sure you want to revoke access to all devices?</p>
      </div>
    </Modal>
  );
}
