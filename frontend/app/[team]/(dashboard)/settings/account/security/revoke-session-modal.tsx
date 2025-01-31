import Modal from '@/components/ui/modal';
import { Session } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

export default function RevokeSessionModal({
  revokeModalOpen,
  setRevokeModalOpen,
  selectedSessionId,
  setSelectedSessionId,
  revokeSession,
}: {
  revokeModalOpen: boolean;
  setRevokeModalOpen: (open: boolean) => void;
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  revokeSession: (id: string) => Promise<{ error: boolean; code: string }>;
}) {
  const queryClient = useQueryClient();

  return (
    <Modal
      title="Revoke session?"
      open={revokeModalOpen}
      submitText="Revoke session"
      showSubmitButton={true}
      onClose={() => {
        setSelectedSessionId(null);
        setRevokeModalOpen(false);
      }}
      handleSubmit={async () => {
        if (!selectedSessionId) return;

        const res = await revokeSession(selectedSessionId);
        if (!res.error) {
          queryClient.setQueryData(['sessions'], (oldData: any) => ({
            ...oldData,
            sessions: oldData.sessions.filter(
              (s: Session) => s.id !== selectedSessionId,
            ),
          }));
          setSelectedSessionId(null);
          setRevokeModalOpen(false);
        } else {
          setRevokeModalOpen(false);
          console.error(res.code);
        }
      }}
    >
      <div className="flex flex-col gap-2">
        <p>Are you sure you want to revoke access to this device?</p>
      </div>
    </Modal>
  );
}
