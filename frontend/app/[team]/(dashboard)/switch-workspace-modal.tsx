import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { Team, Workspace } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SwitchWorkspaceModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspaces: Workspace[];
  workspace: Workspace;
  switchWorkspace: (slug: string) => void;
}

export default function SwitchWorkspaceModal(props: SwitchWorkspaceModalProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null,
  );
  const [selectedNewWorkspace, setSelectedNewWorkspace] = useState(false);
  const router = useRouter();

  const handleSubmit = () => {
    if (selectedWorkspace) {
      props.switchWorkspace(selectedWorkspace.slug);
      props.setOpen(false);
    } else {
      setSelectedNewWorkspace(true);
      setSelectedWorkspace(null);
      router.push('/onboarding/workspace');
    }
  };

  return (
    <Modal
      open={props.open}
      setOpen={props.setOpen}
      title="Switch team"
      className="w-full max-w-lg"
      onClose={() => {
        setSelectedWorkspace(null);
        props.setOpen(false);
      }}
    >
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-typography-weak">
            Select a team to switch to
          </p>
          <div className="grid gap-4">
            {props.workspaces?.map((w: Workspace) => (
              <button
                key={w.id}
                onClick={() => {
                  if (props?.workspace?.id !== w.id) {
                    setSelectedWorkspace(w);
                    setSelectedNewWorkspace(false);
                  }
                }}
                disabled={props?.workspace?.id === w.id}
                className={`flex items-center justify-between rounded-lg border outline-none ${
                  selectedWorkspace?.id === w.id && !selectedNewWorkspace
                    ? 'border-stroke-medium'
                    : 'border-stroke-weak'
                } bg-background p-4 text-left hover:bg-fill disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stroke-weak bg-fill">
                    <span className="text-sm font-medium">
                      {w.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-xs text-typography-weak">
                      {process.env.NEXT_PUBLIC_APP_URL}/{w.slug}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            <button
              onClick={() => {
                setSelectedNewWorkspace(true);
              }}
              className={`flex items-center justify-between rounded-lg border bg-background p-4 text-left hover:bg-fill ${
                selectedNewWorkspace
                  ? 'border-stroke-medium'
                  : 'border-stroke-weak'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stroke-weak bg-fill">
                  <span className="text-sm font-medium">+</span>
                </div>
                <div>
                  <p className="font-medium">Create or join a new team</p>
                  <p className="text-xs text-typography-weak">
                    Start fresh with a new team
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedWorkspace && !selectedNewWorkspace}
          className="w-full"
        >
          {selectedNewWorkspace
            ? 'Create or join a workspace'
            : 'Switch workspace'}
        </Button>
      </div>
    </Modal>
  );
}
