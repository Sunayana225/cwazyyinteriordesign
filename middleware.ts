import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Generate a CSP nonce per request for stricter script-src enforcement.
// Next.js injects the nonce into inline <script> tags via <Script nonce={...}>.
// For Next.js App Router pages that use 'use client', we still need 'unsafe-inline'
// on style-src for CSS-in-JS, but script-src can use the nonce pattern.
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    `img-src 'self' data: blob: https://images.unsplash.com`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `script-src 'self' 'unsafe-inline'`,  // Next.js RSC requires 'unsafe-inline'
    `connect-src 'self'`,
    "object-src 'none'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');

  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Content-Security-Policy', csp);

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
