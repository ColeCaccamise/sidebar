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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<string>('');

  async function getTeam() {
    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSlug}`,
      {
        withCredentials: true,
      },
    );
    console.log('res 21: ', res);
    setTeam(res.data.data.team);
    setLoading(false);
  }

  async function getLocation() {
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          },
        );

        const { latitude, longitude } = position.coords;
        const response = await axios.get(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        );
        setLocation(
          `${response.data.city}, ${response.data.principalSubdivision}`,
        );
      } catch (error) {
        console.error('Error getting location:', error);
        setLocation('Location unavailable');
      }
    } else {
      setLocation('Geolocation not supported');
    }
  }

  useEffect(() => {
    getTeam();
    getLocation();
  }, []);

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
      <div className="flex flex-col gap-2">
        <h1>
          Good{' '}
          {currentTime.getHours() < 12
            ? 'morning'
            : currentTime.getHours() < 17
              ? 'afternoon'
              : 'evening'}
          , Cole!
        </h1>
        <p className="text-muted-foreground text-sm">
          {currentTime.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
          })}{' '}
          · {location}
        </p>
      </div>
    );
  }
}
