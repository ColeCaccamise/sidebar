import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';
import { Identity, Team, TeamMember, User } from './types';

const SIGNED_OUT_AUTH_ROUTES = ['/auth/login', '/auth/signup'];
const AUTH_ROUTES = [
  '/auth/forgot-password',
  '/auth/change-password',
  '/auth/confirm',
];
const ALLOWED_ROUTES = ['/legal/privacy', '/legal/terms', '/select-team'];

export async function middleware(request: NextRequest) {
  // skip middleware for server actions
  if (request.headers.get('next-action') !== null) {
    console.log('next-action');
    return NextResponse.next();
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const cookieStore = cookies();
  const pathname = request.nextUrl.pathname;

  // allow access to team join routes
  if (pathname.match(/^\/[^\/]+\/join\/[^\/]+$/)) {
    return NextResponse.next();
  }

  if (!apiUrl) {
    return NextResponse.next();
  }

  // get user data
  let isLoggedIn = false;

  let user: User | null = null;
  let team: Team | null = null;
  let teamMember: TeamMember | null = null;

  const identity = await axios
    .get<{ data: Identity }>(`${apiUrl}/auth/identity`, {
      headers: {
        Cookie: `auth-token=${cookieStore.get('auth-token')?.value}`,
      },
      withCredentials: true,
    })
    .then((res) => {
      return res?.data?.data;
    })
    .catch(() => null);

  console.log('identity called');

  if (!identity?.valid) {
    // attempt to refresh
    const refresh = await axios
      .get<{ data: Identity }>(`${apiUrl}/auth/refresh`, {
        headers: {
          Cookie: `refresh-token=${cookieStore.get('refresh-token')?.value}`,
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      })
      .then(async (res) => {
        isLoggedIn = true;
        return res;
      })
      .catch((err) => {
        return err.response;
      });

    if (refresh?.status != 200) {
      // handle failed refresh
      if (
        !SIGNED_OUT_AUTH_ROUTES.includes(pathname) &&
        !AUTH_ROUTES.includes(pathname) &&
        !ALLOWED_ROUTES.includes(pathname)
      ) {
        return NextResponse.redirect(`${appUrl}/auth/login`);
      } else {
        return NextResponse.next();
      }
    } else {
      const response = NextResponse.next();
      const setCookieHeader = refresh.headers['set-cookie'];
      if (setCookieHeader) {
        if (Array.isArray(setCookieHeader)) {
          setCookieHeader.forEach((cookie) => {
            response.headers.append('Set-Cookie', cookie);
          });
        } else {
          setCookieHeader.split(', ')?.forEach((cookie: string) => {
            response.headers.append('Set-Cookie', cookie);
          });
        }
      }
      return response;
    }
  } else {
    isLoggedIn = true;
    user = identity.user;
    team = identity.team;
    teamMember = identity.team_member;
  }

  // redirect logged in users to root path
  if (isLoggedIn && SIGNED_OUT_AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL(`/${team.slug}`, request.url));
  }

  // check onboarding status
  const termsAccepted = user?.terms_accepted;
  const teamCreatedOrJoined = user?.team_created_or_joined;
  const deleted = user?.deleted;

  // redirect to deleted page if user has been deleted
  if (deleted) {
    if (pathname === '/deleted') {
      return NextResponse.next();
    }
    return NextResponse.redirect(`${appUrl}/deleted`);
  }

  // verify terms accepted
  if (!termsAccepted) {
    if (pathname === '/onboarding/terms') {
      return NextResponse.next();
    }
    return NextResponse.redirect(`${appUrl}/onboarding/terms`);
  }

  // verify team created or joined
  if (!teamCreatedOrJoined) {
    if (pathname === '/onboarding/team') {
      return NextResponse.next();
    }
    return NextResponse.redirect(`${appUrl}/onboarding/team`);
  }

  // verify onboarding complete
  const subscriptionTierChosen = team?.subscription_tier_chosen;
  const teamMemberOnboarded = teamMember?.onboarded;
  const isOwner = teamMember?.team_role === 'owner';

  // verify subscription status
  if (subscriptionTierChosen && pathname === `/${team.slug}/onboarding/plans`) {
    if (pathname === `/${team.slug}`) {
      return NextResponse.next();
    }
    return NextResponse.redirect(`${appUrl}/${team.slug}`);
  }

  if (teamMember) {
    // handle onboarding redirects
    if (!subscriptionTierChosen && isOwner) {
      if (pathname === `/${team.slug}/onboarding/plans`) {
        return NextResponse.next();
      }
      return NextResponse.redirect(`${appUrl}/${team.slug}/onboarding/plans`);
    }

    if (!teamMemberOnboarded) {
      if (pathname === `/${team.slug}/onboarding/welcome`) {
        return NextResponse.next();
      }
      return NextResponse.redirect(`${appUrl}/${team.slug}/onboarding/welcome`);
    }
  }

  // redirect root to default team
  if (pathname === '/') {
    return NextResponse.redirect(`${appUrl}/${team.slug}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
