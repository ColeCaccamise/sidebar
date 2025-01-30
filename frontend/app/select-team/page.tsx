import SelectTeamForm from './select-team-form';

export default function SelectTeam({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const token = (searchParams.token as string) || '';
  const teams = searchParams.teams
    ? JSON.parse(searchParams.teams as string)
    : [];

  return (
    <>
      <SelectTeamForm teams={teams} token={token} />
    </>
  );
}
