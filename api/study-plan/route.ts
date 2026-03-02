// Thin proxy route: usage guard → Zod validation → Groq delegate
// force-dynamic: disable Next.js response cache — every call must hit the AI fresh
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { callStudyPlanApi, UpstreamError } from "@/lib/groq";
import { StudyPlanRequestSchema } from "@/lib/validations/study-plan";
import { checkUsage, recordUsage, usageLimitResponse } from "@/lib/usage";

export async function POST(req: NextRequest) {
  try {
    // 1. Usage guard — checks plan + monthly count via Supabase
    const usage = await checkUsage();
    if (!usage.allowed) return usageLimitResponse(usage);

    // 2. Validate body with Zod
    const body = await req.json().catch(() => null);
    const parsed = StudyPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // 3. Delegate to Groq client (handles timeout, demo fallback, parsing)
    const { studentInfo, timetableInfo, imageUrl, universityId } = parsed.data;
    const result = await callStudyPlanApi({ studentInfo, timetableInfo, imageUrl, universityId });

    // 4. Record usage for authenticated users
    if (usage.userId) {
      await recordUsage(usage.userId);
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof UpstreamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
