import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseJwt } from '@/lib/jwt';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    console.log('refresh route');
    const cookieStore = cookies();
    const { searchParams } = new URL(request.url);
    const redirect = searchParams.get('redirect');
    console.log('redirect', redirect);

    const authToken = cookieStore.get('auth-token')?.value;
    const parsedAuth = parseJwt(authToken ?? '');

    if (parsedAuth) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const { data } = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
      {
        withCredentials: true,
      },
    );

    const { access_token, refresh_token } = data;

    console.log('access_token', access_token);
    console.log('refresh_token', refresh_token);

    return NextResponse.json({
      access_token,
      refresh_token,
    });

    // return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    // return NextResponse.redirect(new URL('/auth/login', request.url));
    return NextResponse.json({
      error: 'Failed to refresh token',
    });
  }
}
