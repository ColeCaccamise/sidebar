'use client';

import Spinner from '@/components/ui/spinner';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function TeamDashboard() {
  const params = useParams();
  const teamSlug = params.team as string;
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function getTeam() {
    // const res = await axios.get(
    //   `${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSlug}`,
    //   {
    //     withCredentials: true,
    //   },
    // );
    // return res.data.data;

    if (teamSlug === 'caccamedia') {
      setTeam({
        name: 'Caccamedia',
        slug: 'caccamedia',
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    getTeam();
  }, []);

  if (loading) {
    return <Spinner />;
  }

  if (!team) {
    return <div>Team not found</div>;
  } else {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4">
        <p>Team: {team.name}</p>
      </div>
    );
  }
}
