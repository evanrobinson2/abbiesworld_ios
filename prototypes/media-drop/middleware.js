import { NextResponse } from 'next/server';
import { auth0 } from './lib/auth0.js';
import { isAllowedEmail } from './lib/allowlist.js';

export async function middleware(request) {
  const response = await auth0.middleware(request);
  const { pathname } = request.nextUrl;

  // Public: Auth0 routes + login landing + PWA bits + share target POST endpoint
  // (share-target still requires session; the page itself is gated).
  const publicPaths = [
    '/auth',
    '/login',
    '/manifest.webmanifest',
    '/icons',
  ];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return response;
  }

  // Let Auth0 finish its own routes.
  if (pathname.startsWith('/auth/')) {
    return response;
  }

  const session = await auth0.getSession(request);
  if (!session?.user) {
    const login = new URL('/login', request.url);
    const returnTo = `${pathname}${request.nextUrl.search || ''}`;
    login.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(login);
  }

  if (!isAllowedEmail(session.user.email)) {
    const denied = new URL('/login', request.url);
    denied.searchParams.set('denied', '1');
    return NextResponse.redirect(denied);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
