import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

const SIGNED_OUT_AUTH_ROUTES = ['/auth/login', '/auth/signup'];
const AUTH_ROUTES = [
  '/auth/forgot-password',
  '/auth/change-password',
  '/auth/confirm',
];
const ALLOWED_ROUTES = ['/legal/privacy', '/legal/terms'];

export async function middleware(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const cookieStore = cookies();
  const pathname = request.nextUrl.pathname;

  if (!apiUrl) {
    console.error('NEXT_PUBLIC_API_URL is not defined');
    return NextResponse.next();
  }

  // get user data
  let isLoggedIn = false;

  const user = await axios
    .get(`${apiUrl}/auth/identity`, {
      headers: {
        Cookie: `auth-token=${cookieStore.get('auth-token')?.value}`,
      },
      withCredentials: true,
    })
    .then((res) => {
      isLoggedIn = true;
      return res?.data?.data?.user;
    })
    .catch(() => null);

  if (!user) {
    // attempt to refresh
    const refresh = await axios
      .get(`${apiUrl}/auth/refresh`, {
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
      console.log('FAILED REFRESH: ', pathname);
      if (
        !SIGNED_OUT_AUTH_ROUTES.includes(pathname) &&
        !AUTH_ROUTES.includes(pathname) &&
        !ALLOWED_ROUTES.includes(pathname)
      ) {
        return NextResponse.redirect(`${appUrl}/auth/login`);
      } else {
        console.log('ALLOWED ROUTE: ', pathname);
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
  }

  // redirect logged in users to root path
  if (isLoggedIn && SIGNED_OUT_AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // user onboarding routes
  const emailConfirmed = user?.email_confirmed;
  const onboarded = user?.onboarding_completed;
  const termsAccepted = user?.terms_accepted;
  const teamCreatedOrJoined = user?.team_created_or_joined;
  const teammatesInvited = user?.teammates_invited;
  let teamSlug = user?.default_team_slug;
  let dashboardUrl = `${appUrl}/${teamSlug}`;

  console.log('EMAIL CONFIRMED: ', emailConfirmed);

  // todo decide if we want WorkOS password auth
  // verify email confirmed
  // if (!emailConfirmed) {
  //   if (pathname === `/auth/confirm` || pathname === '/auth/confirm-email') {
  //     return NextResponse.next();
  //   } else {
  //     return NextResponse.redirect(`${appUrl}/auth/confirm-email`);
  //   }
  // }

  // if (emailConfirmed && pathname === '/auth/confirm-email') {
  //   return NextResponse.redirect(`${appUrl}`);
  // }

  // verify terms accepted
  if (!termsAccepted) {
    if (pathname === `/onboarding/terms`) {
      return NextResponse.next();
    } else {
      return NextResponse.redirect(`${appUrl}/onboarding/terms`);
    }
  }

  // verify team created or joined
  if (!teamCreatedOrJoined) {
    if (pathname === `/onboarding/team`) {
      return NextResponse.next();
    } else {
      return NextResponse.redirect(`${appUrl}/onboarding/team`);
    }
  }

  // get default team
  let team = await axios
    .get(`${apiUrl}/teams/${teamSlug}`, {
      headers: {
        Cookie: `auth-token=${cookieStore.get('auth-token')?.value}`,
      },
      withCredentials: true,
    })
    .then((res) => {
      return res?.data?.data?.team;
    })
    .catch(() => null);

  let teamMember = await axios
    .get(`${apiUrl}/teams/${teamSlug}/member`, {
      headers: {
        Cookie: `auth-token=${cookieStore.get('auth-token')?.value}`,
      },
      withCredentials: true,
    })
    .then((res) => {
      return res?.data?.data?.team_member;
    })
    .catch(() => null);

  let teamRole: string = teamMember?.team_role;
  let isOwner = teamRole === 'owner';
  let isAdmin = isOwner || teamRole === 'admin';
  const subscriptionTierChosen = team?.subscription_tier_chosen;
  const actionRequiredUrl = `${appUrl}/${teamSlug}/onboarding/action-required`; // url for non-owner team members waiting for owner to finish onboarding

  // verify team has a plan chosen
  if (!subscriptionTierChosen) {
    if (isOwner) {
      if (pathname === `/${teamSlug}/onboarding/plans`) {
        return NextResponse.next();
      } else {
        return NextResponse.redirect(`${appUrl}/${teamSlug}/onboarding/plans`);
      }
    } else {
      if (pathname === `/${teamSlug}/onboarding/action-required`) {
        return NextResponse.next();
      } else {
        return NextResponse.redirect(actionRequiredUrl);
      }
    }
  }

  // verify teammates were invited
  if (!teammatesInvited) {
    if (pathname === `/${teamSlug}/onboarding/invite`) {
      return NextResponse.next();
    } else {
      return NextResponse.redirect(
        `${appUrl}/${user?.default_team_slug}/onboarding/invite`,
      );
    }
  }

  // verify team member is onboarded
  let teamMemberOnboarded = teamMember?.onboarded;
  if (!teamMemberOnboarded) {
    if (pathname === `/${teamSlug}/onboarding/welcome`) {
      return NextResponse.next();
    } else {
      return NextResponse.redirect(
        `${appUrl}/${user?.default_team_slug}/onboarding/welcome`,
      );
    }
  }

  const pathParts = pathname.split('/')?.filter((p) => {
    return p != '' && p != null;
  });

  // handle non-default team
  const currentTeamSlug = pathParts[0];

  if (currentTeamSlug != teamSlug) {
    const currentTeam = await axios
      .get(`${apiUrl}/teams/${currentTeamSlug}`, {
        headers: {
          Cookie: `auth-token=${cookieStore.get('auth-token')?.value}`,
        },
        withCredentials: true,
      })
      .then((res) => {
        return res?.data?.data?.team;
      })
      .catch(() => null);

    if (currentTeam) {
      teamSlug = currentTeamSlug;
      team = currentTeam;
      teamMember = await axios
        .get(`${apiUrl}/teams/${currentTeamSlug}/member`, {
          headers: {
            Cookie: `auth-token=${cookieStore.get('auth-token')?.value}`,
          },
          withCredentials: true,
        })
        .then((res) => {
          return res?.data?.data?.team_member;
        })
        .catch(() => null);

      teamRole = teamMember?.team_role;
      isOwner = teamRole === 'owner';
      isAdmin = isOwner || teamRole === 'admin';
      dashboardUrl = `${appUrl}/${currentTeamSlug}`;
      teamMemberOnboarded = teamMember?.onboarded;
    }
  }

  // handle settings routes
  const TEAM_OWNER_SETTINGS_ROUTES = [
    `/${currentTeamSlug}/settings/team/plans`,
    `/${currentTeamSlug}/settings/team/billing`,
  ]; // in a team context e.g. /[team-slug]/settings/team/plans
  const TEAM_ADMIN_SETTINGS_ROUTES = [
    `/${currentTeamSlug}/settings/team/integrations`,
    `/${currentTeamSlug}/settings/team`,
  ];

  // verify user has owner access
  if (TEAM_OWNER_SETTINGS_ROUTES.includes(pathname)) {
    if (!isOwner) {
      if (
        pathname === `/${teamSlug}/settings/account/profile?error=access_denied`
      ) {
        return NextResponse.next();
      } else {
        return NextResponse.redirect(
          `${appUrl}/${teamSlug}/settings/account/profile?error=access_denied`,
        );
      }
    }
  }

  // verify user has admin access
  if (TEAM_ADMIN_SETTINGS_ROUTES.includes(pathname)) {
    if (!isAdmin) {
      if (
        pathname === `/${teamSlug}/settings/account/profile?error=access_denied`
      ) {
        return NextResponse.next();
      } else {
        return NextResponse.redirect(
          `${appUrl}/${teamSlug}/settings/account/profile?error=access_denied`,
        );
      }
    }
  }

  const USER_ONBOARDING_ROUTES = ['/onboarding/terms', '/onboarding/team'];
  const TEAM_ONBOARDING_ROUTES = [
    `/${currentTeamSlug}/onboarding/plans`,
    `/${currentTeamSlug}/onboarding/invite`,
    `/${currentTeamSlug}/onboarding/welcome`,
  ];

  // redirect to dashboard if already onboarded
  if (onboarded && USER_ONBOARDING_ROUTES.includes(pathname)) {
    if (pathname === `/${currentTeamSlug}`) {
      return NextResponse.next();
    } else {
      return NextResponse.redirect(`${dashboardUrl}`);
    }
  }

  if (teamMemberOnboarded && TEAM_ONBOARDING_ROUTES.includes(pathname)) {
    if (pathname === `/${currentTeamSlug}`) {
      return NextResponse.next();
    } else {
      return NextResponse.redirect(`${dashboardUrl}`);
    }
  }

  // redirect to default team slug when landing on root page
  if (pathname === `/`) {
    return NextResponse.redirect(`${appUrl}/${user?.default_team_slug}`);
  }

  // allow access to other routes
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
