import api from '@/lib/api';
import { handleApiError } from '@/lib/error';
import { RawApiResponse } from '@/types';
import { parseNextCookie } from '@/lib/cookie';
import { cookies } from 'next/headers';

export async function logout() {
  try {
    const {
      data: { data, code },
      headers,
    } = await api.post<RawApiResponse>('/auth/logout');

    // parse and set cookie from response
    const setCookie = headers['set-cookie'];
    if (setCookie) {
      const cookie = parseNextCookie(setCookie[0]);
      cookies().set(cookie);
    }

    return {
      success: true,
      data,
      code,
    };
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
