// Shared-password gate for hosted deployments (see src/proxy.ts). Pure
// functions so they can be tested without a server.

/** Paths that never need the password: read-only share pages and static assets. */
export function isPublicPath(pathname: string): boolean {
  return pathname.startsWith("/share/") || pathname.startsWith("/_next/") || pathname === "/favicon.ico";
}

/** Constant-time string comparison, so response timing doesn't leak the password. */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Checks an HTTP Basic `Authorization` header. Any username is accepted; only the password matters. */
export function checkBasicAuth(header: string | null, password: string): boolean {
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  return sep >= 0 && safeEqual(decoded.slice(sep + 1), password);
}
