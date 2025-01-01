'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { Team } from '@/types';

export default function SwitchTeam() {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    api.get('/teams').then((res) => {
      setTeams(res.data);
    });
  }, []);

  return (
    <div>
      <h1>Switch Team</h1>
      <div>
        {teams.map((team) => (
          <div key={team.id}>{team.name}</div>
        ))}
      </div>
    </div>
  );
}
