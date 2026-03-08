// Authentication and user domain types for Dream Helixion

// ─── Plan tiers ───────────────────────────────────────────────────────────────

/** Subscription tier that controls feature access and monthly usage limits */
export type PlanTier = 'beta' | 'basic' | 'pro';

/** Monthly usage limits per plan tier */
export const PLAN_LIMITS: Record<PlanTier, number> = {
  beta: 3,
  basic: 30,
  pro: Infinity,
};

/** Human-readable plan labels */
export const PLAN_LABELS: Record<PlanTier, string> = {
  beta: '베타 (무료)',
  basic: '기본 (₩4,900/월)',
  pro: '프로 (₩14,900/월)',
};

// ─── User ─────────────────────────────────────────────────────────────────────

/** Authenticated user record (mirrors DB row from Supabase auth.users + profiles) */
export interface User {
  /** UUID from DB */
  id: string;
  email: string;
  plan: PlanTier;
  /** How many study-plan generations the user has made this calendar month */
  usageThisMonth: number;
  /** ISO 8601 timestamp */
  createdAt: string;
}

// ─── Auth request / response ──────────────────────────────────────────────────

export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Returned by /api/auth/login and /api/auth/signup */
export interface AuthResponse {
  user: User;
  /** JWT access token.
   *  TODO: signed with jose (HS256) once NEXTAUTH_SECRET env var is set */
  token: string;
}

// ─── JWT payload (internal) ───────────────────────────────────────────────────

/** Shape stored inside the JWT / mock token */
export interface TokenPayload {
  userId: string;
  email: string;
  plan: PlanTier;
  /** Issued-at timestamp (ms) */
  iat: number;
  /** Expiry timestamp (ms) */
  exp: number;
}
