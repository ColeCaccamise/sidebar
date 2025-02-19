import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { User } from '@/types';
import axios, { AxiosError } from 'axios';
import { notFound } from 'next/navigation';

const getGreeting = (user: User | null | undefined) => {
  const name = user?.first_name ? `${user.first_name}` : '';

  const hour = new Date().getHours();
  if (hour < 12) return `Good morning${name ? `, ${name}` : ''}.`;
  if (hour < 17) return `Good afternoon${name ? `, ${name}` : ''}.`;
  return `Good evening${name ? `, ${name}` : ''}.`;
};

const getWeather = async () => {
  try {
    const res = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=42.8864&lon=-78.8784&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`,
    );
    const data = res.data;
    return { ok: true, data };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { ok: false, error: error.response?.data };
    }
    return { ok: false, error: 'Something went wrong.' };
  }
};

const getUser = async () => {
  try {
    const res = await api.get<{ data: { user: User } }>(`/auth/identity`);
    const { data } = res.data;
    const { user } = data;

    return { ok: true, user };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { ok: false, error: error.response?.data };
    }
    return { ok: false, error: 'Something went wrong.' };
  }
};

export default async function TeamDashboard() {
  const weather = await getWeather();
  const time = new Date().toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
  });

  const response = await getUser();
  const user = response.ok ? response.user : null;

  return (
    <div className="flex flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{getGreeting(user)}</h1>
      <p className="text-base">
        It&apos;s currently <b>{time}</b> in Buffalo, New York. The weather is{' '}
        <b>{weather.data.weather[0].description}</b> with a temperature of{' '}
        {Math.round(weather.data.main.temp)}°F.
      </p>
    </div>
  );
}
