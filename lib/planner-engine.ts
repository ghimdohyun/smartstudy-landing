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
import everytimeRaw from "./data/everytime-raw.json";
import academicRules from "./data/academic-rules.json";

// ─── Preference Types ──────────────────────────────────────────────────────────

/**
 * User-defined scheduling preferences injected into the scoring engine.
 * All fields are optional — defaults produce neutral (zero) adjustments.
 */
export interface PlannerPreferences {
  /**
   * Penalty applied to courses that include 1교시 (09:00).
   * Pass a NEGATIVE number, e.g. -20 to penalise morning starts.
   * Default: 0 (no penalty).
   */
  penaltyEarlyMorning?: number;
  /**
   * List of professor name substrings to boost. Case-insensitive partial match.
   * e.g. ["김철수", "이영희"]
   */
  bonusPreferredProfs?: string[];
  /**
   * Score bonus applied when a candidate course matches a preferred professor.
   * Default: +25.
   */
  bonusProfWeight?: number;
  /**
   * Score awarded to any course that is a required prerequisite AND whose
   * absence would break the graduation critical path. Use a high positive
   * value (e.g. 60) so these courses are always selected first.
   * Default: 0.
   */
  mandatoryChainScore?: number;
}

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

/**
 * Parse Korean year string → number.
 * "1학년" → 1, "2학년" → 2, null/undefined → null
 */
function parseTargetYear(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+)학년/);
  return m ? parseInt(m[1], 10) : null;
}

/** Convert EverytimeCourse → Course (app type) */
function toAppCourse(et: EverytimeCourse): Course {
  // Use first schedule slot for day/time
  const slot = et.schedule[0];
  const period = slot?.periods[0];
  const startMin = period ? PERIOD_TO_MINUTES[period] : undefined;
  const timeStr = startMin !== undefined
    ? `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`
    : undefined;

  // Resolve academic-rules metadata for enriched fields
  const ruleCode = et.academicRulesCode ?? et.code;
  const acYear = courseYearMap.get(ruleCode) ?? deriveYearFromCode(et.code);
  const prereqFor = prerequisiteForMap.get(ruleCode) ?? [];

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
    // v2: enriched metadata
    recommendedYear: acYear ?? undefined,
    isPrerequisite: prereqFor.length > 0,
    prerequisiteFor: prereqFor.length > 0 ? prereqFor : undefined,
  } as Course;
}

/**
 * Derive recommended year from EO course code pattern.
 * EO1xx → 1, EO2xx → 2, EO3xx → 3, EO4xx → 4, GE-* → null (general).
 */
