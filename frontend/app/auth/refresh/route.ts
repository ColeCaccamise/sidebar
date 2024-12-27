import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const allCookies = cookies().getAll();

  try {
    const response = await axios.get(`${apiUrl}/auth/refresh`, {
      headers: {
        Cookie: `refresh-token=${cookies().get('refresh-token')}`,
      },
      withCredentials: true,
    });

    const setCookie = response.headers['set-cookie'];
    if (response.status !== 200) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const redirectResponse = NextResponse.redirect(new URL('/', request.url));

    // Forward the Set-Cookie header from the API response
    if (setCookie) {
      const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
      cookieArray.forEach((cookie) => {
        if (cookie) {
          const [cookieValue] = cookie.split(';');
          const [name, value] = cookieValue.trim().split('=');
          cookies().set(name, value);
        }
        // redirectResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return redirectResponse;
  } catch (err) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}
