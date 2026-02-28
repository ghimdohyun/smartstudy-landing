// API utilities for SmartStudy AI backend calls via Next.js proxy routes

import type { StudyPlanInput, StudyPlanResult, StudyPlan, YearPlan } from '@/types';

// ---------- Chat ----------

export async function fetchChatReply(message: string): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `API error: ${res.status}`);
  }
  const data = await res.json() as { reply?: string; error?: string };
  if (!data.reply) throw new Error(data.error ?? 'Empty reply');
  return data.reply;
}

// ---------- Study Plan ----------

/** Shape returned by /api/study-plan when the prompt is resolved */
interface StudyPlanApiResponse {
  planA?: RawPlan;
  planB?: RawPlan;
  planC?: RawPlan;
  planD?: RawPlan;
  yearPlan?: unknown;
  reply?: string;
  error?: string;
  /** Set to true when the route returned the local demo fallback */
  _isDemo?: boolean;
}

interface RawCourse {
  code?: string;
  name?: string;
  credits?: number;
  requirement?: string;
  target?: string;
  day?: string;
  time?: string;
  note?: string;
}

interface RawPlan {
  title?: string;
  strategy?: string;
  totalCredits?: number;
  courses?: Array<string | RawCourse>;
}

function normalizePlan(raw: RawPlan | undefined, label: string): StudyPlan | null {
  if (!raw) return null;
  const courses = (raw.courses ?? []).map((c) => {
    if (typeof c === 'string') return { name: c };
    return {
      code: c.code,
      name: c.name ?? '',
      credits: c.credits,
      requirement: c.requirement,
      target: c.target,
      day: c.day,
      time: c.time,
      note: c.note,
    };
  });
  return {
    label,
    strategy: raw.strategy ?? raw.title,
    courses,
    totalCredits: raw.totalCredits,
  };
}

export async function fetchStudyPlan(input: StudyPlanInput): Promise<StudyPlanResult> {
  const res = await fetch('/api/study-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentInfo: input.studentInfo,
      timetableInfo: input.timetableInfo,
      imageUrl: input.imageUrl,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `API error: ${res.status}`);
  }

  const data = await res.json() as StudyPlanApiResponse;

  if (data.error) throw new Error(data.error);

  // Structured plan response (planA/B/C/D keys)
  if (data.planA ?? data.planB ?? data.planC ?? data.planD) {
    const plans: StudyPlan[] = [
      normalizePlan(data.planA, 'Plan A'),
      normalizePlan(data.planB, 'Plan B'),
      normalizePlan(data.planC, 'Plan C'),
      normalizePlan(data.planD, 'Plan D'),
    ].filter((p): p is StudyPlan => p !== null);

    return { plans, yearPlan: data.yearPlan as YearPlan | undefined, isDemo: data._isDemo };
  }

  // Fallback: raw text reply when JSON parse failed upstream
  return { raw: data.reply ?? JSON.stringify(data, null, 2) };
}
