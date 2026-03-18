// Vercel Edge Middleware using standard Web Request/Response APIs only.
// Protects the entire site by checking an auth email cookie against ALLOWED_EMAILS.
// No imports from 'next/server' are used so this works with Vite + Node on Vercel.

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const AUTH_EMAIL_COOKIE = process.env.AUTH_EMAIL_COOKIE || 'auth_email';

/**
 * Very small cookie parser for the "Cookie" header.
 * Returns an object like { cookieName: 'value', ... }.
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [name, ...rest] = part.split('=');
    if (!name) continue;
    const value = rest.join('=');
    cookies[name.trim()] = value ? value.trim() : '';
  }
  return cookies;
}

export default async function middleware(request) {
  // If ALLOWED_EMAILS is not configured, fail closed.
  if (!ALLOWED_EMAILS.length) {
    return new Response('Access denied: ALLOWED_EMAILS is not configured.', {
      status: 500,
      headers: { 'content-type': 'text/plain' },
    });
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);

  const rawEmail = cookies[AUTH_EMAIL_COOKIE] || '';
  const email = rawEmail ? decodeURIComponent(rawEmail).toLowerCase() : '';

  if (email && ALLOWED_EMAILS.includes(email)) {
    // Email is whitelisted – allow the request to continue to your app/API.
    return fetch(request);
  }

  // Not authorized – return 403 Forbidden.
  return new Response('Forbidden: email is not allowed.', {
    status: 403,
    headers: { 'content-type': 'text/plain' },
  });
}

// Apply to all paths. Vercel runs middleware as an Edge Function.
export const config = {
  matcher: '/:path*',
};

