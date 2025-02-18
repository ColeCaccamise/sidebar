'use server';

import api from '@/lib/axios';
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
