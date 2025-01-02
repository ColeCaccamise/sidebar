import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/confirm`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          code: searchParams.get('code'),
          email: searchParams.get('email'),
        },
        withCredentials: true,
      },
    );

    const setCookie = response.headers['set-cookie'];
    console.log('Set-Cookie:', setCookie);

    if (response.status !== 200) {
      return NextResponse.redirect(
        new URL('/auth/login?error=confirm-email-token-invalid', request.url),
      );
    }

    const redirectUrl = response.data.data.redirect_url || '/dashboard';
    console.log('REDIRECT URL: ', redirectUrl);
    const redirectResponse = NextResponse.redirect(
      new URL(redirectUrl, request.url),
    );

    // Forward the Set-Cookie header from the API response
    if (setCookie) {
      setCookie.forEach((cookie) => {
        redirectResponse.headers.append('Set-Cookie', cookie);
      });
    }

    console.log(redirectResponse);

    return redirectResponse;
  } catch (error) {
    if (error instanceof AxiosError) {
      const errorData = error.response?.data as { code: string } | undefined;

      if (errorData?.code === 'invalid_update_token') {
        return NextResponse.redirect(
          new URL('/settings/account?error=invalid_update_token', request.url),
        );
      }
    }

    return NextResponse.redirect(
      new URL('/auth/confirm-email?error=invalid_token', request.url),
    );
  }
}
