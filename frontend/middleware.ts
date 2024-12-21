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
          // Successfully refreshed token - set cookies and continue
          const response = NextResponse.next();

          const setCookieHeader = refreshResponse.headers['set-cookie'];
          if (setCookieHeader) {
            if (Array.isArray(setCookieHeader)) {
              setCookieHeader.forEach((cookie) => {
                response.headers.append('Set-Cookie', cookie);
              });
            } else {
              response.headers.append('Set-Cookie', setCookieHeader);
            }
          }

          return response;
        }
      }

      // Refresh failed - redirect to login
      if (response.data?.code === 'session_expired' && !authPath) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.append('error', 'session_expired');
        request.nextUrl.searchParams.forEach((value, key) => {
          if (key !== 'error') loginUrl.searchParams.append(key, value);
        });
        return NextResponse.redirect(loginUrl);
      }

      if (!authPath) {
        const loginUrl = new URL('/auth/login', request.url);
        request.nextUrl.searchParams.forEach((value, key) => {
          loginUrl.searchParams.append(key, value);
        });
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.next();
    }

    // User exists and is authenticated
    const userData = response.data;

    const emailConfirmed = userData && userData.email_confirmed;
    const updateEmailRequested = userData && userData.updated_email;
    const termsAccepted = userData && userData.terms_accepted;
    const teamCreatedOrJoined = userData && userData.team_created_or_joined;
    const teammatesInvited = userData && userData.teammates_invited;
    const onboardingCompleted = userData && userData.onboarding_completed;

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

    // Check terms acceptance and onboarding status
    if (userData && !pathname.startsWith('/auth')) {
      if (!termsAccepted && !pathname.startsWith('/onboarding/terms')) {
        const redirectUrl = new URL('/onboarding/terms', request.url);
        request.nextUrl.searchParams.forEach((value, key) => {
          redirectUrl.searchParams.append(key, value);
        });
        const redirect = NextResponse.redirect(redirectUrl);
        cookies?.forEach((cookie) =>
          redirect.headers.append('Set-Cookie', cookie),
        );
        return redirect;
      }
      if (
        termsAccepted &&
        !teamCreatedOrJoined &&
        !pathname.startsWith('/onboarding/team')
      ) {
        const redirectUrl = new URL('/onboarding/team', request.url);
        request.nextUrl.searchParams.forEach((value, key) => {
          redirectUrl.searchParams.append(key, value);
        });
        const redirect = NextResponse.redirect(redirectUrl);
        cookies?.forEach((cookie) =>
          redirect.headers.append('Set-Cookie', cookie),
        );
        return redirect;
      }
      if (
        termsAccepted &&
        teamCreatedOrJoined &&
        !teammatesInvited &&
        !pathname.match(/^\/[^/]+\/onboarding\/invite/)
      ) {
        const redirectUrl = new URL(
          `/${userData.default_team_slug}/onboarding/invite`,
          request.url,
        );
        request.nextUrl.searchParams.forEach((value, key) => {
          redirectUrl.searchParams.append(key, value);
        });
        const redirect = NextResponse.redirect(redirectUrl);
        cookies?.forEach((cookie) =>
          redirect.headers.append('Set-Cookie', cookie),
        );
        return redirect;
      }
      if (
        termsAccepted &&
        teamCreatedOrJoined &&
        teammatesInvited &&
        !onboardingCompleted &&
        !pathname.includes(`/onboarding/welcome`)
      ) {
        const redirectUrl = new URL(
          `/${userData.default_team_slug}/onboarding/welcome`,
          request.url,
        );
        request.nextUrl.searchParams.forEach((value, key) => {
          redirectUrl.searchParams.append(key, value);
        });
        const redirect = NextResponse.redirect(redirectUrl);
        cookies?.forEach((cookie) =>
          redirect.headers.append('Set-Cookie', cookie),
        );
        return redirect;
      }
    }

    if (
      userData &&
      emailConfirmed &&
      pathname.startsWith('/auth/confirm-email')
    ) {
      const redirectUrl = new URL('/dashboard', request.url);
      request.nextUrl.searchParams.forEach((value, key) => {
        redirectUrl.searchParams.append(key, value);
      });
      const redirect = NextResponse.redirect(redirectUrl);
      cookies?.forEach((cookie) =>
        redirect.headers.append('Set-Cookie', cookie),
      );
      return redirect;
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
      const redirectUrl = new URL('/auth/confirm-email', request.url);
      request.nextUrl.searchParams.forEach((value, key) => {
        redirectUrl.searchParams.append(key, value);
      });
      const redirect = NextResponse.redirect(redirectUrl);
      cookies?.forEach((cookie) =>
        redirect.headers.append('Set-Cookie', cookie),
      );
      return redirect;
    }

    if (
      !emailConfirmed &&
      userData &&
      pathname.startsWith('/auth/confirm-email')
    ) {
      return nextResponse;
    }

    if (!emailConfirmed && userData && !pathname.startsWith('/auth/confirm')) {
      const redirectUrl = new URL('/auth/confirm-email', request.url);
      request.nextUrl.searchParams.forEach((value, key) => {
        redirectUrl.searchParams.append(key, value);
      });
      const redirect = NextResponse.redirect(redirectUrl);
      cookies?.forEach((cookie) =>
        redirect.headers.append('Set-Cookie', cookie),
      );
      return redirect;
    }

    if (userData) {
      if (
        (authPath && !isPasswordPath && pathname !== '/dashboard') ||
        pathname === '/'
      ) {
        if (!emailConfirmed) {
          const redirectUrl = new URL('/auth/confirm-email', request.url);
          request.nextUrl.searchParams.forEach((value, key) => {
            redirectUrl.searchParams.append(key, value);
          });
          const redirect = NextResponse.redirect(redirectUrl);
          cookies?.forEach((cookie) =>
            redirect.headers.append('Set-Cookie', cookie),
          );
          return redirect;
        }
        const redirectUrl = new URL('/dashboard', request.url);
        request.nextUrl.searchParams.forEach((value, key) => {
          redirectUrl.searchParams.append(key, value);
        });
        const redirect = NextResponse.redirect(redirectUrl);
        cookies?.forEach((cookie) =>
          redirect.headers.append('Set-Cookie', cookie),
        );
        return redirect;
      }
    }

    return nextResponse;
  } catch (err) {
    const pathname = request.nextUrl.pathname;
    const authPath = pathname.startsWith('/auth');
    const emailConfirmed = pathname.startsWith('/auth/confirm-email');

    if (!authPath || emailConfirmed) {
      const loginUrl = new URL('/auth/login', request.url);
      request.nextUrl.searchParams.forEach((value, key) => {
        loginUrl.searchParams.append(key, value);
      });
      return NextResponse.redirect(loginUrl);
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
