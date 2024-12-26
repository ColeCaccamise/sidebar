import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';
import api from './lib/axios';

export async function middleware(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const cookieStore = cookies();
  const pathname = request.nextUrl.pathname;

  // auth routes -- redirect to dashboard when logged in
  const publicAuthRoutes = ['/auth/login', '/auth/signup'];

  // auth routes -- never redirect
  const authRoutes = ['/auth/confirm'];

  // confirm email routes -- redirect to dashboard when email is confirmed
  const confirmEmailRoutes = ['/auth/confirm-email'];

  // user onboarding routes -- redirect to dashboard when onboarding is complete
  const userOnboardingRoutes = ['/onboarding/terms', '/onboarding/team'];

  // team owner onboarding routes -- redirect to member routes when team onboarding is complete
  const teamOwnerOnboardingRoutes = ['/onboarding/plans'];

  // team member onboarding routes -- redirect to waiting when team member onboarding is complete
  const teamMemberOnboardingRoutes = [
    '/onboarding/invite',
    '/onboarding/welcome',
  ];

  // team member waiting routes -- redirect to dashboard when team member waiting for team owner to complete onboarding
  const teamMemberWaitingRoutes = ['/onboarding/action-required'];

  // routes that only team owners can access
  const protectedSettingsRoutes = [
    '/settings/team/plans',
    '/settings/team/billing',
  ];

  // allow legal pages without auth
  if (pathname.startsWith('/legal')) {
    return NextResponse.next();
  }

  // allow team join pages without auth
  if (pathname.match(/^\/[^/]+\/join\/[a-f0-9]{32}$/)) {
    return NextResponse.next();
  }

  if (!apiUrl) {
    console.error('NEXT_PUBLIC_API_URL is not defined');
    return NextResponse.next();
  }

  try {
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
    const isJoinPath = pathname.match(/^\/[^/]+\/join\/[a-f0-9]{32}$/);
    const isTeamPath = pathname.match(/^\/[^/]+\//);
    const isConfirmPath = pathname.startsWith('/auth/confirm');

    // handle 401 and token refresh
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

      // handle failed refresh
      if (
        response.data?.code === 'session_expired' &&
        !authPath &&
        !isJoinPath
      ) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.append('error', 'session_expired');
        request.nextUrl.searchParams.forEach((value, key) => {
          if (key !== 'error') loginUrl.searchParams.append(key, value);
        });
        return NextResponse.redirect(loginUrl);
      }

      if (!authPath && !isJoinPath) {
        const loginUrl = new URL('/auth/login', request.url);
        request.nextUrl.searchParams.forEach((value, key) => {
          loginUrl.searchParams.append(key, value);
        });
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.next();
    }

    // user exists and is authenticated
    const userData = response.data;
    const nextResponse = NextResponse.next();

    // handle cookies
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

    // helper function for redirects
    const redirectWithCookies = (redirectUrl: URL) => {
      const redirect = NextResponse.redirect(redirectUrl);
      cookies?.forEach((cookie: string) =>
        redirect.headers.append('Set-Cookie', cookie),
      );
      return redirect;
    };

    // handle public auth routes
    if (publicAuthRoutes.includes(pathname) && userData) {
      const redirectUrl = new URL(
        `/${userData.default_team_slug}`,
        request.url,
      );
      return redirectWithCookies(redirectUrl);
    }

    // handle never redirect auth routes
    if (authRoutes.includes(pathname)) {
      return nextResponse;
    }

    // handle confirm email routes
    if (confirmEmailRoutes.includes(pathname)) {
      if (userData?.email_confirmed) {
        const redirectUrl = new URL(
          `/${userData.default_team_slug}`,
          request.url,
        );
        return redirectWithCookies(redirectUrl);
      }
      return nextResponse;
    }

    // require email confirmation
    if (userData && !userData.email_confirmed && !isConfirmPath) {
      const redirectUrl = new URL('/auth/confirm-email', request.url);
      return redirectWithCookies(redirectUrl);
    }

    if (!userData) {
      return nextResponse;
    }

    // handle user onboarding routes
    if (userOnboardingRoutes.includes(pathname)) {
      if (userData.onboarding_completed) {
        const redirectUrl = new URL(
          `/${userData.default_team_slug}`,
          request.url,
        );
        return redirectWithCookies(redirectUrl);
      }
      return nextResponse;
    }

    // get team data for team-specific routes
    let teamData;
    let teamMemberData;
    if (isTeamPath) {
      try {
        const teamSlug = pathname.split('/')[1];
        teamData = await api.get(`/teams/${teamSlug}`, {
          headers: {
            Cookie: `auth-token=${cookieStore.get('auth-token')?.value}`,
          },
          withCredentials: true,
        });
        teamMemberData = await api.get(`/teams/${teamSlug}/member`, {
          headers: {
            Cookie: `auth-token=${cookieStore.get('auth-token')?.value}`,
          },
          withCredentials: true,
        });
      } catch (error) {
        // handle team not found or other errors
        return nextResponse;
      }
    }

    const isTeamOwner =
      teamMemberData?.data?.data?.team_member?.team_role === 'owner';
    const teamOnboardingComplete =
      teamData?.data?.data?.team?.onboarding_completed;

    // handle team owner onboarding routes
    if (pathname.includes(teamOwnerOnboardingRoutes[0])) {
      if (!isTeamOwner) {
        const redirectUrl = new URL('/onboarding/welcome', request.url);
        return redirectWithCookies(redirectUrl);
      }
      if (teamOnboardingComplete) {
        const redirectUrl = new URL(
          `/${userData.default_team_slug}`,
          request.url,
        );
        return redirectWithCookies(redirectUrl);
      }
      return nextResponse;
    }

    // handle team member onboarding routes
    if (teamMemberOnboardingRoutes.some((route) => pathname.includes(route))) {
      if (isTeamOwner) {
        const redirectUrl = new URL('/onboarding/plans', request.url);
        return redirectWithCookies(redirectUrl);
      }
      if (teamOnboardingComplete) {
        const redirectUrl = new URL(
          `/${userData.default_team_slug}`,
          request.url,
        );
        return redirectWithCookies(redirectUrl);
      }
      return nextResponse;
    }

    // handle team member waiting routes
    if (teamMemberWaitingRoutes.some((route) => pathname.includes(route))) {
      if (teamOnboardingComplete) {
        const redirectUrl = new URL(
          `/${userData.default_team_slug}`,
          request.url,
        );
        return redirectWithCookies(redirectUrl);
      }
      return nextResponse;
    }

    // handle protected settings routes
    if (protectedSettingsRoutes.some((route) => pathname.includes(route))) {
      if (!isTeamOwner) {
        const redirectUrl = new URL(
          `/${userData.default_team_slug}`,
          request.url,
        );
        return redirectWithCookies(redirectUrl);
      }
      return nextResponse;
    }

    return nextResponse;
  } catch (err) {
    const authPath = pathname.startsWith('/auth');
    const emailConfirmed = pathname.startsWith('/auth/confirm-email');
    const isJoinPath = pathname.match(/^\/[^/]+\/join\/[a-f0-9]{32}$/);

    if (!authPath && !emailConfirmed && !isJoinPath) {
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
