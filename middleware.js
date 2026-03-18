/**
 * Edge middleware: site-wide Basic Auth + strict email whitelist.
 *
 * This version uses the standard Web Fetch API (Request/Response) so it works
 * in a Vite/Node deployment without depending on `next/server`.
 *
 * - Username (Basic Auth) must be one of the whitelisted emails.
 * - Password must equal BASIC_AUTH_PASSWORD (set in env vars).
 * - Applies to all paths via the exported `config.matcher`.
 */

const EMAIL_WHITELIST = new Set([
  'satkarangill0@gmail.com',
  'andrea@amplifyonline.ca',
]);

function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

function unauthorized() {
  return jsonResponse(
    401,
    { error: 'Unauthorized' },
    { 'WWW-Authenticate': 'Basic realm="Restricted"' },
  );
}

function forbidden() {
  return jsonResponse(403, { error: 'Forbidden' });
}

export default async function middleware(request) {
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;
  if (!expectedPassword) {
    return jsonResponse(500, {
      error: 'Server misconfigured: BASIC_AUTH_PASSWORD is not set.',
    });
  }

  // Existing auth mechanism: HTTP Basic Auth header
  const header = request.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) {
    return unauthorized();
  }

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

  if (password !== expectedPassword) {
    return unauthorized();
  }

  const email = String(username).trim().toLowerCase();
  if (!EMAIL_WHITELIST.has(email)) {
    return forbidden();
  }

  // Auth OK -> continue to the requested resource.
  return fetch(request);
}

export const config = {
  matcher: '/:path*',
};

