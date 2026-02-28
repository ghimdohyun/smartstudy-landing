// Global auth state hook: wraps NextAuth useSession, exposes user + remainingUses.
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import type { PlanTier } from "@/types/auth";
import { PLAN_LIMITS } from "@/types/auth";

interface DhUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  plan: PlanTier;
  usageThisMonth: number;
}

interface UseAuthReturn {
  user: DhUser | null;
  loading: boolean;
  /** How many study-plan generations remain this month */
  remainingUses: number;
  login: () => void;
  logout: () => void;
}

function getRemainingUses(user: DhUser | null): number {
  if (!user) return PLAN_LIMITS.beta; // unauthenticated = beta limits
  const limit = PLAN_LIMITS[user.plan];
  return limit === Infinity ? Infinity : Math.max(0, limit - user.usageThisMonth);
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const user: DhUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? "",
        name: session.user.name,
        image: session.user.image,
        // Default to beta; real plan/usage will come from DB once wired
        plan: "beta" as PlanTier,
        usageThisMonth: 0,
      }
    : null;

  return {
    user,
    loading: status === "loading",
    remainingUses: getRemainingUses(user),
    login: () => void signIn("google", { callbackUrl: "/" }),
    logout: () => void signOut({ callbackUrl: "/" }),
  };
}
