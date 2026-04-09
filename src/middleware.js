import { NextResponse } from 'next/server';

export default function middleware(req) {
  const pathname = req.nextUrl.pathname;

  // Session-Cookie prüfen (DB-Sessions nutzen ein zufälliges Token, kein JWT)
  const sessionToken =
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) {
    const signinUrl = new URL('/auth/signin', req.url);
    // Nur relativen Pfad als callbackUrl — vermeidet localhost-Problem hinter nginx-Proxy
    const callbackPath = req.nextUrl.pathname + req.nextUrl.search;
    signinUrl.searchParams.set('callbackUrl', callbackPath);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!auth|api/auth|_next/static|_next/image|favicon|logo|public).*)',
  ],
};
