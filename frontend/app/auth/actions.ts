'use server';

import axios from 'axios';

export default async function getOauthUrl({
  provider,
}: {
  provider: 'google' | 'github';
}): Promise<{
  success: boolean;
  redirectUrl?: string;
  error?: string;
  code?: string;
}> {
  if (provider === 'google') {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/authorize/GoogleOAuth`,
      );
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
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/authorize/GitHubOAuth`,
      );
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
