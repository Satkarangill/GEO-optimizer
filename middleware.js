/**
 * Vercel Edge Middleware: site-wide Basic Auth + strict email whitelist.
 *
 * - Username must be one of the whitelisted emails.
 * - Password must equal BASIC_AUTH_PASSWORD (set in Vercel env vars).
 *
 * This protects the entire site (pages + /api routes) when deployed on Vercel.
 */
import { NextResponse } from 'next/server';

const EMAIL_WHITELIST = new Set([
  'satkarangill0@gmail.com',
  'andrea@amplifyonline.ca',
]);

function unauthorized() {
  return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Basic realm="Restricted"',
    },
  });
}

function forbidden() {
  return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function middleware(request) {
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;
  if (!expectedPassword) {
    return new NextResponse(JSON.stringify({ error: 'Server misconfigured: BASIC_AUTH_PASSWORD is not set.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const header = request.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) return unauthorized();

  let username = '';
  let password = '';
  try {
    const decoded = atob(encoded);
    const idx = decoded.indexOf(':');
    if (idx === -1) return unauthorized();
    username = decoded.slice(0, idx);
    password = decoded.slice(idx + 1);
  } catch {
    return unauthorized();
  }

  if (password !== expectedPassword) return unauthorized();

  const email = String(username).trim().toLowerCase();
  if (!EMAIL_WHITELIST.has(email)) return forbidden();

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};

