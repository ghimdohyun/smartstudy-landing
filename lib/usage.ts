// Usage guard — checks monthly plan limits and records successful generations
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { NextResponse } from "next/server";
import { PLAN_LIMITS } from "@/types/auth";
import type { PlanTier } from "@/types/auth";

/** Map DB plan_type string to PlanTier (handles legacy 'free' → 'beta') */
function toPlanTier(planType: string | null | undefined): PlanTier {
  if (planType === "pro") return "pro";
  if (planType === "basic") return "basic";
  return "beta"; // 'free', null, or unknown → beta (3 uses/month)
}

export interface UsageCheckResult {
  userId: string | null;
  plan: PlanTier;
  used: number;
  limit: number;
  allowed: boolean;
}

/**
 * Server-side usage check.
 * Reads the NextAuth session, queries Supabase for plan + this-month count.
 * Unauthenticated callers get beta (3/month) limits with no DB tracking.
 */
export async function checkUsage(): Promise<UsageCheckResult> {
  const session = await getServerSession(authOptions);

  // Unauthenticated — apply beta cap without DB lookup
  if (!session?.user?.id) {
    return { userId: null, plan: "beta", used: 0, limit: PLAN_LIMITS.beta, allowed: true };
  }

  const userId = session.user.id;

  // Fetch plan from users table
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("plan_type")
    .eq("id", userId)
    .single();

  const plan = toPlanTier(userRow?.plan_type);
  const limit = PLAN_LIMITS[plan];

  // Pro = unlimited, skip usage query
  if (limit === Infinity) {
    return { userId, plan, used: 0, limit: Infinity, allowed: true };
  }

  // Count generate_plan actions this calendar month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action_type", "generate_plan")
    .gte("created_at", startOfMonth.toISOString());

  const used = count ?? 0;

  return { userId, plan, used, limit, allowed: used < limit };
}

/** Insert a usage_log row after a successful plan generation */
export async function recordUsage(userId: string): Promise<void> {
  await supabaseAdmin
    .from("usage_logs")
    .insert({ user_id: userId, action_type: "generate_plan" });
}

/** Build the 402 Payment Required response for limit-exceeded requests */
export function usageLimitResponse(result: UsageCheckResult): NextResponse {
  const planLabel =
    result.plan === "beta" ? "베타 (무료, 월 3회)" : `${result.plan} (월 ${result.limit}회)`;
  return NextResponse.json(
    {
      error: `이번 달 사용 한도(${result.limit}회)를 초과했습니다. 플랜을 업그레이드하면 더 많이 사용할 수 있습니다.`,
      currentPlan: planLabel,
      limit: result.limit,
      used: result.used,
      upgradeUrl: "/#pricing",
    },
    { status: 402 }
  );
}
