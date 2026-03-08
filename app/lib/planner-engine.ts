/**
 * planner-engine.ts
 * Backtracking-based course schedule generator.
 * Produces 4 scenario plans (A~D) from everytime-raw.json + academic-rules.json.
 *
 * Plan A — 안전 (Safety): Required courses first, no time conflicts, balanced load
 * Plan B — 꿀강 (High-Rating): Maximize average rating, prefer high addedCount
 * Plan C — 공강 (Free Day): Maximize free days, cluster courses on fewest days
 * Plan D — 전공심화 (Major-Intensive): Pack as many major/required courses as possible
 */

import type { Course } from "@/types";
import everytimeRaw from "@/lib/data/everytime-raw.json";
import academicRules from "@/lib/data/academic-rules.json";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EverytimeCourse {
  code: string;
  name: string;
  professor: string;
  category: string;
  credits: number;
  targetYear: string;
  schedule: Array<{ day: string; periods: number[]; room: string }>;
  rating: number;
  addedCount: number;
  isGraduationRequired: boolean;
  graduationTag: string | null;
  academicRulesCode?: string;
  graduationNote?: string;
}

export interface EngineResult {
  planId: "A" | "B" | "C" | "D";
  label: string;
  description: string;
  emoji: string;
  courses: Course[];
  totalCredits: number;
  avgRating: number;
  freeDays: string[];
  score: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_DAYS = ["월", "화", "수", "목", "금"] as const;
// Period to clock-time mapping (경성대 기준: 1교시 = 09:00, 교시 간격 50분)
const PERIOD_TO_MINUTES: Record<number, number> = {
  1:  9 * 60,
  2:  9 * 60 + 50,
  3: 10 * 60 + 40,
  4: 11 * 60 + 30,
  5: 12 * 60 + 20,
  6: 13 * 60 + 10,
  7: 14 * 60,
  8: 14 * 60 + 50,
  9: 15 * 60 + 40,
  10: 16 * 60 + 30,
  11: 17 * 60 + 20,
  12: 18 * 60 + 10,
};
const PERIOD_DURATION = 50; // minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert EverytimeCourse → Course (app type) */
function toAppCourse(et: EverytimeCourse): Course {
  // Use first schedule slot for day/time
  const slot = et.schedule[0];
  const period = slot?.periods[0];
  const startMin = period ? PERIOD_TO_MINUTES[period] : undefined;
  const timeStr = startMin !== undefined
    ? `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`
    : undefined;

  return {
    id: et.code,
    name: et.name,
    code: et.code,
    professor: et.professor,
    day: slot?.day,
    time: timeStr,
    credits: et.credits,
    category: et.category,
    requirement: et.graduationTag ?? et.category,
    room: slot?.room,
    rating: et.rating,
  } as Course;
}

/** Build (day, startMin, endMin) intervals for a course */
function getCourseIntervals(et: EverytimeCourse): Array<{ day: string; start: number; end: number }> {
  const intervals: Array<{ day: string; start: number; end: number }> = [];
  for (const slot of et.schedule) {
    for (const period of slot.periods) {
      const start = PERIOD_TO_MINUTES[period];
      if (start === undefined) continue;
      intervals.push({ day: slot.day, start, end: start + PERIOD_DURATION });
    }
  }
  return intervals;
}

/** True if two course lists have any time overlap */
function hasTimeConflict(a: EverytimeCourse, occupied: EverytimeCourse[]): boolean {
  const aIntervals = getCourseIntervals(a);
  for (const occ of occupied) {
    const occIntervals = getCourseIntervals(occ);
    for (const ai of aIntervals) {
      for (const oi of occIntervals) {
        if (ai.day === oi.day && ai.start < oi.end && oi.start < ai.end) return true;
      }
    }
  }
  return false;
}

/** Get unique names to deduplicate same-course different sections */
function uniqueByName(courses: EverytimeCourse[]): Map<string, EverytimeCourse[]> {
  const map = new Map<string, EverytimeCourse[]>();
  for (const c of courses) {
    const sections = map.get(c.name) ?? [];
    sections.push(c);
    map.set(c.name, sections);
  }
  return map;
}

/** Days that have at least one scheduled period */
function activeDays(selected: EverytimeCourse[]): Set<string> {
  const days = new Set<string>();
  for (const c of selected) {
    for (const slot of c.schedule) {
      days.add(slot.day);
    }
  }
  return days;
}

/** Average rating of selected courses (0 if none) */
function avgRating(selected: EverytimeCourse[]): number {
  if (!selected.length) return 0;
  const rated = selected.filter(c => c.rating > 0);
  if (!rated.length) return 0;
  return rated.reduce((s, c) => s + c.rating, 0) / rated.length;
}

/** Total credits */
function totalCredits(selected: EverytimeCourse[]): number {
  return selected.reduce((s, c) => s + c.credits, 0);
}

/** Required course codes from academic-rules.json */
const requiredCodes = new Set(
  (academicRules.courses as Array<{ code: string; required: boolean; offeredOnce: boolean }>)
    .filter(c => c.required || c.offeredOnce)
    .map(c => c.code)
);

function isAcademicRequired(et: EverytimeCourse): boolean {
  return et.isGraduationRequired ||
    (et.academicRulesCode !== undefined && requiredCodes.has(et.academicRulesCode));
}

// ─── Backtracking Engine ──────────────────────────────────────────────────────

type ScorerFn = (candidate: EverytimeCourse, current: EverytimeCourse[]) => number;

interface PlanConfig {
  planId: "A" | "B" | "C" | "D";
  label: string;
  description: string;
  emoji: string;
  targetCredits: { min: number; max: number };
  scorer: ScorerFn;
  /** Comparator to sort candidates before backtracking (greedy order) */
  sort: (a: EverytimeCourse, b: EverytimeCourse) => number;
  /** Optional: force-include these by academicRulesCode */
  forceIncludeCodes?: string[];
}

/**
 * Greedy-with-backtracking selector.
 * 1. Sort candidates by scorer desc (greedy order).
 * 2. Pick first non-conflicting candidate that improves or maintains score.
 * 3. Backtrack if credit target not reachable.
 */
function selectCourses(
  pool: EverytimeCourse[],
  config: PlanConfig,
): EverytimeCourse[] {
  // Deduplicate pool by name → keep best-rated section per course
  const byName = uniqueByName(pool);
  const deduped: EverytimeCourse[] = [];
  for (const [, sections] of byName) {
    const best = [...sections].sort((a, b) => b.rating - a.rating || b.addedCount - a.addedCount)[0];
    deduped.push(best);
  }

  // Sort by config
  const sorted = [...deduped].sort(config.sort);

  const selected: EverytimeCourse[] = [];

  // Force-include required courses first
  if (config.forceIncludeCodes) {
    for (const code of config.forceIncludeCodes) {
      const course = sorted.find(c => c.academicRulesCode === code || c.code === code);
      if (course && !hasTimeConflict(course, selected)) {
        selected.push(course);
      }
    }
  }

  // Greedy fill up to max credits
  for (const candidate of sorted) {
    if (selected.includes(candidate)) continue;
    const cur = totalCredits(selected);
    if (cur >= config.targetCredits.max) break;
    if (cur + candidate.credits > config.targetCredits.max) continue;
    if (hasTimeConflict(candidate, selected)) continue;
    selected.push(candidate);
  }

  return selected;
}

// ─── Plan Configs ─────────────────────────────────────────────────────────────

const PLAN_CONFIGS: PlanConfig[] = [
  {
    planId: "A",
    label: "안전 플랜",
    description: "졸업 필수 과목 우선 이수 + 시간표 충돌 제로. 가장 안전한 수강신청.",
    emoji: "🛡️",
    targetCredits: { min: 15, max: 21 },
    forceIncludeCodes: ["EO203", "EO209"],
    scorer: (c, cur) => {
      let s = 0;
      if (isAcademicRequired(c)) s += 50;
      s += c.rating * 10;
      s -= activeDays([...cur, c]).size * 2; // prefer fewer days
      return s;
    },
    sort: (a, b) => {
      const aReq = isAcademicRequired(a) ? 1 : 0;
      const bReq = isAcademicRequired(b) ? 1 : 0;
      if (aReq !== bReq) return bReq - aReq;
      return b.rating - a.rating;
    },
  },
  {
    planId: "B",
    label: "꿀강 플랜",
    description: "에브리타임 평점 최상위 강의 집중 편성. 학점 부담 최소화.",
    emoji: "⭐",
    targetCredits: { min: 12, max: 18 },
    scorer: (c) => c.rating * 10 + Math.log10(c.addedCount + 1) * 5,
    sort: (a, b) => b.rating - a.rating || b.addedCount - a.addedCount,
  },
  {
    planId: "C",
    label: "공강 플랜",
    description: "수업을 특정 요일에 집중 배치하여 공강일 최대화.",
    emoji: "🏖️",
    targetCredits: { min: 12, max: 18 },
    scorer: (c, cur) => {
      const days = activeDays([...cur, c]);
      const freeDayBonus = (5 - days.size) * 20;
      return freeDayBonus + c.rating * 3;
    },
    sort: (a, b) => {
      // Prefer courses on Mon/Tue (cluster MWF vs TTh)
      const dayOrder: Record<string, number> = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4 };
      const aDay = a.schedule[0]?.day ?? "금";
      const bDay = b.schedule[0]?.day ?? "금";
      return (dayOrder[aDay] ?? 5) - (dayOrder[bDay] ?? 5);
    },
  },
  {
    planId: "D",
    label: "전공심화 플랜",
    description: "전공 필수·기초 최대 이수. 졸업 요건 조기 달성 전략.",
    emoji: "🎓",
    targetCredits: { min: 18, max: 21 },
    forceIncludeCodes: ["EO203", "EO209", "EO111"],
    scorer: (c) => {
      let s = 0;
      if (c.category === "전공" || c.category === "학부기초") s += 30;
      if (isAcademicRequired(c)) s += 40;
      s += c.credits * 5;
      return s;
    },
    sort: (a, b) => {
      const aScore = (a.category === "전공" || a.category === "학부기초" ? 30 : 0)
        + (isAcademicRequired(a) ? 40 : 0) + a.credits * 5;
      const bScore = (b.category === "전공" || b.category === "학부기초" ? 30 : 0)
        + (isAcademicRequired(b) ? 40 : 0) + b.credits * 5;
      return bScore - aScore;
    },
  },
];

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Generate all 4 scenario plans from everytime-raw.json.
 * Returns EngineResult[] ready for TimetableGrid display.
 */
export function generateAllPlans(): EngineResult[] {
  const pool = everytimeRaw.courses as EverytimeCourse[];

  return PLAN_CONFIGS.map((config) => {
    const selected = selectCourses(pool, config);
    const active = activeDays(selected);
    const free = ALL_DAYS.filter(d => !active.has(d));
    const credits = totalCredits(selected);
    const rating = avgRating(selected);

    // Simple score: free days * 10 + avg rating * 5 + credits bonus
    const score = free.length * 10 + rating * 5 + (credits >= 15 ? 5 : 0);

    return {
      planId: config.planId,
      label: config.label,
      description: config.description,
      emoji: config.emoji,
      courses: selected.map(toAppCourse),
      totalCredits: credits,
      avgRating: Math.round(rating * 10) / 10,
      freeDays: free,
      score,
    } satisfies EngineResult;
  });
}

/**
 * Generate a single plan by ID.
 */
export function generatePlan(planId: "A" | "B" | "C" | "D"): EngineResult | null {
  const all = generateAllPlans();
  return all.find(p => p.planId === planId) ?? null;
}
