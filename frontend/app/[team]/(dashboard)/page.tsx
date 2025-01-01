'use client';

import Spinner from '@/components/ui/spinner';
import { Team } from '@/types';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function TeamDashboard() {
  const params = useParams();
  const teamSlug = params.team as string;
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    async function getTeam() {
      const res = await axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSlug}`, {
          withCredentials: true,
        })
        .then((resp) => resp.data.data.team)
        .catch(() => null);
      setTeam(res);
      setLoading(false);
    }

    getTeam();
  }, [teamSlug]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <Spinner />;
  }

  if (!team) {
    return <div>Team not found</div>;
  } else {
    return (
      <div className="flex w-full flex-col gap-2">
        <h1>
          Good{' '}
          {currentTime.getHours() < 12
            ? 'morning'
            : currentTime.getHours() < 17
              ? 'afternoon'
              : 'evening'}
          , Cole!
        </h1>
      </div>
    );
  }
}
