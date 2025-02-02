'use server';

import api from '@/lib/api';
import { ApiResponse } from '@/types';
import axios from 'axios';
import { cookies } from 'next/headers';

export default async function getOauthUrl({
  provider,
  redirectUrl,
}: {
  provider: 'google' | 'github';
  redirectUrl?: string;
}): Promise<{
  success: boolean;
  redirectUrl?: string;
  error?: string;
  code?: string;
}> {
  if (provider === 'google') {
    try {
      const res = await api.get<ApiResponse>(`/auth/authorize/GoogleOAuth`, {
        params: {
          redirect: redirectUrl,
        },
      });

      // set cookies from response
      const cookieHeader = res.headers['set-cookie'];
      if (cookieHeader) {
        cookieHeader.forEach((cookie) => {
          const [name, ...rest] = cookie.split('=');
          const value = rest.join('=').split(';')[0];
          cookies().set(name, value);
        });
      }

      return {
        success: true,
        redirectUrl: res.data.data.redirect_url,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error,
          code: error.response?.data?.code,
        };
      }
    }
  } else if (provider === 'github') {
    try {
      const res = await api.get<ApiResponse>(`/auth/authorize/GitHubOAuth`, {
        params: {
          redirect: redirectUrl,
        },
      });

      // set cookies from response
      const cookieHeader = res.headers['set-cookie'];
      if (cookieHeader) {
        cookieHeader.forEach((cookie) => {
          const [name, ...rest] = cookie.split('=');
          const value = rest.join('=').split(';')[0];
          cookies().set(name, value);
        });
      }

      return {
        success: true,
        redirectUrl: res.data.data.redirect_url,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error,
          code: error.response?.data?.code,
        };
      }
    }
  }

  return {
    success: false,
    error: 'Invalid provider',
    code: 'invalid_provider',
  };
}
