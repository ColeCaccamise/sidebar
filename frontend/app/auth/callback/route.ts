import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect');

  if (!redirect) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.redirect(new URL(redirect, request.url));
}
