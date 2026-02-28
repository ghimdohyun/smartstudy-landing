// Global auth state hook: manages user session, login, logout, and remaining usage.

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User, PlanTier } from '@/types/auth';
import { PLAN_LIMITS } from '@/types/auth';

const STORAGE_KEY = 'dh_user';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  /** How many study-plan generations remain this month */
  remainingUses: number;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

function getRemainingUses(user: User | null): number {
  if (!user) return PLAN_LIMITS.beta; // unauthenticated = beta limits
  const limit = PLAN_LIMITS[user.plan];
  return limit === Infinity ? Infinity : Math.max(0, limit - user.usageThisMonth);
}

/** Increment the local usageThisMonth counter (optimistic update before DB sync) */
export function bumpLocalUsage(): void {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  try {
    const user: User = JSON.parse(stored);
    user.usageThisMonth += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore parse errors
  }
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored) as User);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const persistUser = (u: User) => {
    setUser(u);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    }
  };

  const signup = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { user?: User; error?: string };
    if (!res.ok || !data.user) throw new Error(data.error ?? '회원가입 실패');
    persistUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { user?: User; error?: string };
    if (!res.ok || !data.user) throw new Error(data.error ?? '로그인 실패');
    persistUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Fire-and-forget: clear HttpOnly cookie on server
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);

  return {
    user,
    loading,
    remainingUses: getRemainingUses(user),
    login,
    signup,
    logout,
  };
}
