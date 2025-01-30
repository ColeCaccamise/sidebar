'use client';

import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { SelectTeamOptions } from '@/types';
import { useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShieldIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';
import Spinner from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';

export default function SelectTeamForm({
  teams,
  token,
}: {
  teams: SelectTeamOptions[];
  token: string;
}) {
  const [value, setValue, removeValue] = useLocalStorage<{
    chosenTeam: SelectTeamOptions | null;
    token: string;
    teams: SelectTeamOptions[];
  }>('select-team-data', {
    chosenTeam: null,
    token: token,
    teams: teams,
  });
  const [teamData, setTeamData] = useState<SelectTeamOptions[]>(
    value.teams || teams,
  );
  const [chosenTeam, setChosenTeam] = useState<SelectTeamOptions | null>(
    value.chosenTeam,
  );
  const submitUrl = `${process.env.NEXT_PUBLIC_API_URL}/teams/select?token=${token || value.token}&org_id=${chosenTeam?.id}`;
  const router = useRouter();

  useEffect(() => {
    if (teams.length > 0 && token) {
      setValue({
        chosenTeam: chosenTeam,
        token: token,
        teams: teams,
      });
    } else {
      setTeamData(value.teams || teams);
    }
  }, [chosenTeam, token, teams, setValue]);

  const handleClose = () => {
    router.push('/logout');
    removeValue();
  };

  useEffect(() => {
    if (teamData.length === 0) {
      router.push('/auth/login');
      removeValue();
    }
  }, [teamData, router, removeValue]);

  if (teamData.length > 0 || teams.length > 0) {
    return (
      <>
        <Modal
          open={true}
          className="w-full max-w-xl"
          cancelText="Nevermind, log me out"
          onClose={handleClose}
        >
          <div className="flex flex-col gap-6">
            <ShieldIcon className="h-10 w-10 text-brand" />
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold">Select your team</h1>
              <p className="text-sm text-typography-weak">
                Choose which team you'd like to log in with
              </p>
            </div>
            <form
              action={submitUrl}
              className="flex flex-col gap-2"
              method="POST"
            >
              <RadioGroup
                value={chosenTeam?.id}
                onValueChange={(value) => {
                  const team = teamData.find((t) => t.id === value);
                  setChosenTeam(team || null);
                }}
                className="flex flex-col gap-4"
              >
                {teamData.map((team) => (
                  <label
                    key={team.id}
                    htmlFor={team.id}
                    className={`flex w-full cursor-pointer flex-row items-center gap-4 rounded-md border p-4 ${
                      chosenTeam?.id === team.id
                        ? 'border-stroke-medium bg-fill-solid'
                        : 'border-stroke-weak hover:bg-fill'
                    }`}
                  >
                    <RadioGroupItem value={team.id} id={team.id} />
                    <span className="select-none text-sm font-bold text-typography-strong">
                      {team.name}
                    </span>
                  </label>
                ))}
              </RadioGroup>

              <Button
                className="mt-4 w-full"
                type="submit"
                disabled={!chosenTeam}
              >
                Continue
              </Button>

              {chosenTeam && (
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox id="always-login" />
                  <label
                    htmlFor="always-login"
                    className="cursor-pointer select-none text-sm text-typography-weak"
                  >
                    Always log in as this team
                  </label>
                </div>
              )}
            </form>
          </div>
        </Modal>
      </>
    );
  } else {
    return <Spinner />;
  }
}
