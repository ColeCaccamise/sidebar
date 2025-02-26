import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';
import { User, Workspace } from './types';
import { parseJwt, isTokenExpired } from './lib/jwt';
import { getRedis } from './lib/redis';

const SIGNED_OUT_AUTH_ROUTES = ['/auth/login', '/auth/signup'];
const AUTH_ROUTES = [
  '/auth/forgot-password',
  '/auth/change-password',
  '/auth/confirm',
  '/auth/callback',
  '/auth/refresh',
];
const ALLOWED_ROUTES = ['/legal/privacy', '/legal/terms', '/select-team'];

// times in s
const accessTokenExpiry = 1 * 60; // 1 minute
const refreshTokenExpiry = 720 * 60 * 60; // 30 days

const handleRedirect = (request: NextRequest, url: string) => {
  console.log('handleRedirect', request.nextUrl.pathname, url);
  // ignore query params when comparing equality
  if (request.nextUrl.pathname === url.split('?')[0]) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(url, request.url));
};

export async function middleware(request: NextRequest) {
  // skip middleware for server actions
  if (request.headers.get('next-action') !== null) {
    return NextResponse.next();
  }

  const cookieStore = cookies();
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith('/auth/callback/') ||
    ALLOWED_ROUTES.includes(pathname) ||
    AUTH_ROUTES.includes(pathname)
  ) {
    return NextResponse.next();
  }

  let authToken = cookieStore.get('auth-token')?.value;
  let refreshToken = cookieStore.get('refresh-token')?.value;

  if (!authToken && !refreshToken) {
    return handleRedirect(request, '/auth/login');
  }

  const authExpired = isTokenExpired(authToken ?? '');
  if ((authExpired || !authToken) && refreshToken) {
    // handle refresh inline
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {
          method: 'GET',
          headers: {
            Cookie: `refresh-token=${refreshToken}`,
          },
          credentials: 'include',
        },
      );

      if (!response.ok) {
        console.log(70)
        return handleRedirect(
          request,
          '/auth/login?error=refresh_token_expired',
        );
      }

      // get the new tokens from response
      const { data } = await response.json();
      const { access_token, refresh_token } = data;

      console.log('refreshed token', access_token, refresh_token);

      // create response with new tokens
      const newResponse = NextResponse.next();

      // set the cookies with proper attributes
      newResponse.cookies.set({
        name: 'auth-token',
        value: access_token,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: accessTokenExpiry,
        path: '/',
      });

      newResponse.cookies.set({
        name: 'refresh-token',
        value: refresh_token,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: refreshTokenExpiry,
        path: '/',
      });

      // update the current request auth token for subsequent middleware checks
      authToken = access_token;
      console.log('refreshed token');
      return newResponse;
    } catch {
      console.log('error refreshing token');
      return handleRedirect(request, '/auth/login');
    }
  }

  const parsedAuth = parseJwt(authToken ?? '');
  console.log('parsed auth', parsedAuth);

  if (!parsedAuth) {
    return handleRedirect(request, '/auth/login');
  }

  const userId = parsedAuth.sub;

  // if (!workspace.onboarded) {
  //   return handleRedirect(request, `/${slug}/onboarding`);
  // }

  const redisUser = await getRedis({ key: `user:${userId}` });
  if (!redisUser.success || !redisUser.data) {
    return handleRedirect(request, '/auth/login');
  }

  const user = redisUser.data as User;

  if (!user.onboarded) {
    return handleRedirect(request, '/onboarding');
  }

  console.log('pathname', pathname);

  if (SIGNED_OUT_AUTH_ROUTES.includes(pathname) || pathname === '/') {
    console.log('redirecting to workspace');
    // redirect to workspace on root or auth routes
    const workspaceId = parsedAuth.org_id;
    const workspaceData = await getRedis({ key: `workspace:${workspaceId}` });
    const workspace = workspaceData.data as Workspace;
    const slug = workspace.slug ?? '';
    return handleRedirect(request, `/${slug}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