function deriveYearFromCode(code: string): number | null {
  const m = code.match(/^EO(\d)/i);
  if (m) return parseInt(m[1], 10);
  return null;
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

// ─── Academic-rules lookup maps ───────────────────────────────────────────────

interface AcademicCourse {
  code: string;
  name: string;
  year: number | null;
  required: boolean;
  offeredOnce: boolean;
  prerequisites?: string[];
}

const academicCourses = academicRules.courses as AcademicCourse[];

/** Required course codes from academic-rules.json */
const requiredCodes = new Set(
  academicCourses.filter(c => c.required || c.offeredOnce).map(c => c.code)
);

/** Map: course code → recommended year (1~4 or null) */
const courseYearMap = new Map<string, number | null>(
  academicCourses.map(c => [c.code, c.year])
);

/**
 * Map: course code → list of course codes it is a prerequisite FOR.
 * Built by inverting the `prerequisites` field in academic-rules.json.
 */
const prerequisiteForMap = new Map<string, string[]>();
for (const c of academicCourses) {
  for (const prereqCode of c.prerequisites ?? []) {
    const existing = prerequisiteForMap.get(prereqCode) ?? [];
    existing.push(c.code);
    prerequisiteForMap.set(prereqCode, existing);
  }
}

function isAcademicRequired(et: EverytimeCourse): boolean {
  return et.isGraduationRequired ||
    (et.academicRulesCode !== undefined && requiredCodes.has(et.academicRulesCode));
}

/** True if course has a 1교시 (09:00) slot — used for early-morning penalty */
function hasMorningSlot(et: EverytimeCourse): boolean {
  return et.schedule.some(s => s.periods.includes(1));
}

/**
 * Compute the preference-based score modifier for a candidate course.
 * Returns a signed delta to add on top of the plan's base scorer.
 */
function preferenceScore(
  et: EverytimeCourse,
  prefs: PlannerPreferences,
  current: EverytimeCourse[],
): number {
  let delta = 0;

  // 1. Early morning penalty
  if (prefs.penaltyEarlyMorning && hasMorningSlot(et)) {
    delta += prefs.penaltyEarlyMorning; // caller passes a negative number
  }

  // 2. Preferred professor bonus
  if (prefs.bonusPreferredProfs && prefs.bonusPreferredProfs.length > 0) {
    const profLower = et.professor.toLowerCase();
    if (prefs.bonusPreferredProfs.some(p => profLower.includes(p.toLowerCase()))) {
      delta += prefs.bonusProfWeight ?? 25;
    }
  }

  // 3. Mandatory prerequisite chain score
  // A course earns this bonus if it is a required/offeredOnce prerequisite AND
  // none of the courses it unlocks are already covered by the current selection.
  if (prefs.mandatoryChainScore) {
    const ruleCode = et.academicRulesCode ?? et.code;
    const unlocksOther = (prerequisiteForMap.get(ruleCode) ?? []).length > 0;
    const isRequired = requiredCodes.has(ruleCode) || et.isGraduationRequired;
    if (isRequired && unlocksOther) {
      // Check if the chain is currently at risk (none of the unlocked courses
      // are already in the selection)
      const unlocked = prerequisiteForMap.get(ruleCode) ?? [];
      const chainCovered = unlocked.some(uCode =>
        current.some(c => (c.academicRulesCode ?? c.code) === uCode)
      );
      if (!chainCovered) {
        delta += prefs.mandatoryChainScore;
      }
    }
  }

  return delta;
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
 *
 * @param prefs        Optional user scheduling preferences.
 * @param studentYear  Current student academic year (1~4). Courses outside
 *                     this year band are excluded from the greedy pool.
 *                     forceIncludeCodes are always allowed regardless of year.
 */
function selectCourses(
  pool: EverytimeCourse[],
  config: PlanConfig,
  prefs: PlannerPreferences = {},
  studentYear: number = 2,
): EverytimeCourse[] {
  const forcedCodes = new Set(config.forceIncludeCodes ?? []);

  // Deduplicate pool by name → keep best-rated section per course
  const byName = uniqueByName(pool);
  const deduped: EverytimeCourse[] = [];
  for (const [, sections] of byName) {
    const best = [...sections].sort((a, b) => b.rating - a.rating || b.addedCount - a.addedCount)[0];
    deduped.push(best);
  }

  /**
   * Year-appropriateness filter (applied to greedy pool only).
   * - Courses with targetYear strictly below studentYear are excluded:
   *   a 2nd-year student should have already completed 1st-year courses.
   * - Courses with targetYear above studentYear are also excluded:
   *   too advanced for the current semester.
   * - Courses with no targetYear restriction (null) are always included.
   * - forceIncludeCodes bypass this filter entirely.
   */
  function isYearAppropriate(c: EverytimeCourse): boolean {
    const isForced = forcedCodes.has(c.academicRulesCode ?? c.code ?? "");
    if (isForced) return true;
    const ty = parseTargetYear(c.targetYear);
    if (ty === null) return true; // no year restriction (general education etc.)
    return ty === studentYear;   // must match student's exact year
  }

  const yearFiltered = deduped.filter(isYearAppropriate);

  // Sort year-filtered candidates by scorer + preference score
  const scored = yearFiltered.map(c => ({
    course: c,
    baseScore: config.scorer(c, []) + preferenceScore(c, prefs, []),
  }));
  scored.sort((a, b) => b.baseScore - a.baseScore);
  const sorted = scored.map(s => s.course);

  const selected: EverytimeCourse[] = [];

  // Force-include required courses first (bypass year filter — use full deduped)
  if (config.forceIncludeCodes) {
    for (const code of config.forceIncludeCodes) {
      const course = deduped.find(c => c.academicRulesCode === code || c.code === code);
      if (course && !hasTimeConflict(course, selected)) {
        selected.push(course);
      }
    }
  }

  // Greedy fill up to max credits (year-filtered pool)
  for (const candidate of sorted) {
    if (selected.includes(candidate)) continue;
    const cur = totalCredits(selected);
    if (cur >= config.targetCredits.max) break;
    if (cur + candidate.credits > config.targetCredits.max) continue;
    if (hasTimeConflict(candidate, selected)) continue;

    // Re-evaluate with current selection for chain-risk awareness
    const liveScore = config.scorer(candidate, selected) + preferenceScore(candidate, prefs, selected);
    if (liveScore < -50) continue; // hard veto: extremely penalised course

    selected.push(candidate);
  }

  return selected;
}

// ─── Plan Configs ─────────────────────────────────────────────────────────────

const PLAN_CONFIGS: PlanConfig[] = [
  {
    planId: "A",
    label: "안전 플랜",
    description: "졸업 필수 과목 우선 이수 + 시간표 충돌 제로. 편람 기준 2학년 1학기 Golden Standard.",
    emoji: "🛡️",
    targetCredits: { min: 15, max: 19 },
    forceIncludeCodes: ["EO203", "EO209", "EO201"],
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
    description: "에브리타임 평점 최상위 강의 집중 편성. Plan A 실패 시 대안 — 전공기초 유지.",
    emoji: "⭐",
    targetCredits: { min: 12, max: 19 },
    forceIncludeCodes: ["EO203", "EO201"],
    scorer: (c) => c.rating * 10 + Math.log10(c.addedCount + 1) * 5,
    sort: (a, b) => b.rating - a.rating || b.addedCount - a.addedCount,
  },
  {
    planId: "C",
    label: "공강 플랜",
    description: "전공기초 수강 유지하면서 공강일 최대화. Plan A/B 수강신청 실패 시 여유 시나리오.",
    emoji: "🏖️",
    targetCredits: { min: 12, max: 19 },
    forceIncludeCodes: ["EO203"],
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
    description: "2학년 전공기초 전부 이수 + 선택 전공 최대 편성. 졸업 요건 조기 달성 전략.",
    emoji: "🎓",
    targetCredits: { min: 18, max: 19 },
    forceIncludeCodes: ["EO203", "EO209", "EO201"],
    scorer: (c) => {
      let s = 0;
      // 전공, 학부기초, 전공기초 모두 상위 우선순위
      if (c.category === "전공" || c.category === "학부기초" || c.category === "전공기초") s += 30;
      if (isAcademicRequired(c)) s += 40;
      s += c.credits * 5;
      return s;
    },
    sort: (a, b) => {
      const majorScore = (c: typeof a) =>
        (c.category === "전공" || c.category === "학부기초" || c.category === "전공기초" ? 30 : 0)
        + (isAcademicRequired(c) ? 40 : 0) + c.credits * 5;
      return majorScore(b) - majorScore(a);
    },
  },
];

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Internal plan builder shared between generateAllPlans and
 * generateAllPlansWithPreferences.
 *
 * @param studentYear  Academic year of the student (1~4). Default 2.
 *                     1학년 courses are excluded from 2학년 plans, etc.
 */
function buildAllPlans(prefs: PlannerPreferences = {}, studentYear: number = 2): EngineResult[] {
  const pool = everytimeRaw.courses as EverytimeCourse[];

  return PLAN_CONFIGS.map((config) => {
    const selected = selectCourses(pool, config, prefs, studentYear);
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
 * Generate all 4 scenario plans from everytime-raw.json.
 * Returns EngineResult[] ready for TimetableGrid display.
 *
 * @param studentYear  Academic year of the student (default 2).
 *                     Filters out courses intended for other years.
 */
export function generateAllPlans(studentYear: number = 2): EngineResult[] {
  return buildAllPlans({}, studentYear);
}

/**
 * Generate all 4 scenario plans with user-defined scheduling preferences.
 *
 * @param studentYear  Academic year of the student (default 2).
 *
 * @example
 * generateAllPlansWithPreferences({
 *   penaltyEarlyMorning: -20,   // avoid 09:00 classes
 *   bonusPreferredProfs: ["김철수"],
 *   mandatoryChainScore: 60,    // protect prerequisite chains
 * }, 2);
 */
export function generateAllPlansWithPreferences(prefs: PlannerPreferences, studentYear: number = 2): EngineResult[] {
  return buildAllPlans(prefs, studentYear);
}

/**
 * Generate a single plan by ID.
 */
export function generatePlan(planId: "A" | "B" | "C" | "D", studentYear: number = 2): EngineResult | null {
  const all = generateAllPlans(studentYear);
  return all.find(p => p.planId === planId) ?? null;
}

// ─── Fallback / Alternate-Rank Plan ───────────────────────────────────────────

/**
 * Extended EngineResult that identifies which course was swapped out in
 * favour of a lower-risk alternative.
 */
export interface FallbackResult extends EngineResult {
  /** The Plan A course that was identified as highest-competition-risk */
  swappedOut: Course;
  /** The replacement course chosen by the alternate-rank algorithm */
  swappedIn: Course;
  /** Human-readable reason for the swap */
  fallbackReason: string;
}

/**
 * 대체 순위 기반 알고리즘 — Alternate-Rank Fallback Generator
 *
 * Algorithm:
 * 1. Take Plan A's selected EverytimeCourse list.
 * 2. Score each course by "competition risk":
 *    - Low addedCount + low rating = high risk (many students compete, low quality)
 *    - Required/offeredOnce courses are protected from swapping.
 * 3. Identify the single riskiest NON-required course.
 * 4. Remove it. From the remaining pool (excluding Plan A courses), find the
 *    best non-conflicting replacement with maximum (rating + addedCount/100).
 * 5. Return the modified plan with swap metadata.
 *
 * If all courses are required or no valid substitute exists, returns null.
 */
export function generateFallbackPlan(prefs: PlannerPreferences = {}, studentYear: number = 2): FallbackResult | null {
  const pool = everytimeRaw.courses as EverytimeCourse[];

  // --- Step 1: Run Plan A to get the primary selection ---
  const planAConfig = PLAN_CONFIGS.find(c => c.planId === "A")!;
  const planASelected = selectCourses(pool, planAConfig, prefs, studentYear);
  if (planASelected.length === 0) return null;

  // --- Step 2: Score each Plan A course by competition risk ---
  // Risk score: lower addedCount = higher risk; ignore required/offeredOnce
  const swappableCourses = planASelected.filter(c => {
    const ruleCode = c.academicRulesCode ?? c.code;
    return !requiredCodes.has(ruleCode) && !c.isGraduationRequired;
  });
  if (swappableCourses.length === 0) return null;

  // Sort by risk descending (lowest addedCount = highest risk first)
  const ranked = [...swappableCourses].sort(
    (a, b) => (a.addedCount - b.addedCount) || (a.rating - b.rating)
  );
  const riskyCourse = ranked[0];

  // --- Step 3: Build remaining selection (Plan A minus risky course) ---
  const remaining = planASelected.filter(c => c.code !== riskyCourse.code);
  const remainingCodes = new Set(remaining.map(c => c.code));

  // --- Step 4: Find best substitute ---
  // Candidate pool: anything NOT already in Plan A and not time-conflicting
  const candidates = pool
    .filter(c => !remainingCodes.has(c.code) && c.code !== riskyCourse.code)
    .filter(c => !hasTimeConflict(c, remaining))
    .filter(c => c.credits <= (planAConfig.targetCredits.max - totalCredits(remaining)))
    // Apply preference modifiers
    .map(c => ({
      course: c,
      score: c.rating * 10 + Math.log10(c.addedCount + 1) * 8
             + preferenceScore(c, prefs, remaining),
    }))
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return null;
  const substitute = candidates[0].course;

  // --- Step 5: Build fallback EngineResult ---
  const fallbackSelected = [...remaining, substitute];
  const active = activeDays(fallbackSelected);
  const free = ALL_DAYS.filter(d => !active.has(d));
  const credits = totalCredits(fallbackSelected);
  const rating = avgRating(fallbackSelected);
  const score = free.length * 10 + rating * 5 + (credits >= 15 ? 5 : 0);

  return {
    planId: "A",
    label: "안전 플랜 (대체)",
    description: `Plan A에서 경쟁률 위험 과목(${riskyCourse.name})을 ${substitute.name}(으)로 대체한 최소 리스크 버전`,
    emoji: "🛡️↔",
    courses: fallbackSelected.map(toAppCourse),
    totalCredits: credits,
    avgRating: Math.round(rating * 10) / 10,
    freeDays: free,
    score,
    swappedOut: toAppCourse(riskyCourse),
    swappedIn: toAppCourse(substitute),
    fallbackReason:
      `${riskyCourse.name}(수강신청 경쟁률 위험: 에브리타임 추가수 ${riskyCourse.addedCount}명, 평점 ${riskyCourse.rating}) → ` +
      `${substitute.name}(평점 ${substitute.rating}, 추가수 ${substitute.addedCount}명)으로 대체`,
  };
}
