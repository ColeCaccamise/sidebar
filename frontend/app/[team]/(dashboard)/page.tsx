'use client';

import Spinner from '@/components/ui/spinner';
import { useTeamStore } from '@/state/team';
import { useUserStore } from '@/state/user';
import { useState, useEffect } from 'react';

export default function TeamDashboard() {
  // const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { team, isLoading } = useTeamStore();
  const { user } = useUserStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (isLoading || !team) {
    return <Spinner />;
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <h1>
        Good{' '}
        {currentTime.getHours() < 12
          ? 'morning'
          : currentTime.getHours() < 17
            ? 'afternoon'
            : 'evening'}
        {user?.first_name ? `, ${user.first_name}` : ''}!
      </h1>
      <p>You are a member of the {team.name} team.</p>
    </div>
  );
}
