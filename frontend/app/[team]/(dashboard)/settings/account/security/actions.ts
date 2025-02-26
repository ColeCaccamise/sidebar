'use server';

import axios from 'axios';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import api from '@/lib/api';

export async function revokeSession(sessionId: string) {
  const { cookies } = await import('next/headers');
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token');

  const response = await axios
    .delete(`${process.env.NEXT_PUBLIC_API_URL}/auth/sessions/${sessionId}`, {
      withCredentials: true,
      headers: {
        Cookie: `auth-token=${authToken?.value}`,
      },
    })
    .then((res) => res.data)
    .catch((err) => err.response.data);

  return response;
}

export async function revokeAllSessions(): Promise<{
  success: boolean;
  error?: string;
  data?: any;
}> {
  const { cookies } = await import('next/headers');
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token');

  const response = await api.delete<{
    success: boolean;
    error?: string;
    data?: any;
  }>('/auth/sessions')
    .then((res) => res.data)
    .catch((err) => err.response.data);

  return response;
}

export async function handleLogout() {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`;

  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
      {
        withCredentials: true,
      },
    );

    const setCookies = res.headers['set-cookie'];
    const cookieStore = cookies();
    setCookies?.forEach((cookie) => {
      const [name, ...parts] = cookie.split('=');
      const value = parts.join('=').split(';')[0];
      cookieStore.set(name, value);
    });

    redirect(res.data.data.redirect_url || loginUrl);
  } catch (error) {
    console.error('error logging out: ', error);
    redirect(loginUrl);
  }
}
