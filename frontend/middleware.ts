import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

export async function middleware(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const cookieStore = cookies();
  const pathname = request.nextUrl.pathname;

  // Allow legal pages to be accessed without authentication
  if (pathname.startsWith('/legal')) {
    return NextResponse.next();
  }

  if (!apiUrl) {
    console.error('NEXT_PUBLIC_API_URL is not defined');
    return NextResponse.next();
  }

  try {
    // TODO: retain the initial request url to be redirected back to after login

    const response = await axios
      .get(`${apiUrl}/auth/identity`, {
        headers: {
          Cookie: `auth-token=${cookieStore.get('auth-token')?.value}`,
        },
        withCredentials: true,
      })
      .then((res) => res)
      .catch((err) => err.response);

    const authPath = pathname.startsWith('/auth');
    const isPasswordPath =
      pathname.startsWith('/auth/forgot-password') ||
      pathname.startsWith('/auth/change-password');

    // attempt to refresh the auth token
    if (response.status === 401) {
      const refreshToken = request.cookies.get('refresh-token')?.value;
      if (refreshToken) {
        const refreshResponse = await axios
          .get(`${apiUrl}/auth/refresh`, {
            headers: {
              Cookie: `refresh-token=${refreshToken}`,
            },
            withCredentials: true,
          })
          .then((res) => res)
          .catch((err) => err.response);

        if (refreshResponse.status === 200) {
          // Set cookies from the refresh response
          const response = NextResponse.next();

          if (authPath && !isPasswordPath && pathname !== '/auth/confirm') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }

          if (pathname === '/') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }

          const cookies = refreshResponse.headers['set-cookie'];
          if (cookies) {
            if (Array.isArray(cookies)) {
              cookies.forEach((cookie) => {
                response.headers.append('Set-Cookie', cookie);
              });
            } else if (typeof cookies === 'string') {
              response.headers.append('Set-Cookie', cookies);
            }
          }

          return response;
        }
      }
      if (response.data?.code === 'session_expired' && !authPath) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.append('error', 'session_expired');
        return NextResponse.redirect(loginUrl);
      }

      if (!authPath) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }

      return NextResponse.next();
    }

    // User exists and is authenticated
    const userData = response.data;

    const emailConfirmed = userData && userData.email_confirmed;
    const updateEmailRequested = userData && userData.updated_email;

    const nextResponse = NextResponse.next();

    // Add cookies from the original response to all responses
    const cookies = response.headers['set-cookie'];

    if (cookies) {
      if (Array.isArray(cookies)) {
        cookies.forEach((cookie) => {
          nextResponse.headers.append('Set-Cookie', cookie);
        });
      } else {
        nextResponse.headers.append('Set-Cookie', cookies);
      }
    }

    if (
      userData &&
      emailConfirmed &&
      pathname.startsWith('/auth/confirm-email')
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (
      (updateEmailRequested && pathname.startsWith('/auth/confirm')) ||
      (!emailConfirmed && pathname.startsWith('/auth/confirm'))
    ) {
      return nextResponse;
    }

    if (
      !emailConfirmed &&
      userData &&
      !pathname.startsWith('/auth/confirm-email')
    ) {
      return NextResponse.redirect(new URL('/auth/confirm-email', request.url));
    }

    if (
      !emailConfirmed &&
      userData &&
      pathname.startsWith('/auth/confirm-email')
    ) {
      return nextResponse;
    }

    if (!emailConfirmed && userData && !pathname.startsWith('/auth/confirm')) {
      return NextResponse.redirect(new URL('/auth/confirm-email', request.url));
    }

    if (userData) {
      if (
        (authPath && !isPasswordPath && pathname !== '/dashboard') ||
        pathname === '/'
      ) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return nextResponse;
  } catch (err) {
    const pathname = request.nextUrl.pathname;
    const authPath = pathname.startsWith('/auth');
    const emailConfirmed = pathname.startsWith('/auth/confirm-email');

    if (!authPath || emailConfirmed) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
