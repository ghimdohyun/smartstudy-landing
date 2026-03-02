// JWT-like token utilities — mock base64url implementation.
// TODO: Replace with `jose` (HS256) once NEXTAUTH_SECRET env var is provisioned.

import type { TokenPayload, PlanTier } from '@/types/auth';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Encode an object to base64url (Node.js Buffer, safe for cookies) */
function toBase64Url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Decode base64url back to an object, returns null on failure */
function fromBase64Url(str: string): unknown {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

/** Create a signed mock token for the given user.
 *  NOTE: Not cryptographically signed — replace with jose.SignJWT for production. */
export function createToken(userId: string, email: string, plan: PlanTier): string {
  const payload: TokenPayload = {
    userId,
    email,
    plan,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  return toBase64Url(payload);
}

/** Parse and validate a token string.
 *  Returns null if malformed or expired. */
export function parseToken(token: string): TokenPayload | null {
  const decoded = fromBase64Url(token);
  if (
    !decoded ||
    typeof decoded !== 'object' ||
    !('userId' in (decoded as object)) ||
    !('exp' in (decoded as object))
  ) {
    return null;
  }
  const payload = decoded as TokenPayload;
  if (payload.exp < Date.now()) return null; // expired
  return payload;
}

export const AUTH_COOKIE = 'dh_auth';
export const COOKIE_MAX_AGE_SEC = Math.floor(TOKEN_TTL_MS / 1000);
