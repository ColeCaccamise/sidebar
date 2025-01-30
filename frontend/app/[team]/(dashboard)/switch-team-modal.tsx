import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { Team } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SwitchTeamModal(props: {
  open: boolean;
  setOpen: (open: boolean) => void;
  teams: Team[];
  team: Team;
  switchTeam: (slug: string) => void;
}) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedNewTeam, setSelectedNewTeam] = useState(false);
  const router = useRouter();
  return (
    <Modal
      open={props.open}
      setOpen={props.setOpen}
      title="Switch team"
      className="w-full max-w-lg"
      onClose={() => {
        setSelectedTeam(null);
        props.setOpen(false);
      }}
    >
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-typography-weak">
            Select a team to switch to
          </p>
          <div className="grid gap-4">
            {props.teams?.map((t: Team) => (
              <button
                key={t.id}
                onClick={() => {
                  if (props?.team?.id !== t.id) {
                    setSelectedTeam(t);
                    setSelectedNewTeam(false);
                  }
                }}
                disabled={props?.team?.id === t.id}
                className={`flex items-center justify-between rounded-lg border outline-none ${
                  selectedTeam?.id === t.id && !selectedNewTeam
                    ? 'border-stroke-medium'
                    : 'border-stroke-weak'
                } bg-background p-4 text-left hover:bg-fill disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stroke-weak bg-fill">
                    <span className="text-sm font-medium">
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-typography-weak">
                      {process.env.NEXT_PUBLIC_APP_URL}/{t.slug}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            <button
              onClick={() => {
                setSelectedNewTeam(true);
              }}
              className={`flex items-center justify-between rounded-lg border bg-background p-4 text-left hover:bg-fill ${
                selectedNewTeam ? 'border-stroke-medium' : 'border-stroke-weak'
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
          handleClick={() => {
            setSelectedNewTeam(true);
            setSelectedTeam(null);
            router.push('/onboarding/team');
          }}
          disabled={!selectedTeam && !selectedNewTeam}
          className="w-full"
        >
          {selectedNewTeam ? 'Create or join a team' : 'Switch team'}
        </Button>
      </div>
    </Modal>
  );
}
