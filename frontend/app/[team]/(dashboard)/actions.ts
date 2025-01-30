'use server';

import api from '@/lib/axios';
import { parseJwt } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logout() {
  await api
    .post('/auth/logout', {
      withCredentials: true,
    })
    .then((res) => {
      const setCookieHeaders = res.headers?.['set-cookie'];
      if (setCookieHeaders) {
        setCookieHeaders.forEach((cookie) => {
          const [name, ...parts] = cookie.split('=');
          const value = parts.join('=').split(';')[0];
          cookies().set(name, value);
        });
      }

      redirect('/');
    });
}

export async function switchTeam(teamSlug: string) {
  const jwt = cookies().get('auth-token')?.value as string;
  const jwtPayload = parseJwt(jwt);
  const currentTeamSlug = jwtPayload.team_slug;

  if (currentTeamSlug === teamSlug) {
    return;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const redirectUrl = `${apiUrl}/teams/${teamSlug}/switch`;
  redirect(redirectUrl);
}
