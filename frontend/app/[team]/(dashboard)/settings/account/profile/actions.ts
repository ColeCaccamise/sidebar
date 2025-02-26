'use server';

import { ApiResponse, User } from '@/types';

import axios from 'axios';
import { cookies } from 'next/headers';
import { parseNextCookie } from '@/lib/cookie';
import api from '@/lib/api';
import { getErrorMessage } from '@/messages';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function updateUser({
  firstName,
  lastName,
}: {
  firstName?: string;
  lastName?: string;
}) {
  try {
    const response = await api.patch(`${apiUrl}/users`, {
      first_name: firstName,
      last_name: lastName,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (error instanceof Error && 'response' in error) {
      const apiError = error as unknown as ApiResponse;
      return {
        success: false,
        error: getErrorMessage(apiError.code || ''),
      };
    }

    return {
      success: false,
      error: 'There was a problem updating your account.',
    };
  }
}

export async function updateUserEmail({
  email,
}: {
  email: string;
}) {
  if (!email) return;

  const cookieStore = cookies();

  const response = await axios
    .patch(
      `${apiUrl}/users/email`,
      { email },
      {
        headers: {
          Cookie: cookieStore
            .getAll()
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join('; '),
        },
      },
    )
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      return err.response.data;
    });

  return response;
}

export async function resendUpdateEmailConfirmation({
  user,
}: {
  user: User | null;
}) {
  const response = await axios.post(
    `${apiUrl}/users/resend-email`,
    {
      email: user?.email,
    },
    {
      headers: { Cookie: `auth-token=${cookies().get('auth-token')?.value}` },
    },
  );
  return response.data;
}

export async function verifyPassword({
  password,
}: {
  password: string;
}): Promise<ApiResponse> {
  return await axios
    .post(
      `${apiUrl}/auth/verify-password`,
      {
        password,
      },
      {
        headers: { Cookie: `auth-token=${cookies().get('auth-token')?.value}` },
      },
    )
    .then(async (res) => {
      const setCookieHeader: string | string[] | undefined =
        res.headers['set-cookie'];
      if (setCookieHeader) {
        const cookieStore = cookies();

        setCookieHeader.forEach((c) => {
          const parsed = parseNextCookie(c);
          cookieStore.set(parsed.name, parsed.value, parsed.options);
        });
      }
      return res.data;
    })
    .catch((err) => {
      return err.response.data;
    });
}

export async function uploadAvatar({
  formData,
}: {
  formData: FormData;
}): Promise<ApiResponse> {
  if (!formData) {
    return {
      success: false,
      error: 'Missing required data',
      code: 'invalid_request',
    };
  }

  try {
    const response = await api.patch('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data) {
      return {
        success: false,
        error: err.response.data.message,
        code: err.response.data.code,
      };
    }

    return {
      success: false,
      error: 'There was a problem updating your avatar.',
    };
  }
}

export async function deleteAvatar() {
  try {
    const response = await axios
      .delete(`${apiUrl}/users/avatar`, {
        headers: { Cookie: `auth-token=${cookies().get('auth-token')?.value}` },
      })
      .then((res) => res)
      .catch((err) => {
        // Handle network errors when server is down
        if (!err.response) {
          console.error('Network error - server may be down:', err);
          throw new Error('Unable to connect to server');
        }
        return err.response;
      });

    if (response.status === 204) {
      return null;
    }

    throw new Error(`Unexpected status code: ${response.status}`);
  } catch (err) {
    console.error('Error deleting avatar:', err);
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        return 'Unable to connect to server. Please try again later.';
      }
      return err.response?.data || err.message;
    }
    return err;
  }
}

export async function changePassword({
  oldPassword,
  newPassword,
  confirmNewPassword,
}: {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<{
  message: string;
  error: string;
  code: string;
}> {
  try {
    const response = await axios.patch(
      `${apiUrl}/users/change-password`,
      {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      },
      {
        headers: { Cookie: `auth-token=${cookies().get('auth-token')?.value}` },
      },
    );

    if (response.status === 200) {
      return response.data;
    }

    throw new Error(`Unexpected status code: ${response.status}`);
  } catch (err) {
    console.error('Error changing password:', err);
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        return {
          message: 'Unable to connect to server. Please try again later.',
          error: 'connection_error',
          code: 'connection_error',
        };
      }
      return err.response.data;
    }
    return {
      message: 'An unexpected error occurred',
      error: 'An unexpected error occurred',
      code: 'internal_server_error',
    };
  }
}

export async function deleteSessions() {
  const response = await axios
    .delete(`${apiUrl}/auth/sessions`, {
      headers: { Cookie: `auth-token=${cookies().get('auth-token')?.value}` },
    })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      return err.response.data;
    });

  return response;
}

export async function deleteAccount({
  email,
  reason,
  otherReason,
}: {
  email: string;
  reason: string;
  otherReason: string;
}): Promise<ApiResponse> {
  if (!email || !reason || (reason === 'other' && !otherReason)) {
    console.log('Please fill in all fields');
    return {
      success: false,
      error: 'Please fill in all fields',
      code: 'invalid_request',
    };
  }

  const response = await axios
    .post(
      `${apiUrl}/users/delete`,
      {
        email,
        reason,
        other_reason: otherReason,
      },
      {
        headers: { Cookie: `auth-token=${cookies().get('auth-token')?.value}` },
      },
    )
    .then((res) => {
      console.log('res', res);
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        const parsedCookies = setCookie.map((cookie) =>
          parseNextCookie(cookie),
        );
        parsedCookies.forEach((cookie) => {
          cookies().set(cookie.name, cookie.value, cookie.options);
        });
      }
      return res.data;
    })
    .catch((err) => {
      console.log('err', err);
      return err.response.data;
    });

  return response;
}
