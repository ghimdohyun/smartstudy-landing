// Planner Logic — pure utility functions for schedule validation and optimization.
// Algorithm inspired by timetable-wizard (karpitony/timetable-wizard) scoring model.
// No LLM calls. Used for prompt injection (constraints) and post-processing (validate).

import type { Course, StudyPlan } from "@/types";
import type { CourseRule } from "@/lib/university-kb";

// ─── Time Normalization (timetable-wizard: toMinutes) ────────────────────────

const PERIOD_START = 9 * 60; // 09:00 in minutes
const PERIOD_MINS  = 90;     // 90 minutes per period (Korean standard)
const ALL_DAYS     = ["월", "화", "수", "목", "금"] as const;

/**
 * Convert Korean time string to minutes-since-midnight.
 * "3교시" → 720 (10:30)   "09:00" → 540
 * Returns null if unparseable.
 */
export function toMinutes(raw?: string): number | null {
  if (!raw) return null;
  const period = raw.match(/(\d+)교시/);
  if (period) return PERIOD_START + (parseInt(period[1], 10) - 1) * PERIOD_MINS;
  const clock = raw.match(/(\d{1,2}):(\d{2})/);
  if (clock) return parseInt(clock[1], 10) * 60 + parseInt(clock[2], 10);
  return null;
}

// ─── Day Parsing ──────────────────────────────────────────────────────────────

/**
 * Parse multi-day string into individual day tokens.
 * "월수금" → ["월","수","금"]   "화,목" → ["화","목"]
 */
function parseDays(raw?: string): string[] {
  if (!raw) return [];
  // Try single Korean chars first (e.g. "월수금")
  const chars = (raw.match(/[월화수목금토일]/g) ?? []);
  if (chars.length > 0) return [...new Set(chars)];
  // Fallback: delimiter-separated
  return raw.replace(/[,/·\s]+/g, ",").split(",").map((t) => t.trim()).filter(Boolean);
}

// ─── Conflict Detection (timetable-wizard: hasConflict) ──────────────────────

export interface TimeConflict {
  courseA: string;
  courseB: string;
  day: string;
  time: string;
}

/**
 * True if course A and B overlap on the same day (minute-based interval overlap).
 * overlap = (aStart < bEnd) && (bStart < aEnd)
 */
function hasConflict(
  daysA: string[], startA: number, endA: number,
  daysB: string[], startB: number, endB: number,
): string | null {
  for (const day of daysA) {
    if (daysB.includes(day) && startA < endB && startB < endA) {
      return day;
    }
  }
  return null;
}

/**
 * Detect all time overlaps in a course list using minute-based overlap detection.
 * Replaces the old string-key approach with exact interval arithmetic.
 */
export function checkTimeConflict(courses: Course[]): TimeConflict[] {
  const conflicts: TimeConflict[] = [];
  const expanded = courses.map((c) => ({
    name: c.name,
    days: parseDays(c.day),
    start: toMinutes(c.time) ?? -1,
    end:   (toMinutes(c.time) ?? -1) + PERIOD_MINS,
    time:  c.time ?? "",
  }));

  for (let i = 0; i < expanded.length; i++) {
    for (let j = i + 1; j < expanded.length; j++) {
      const a = expanded[i];
      const b = expanded[j];
      if (a.start < 0 || b.start < 0) continue; // no time → skip
      const conflictDay = hasConflict(a.days, a.start, a.end, b.days, b.start, b.end);
      if (conflictDay) {
        conflicts.push({ courseA: a.name, courseB: b.name, day: conflictDay, time: a.time });
      }
    }
  }
  return conflicts;
}

// ─── Plan Scoring (timetable-wizard: scoreTimetable) ─────────────────────────

/**
 * Multi-factor quality score for a set of courses.
 * Higher = better schedule quality.
 *
 * Scoring (ported from timetable-wizard):
 *   +5  per free day (no classes)
 *   -2  per consecutive back-to-back pair (same day, endA === startB)
 *   +1  per 30 min after 09:00 for each day's first course (later start → better)
 *   +1  per 30 min before 18:00 for each day's last course (earlier end → better)
 *   +10 if preferOffDay has zero courses
 */
export function scorePlan(courses: Course[], preferOffDay?: string): number {
  type DaySlot = { start: number; end: number };
  const dayMap = new Map<string, DaySlot[]>();

  for (const c of courses) {
    const days  = parseDays(c.day);
    const start = toMinutes(c.time);
    if (start === null) continue;
    const end = start + PERIOD_MINS;
    for (const day of days) {
      const slots = dayMap.get(day) ?? [];
      slots.push({ start, end });
      dayMap.set(day, slots);
    }
  }

  let score = 0;

  // Free days bonus
  const activeDays = new Set<string>(dayMap.keys());
  for (const day of ALL_DAYS) {
    if (!activeDays.has(day)) score += 5;
  }

  // Off-day bonus
  const offDay = preferOffDay?.replace("요일", "");
  if (offDay && !activeDays.has(offDay)) score += 10;

  for (const [, slots] of dayMap) {
    const sorted = [...slots].sort((a, b) => a.start - b.start);

    // Consecutive penalty
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start === sorted[i - 1].end) score -= 2;
    }

    // Late start incentive
    const firstStart = sorted[0]?.start ?? PERIOD_START;
    score += Math.floor((firstStart - PERIOD_START) / 30);

    // Early end incentive
    const lastEnd = sorted[sorted.length - 1]?.end ?? 18 * 60;
    score += Math.floor((18 * 60 - lastEnd) / 30);
  }

  return score;
}

// ─── Virtual Time Generation ──────────────────────────────────────────────────

// Preferred day-pair patterns (Korean MWF / TTh style)
const DAY_PATTERNS = ["월수", "화목", "월수금", "화목", "월화", "수목"];
const STANDARD_TIMES = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"];

/**
 * Assign synthetic optimal time slots to courses that have NO day/time data.
 * Uses a greedy scoring approach: each unscheduled course picks the (pattern, time)
 * slot that maximises the overall plan score.
 *
 * Virtual courses are tagged with _virtual:true so the UI can show a "(가상)" note.
 * Scheduled courses are returned unchanged.
 */
export function generateVirtualTimes(
  courses: Course[],
  preferOffDay = "금",
): (Course & { _virtual?: boolean })[] {
  const offDay = preferOffDay.replace("요일", "");

  // Allowed patterns: exclude any that include offDay
  const allowedPatterns = DAY_PATTERNS.filter(
    (p) => !parseDays(p).includes(offDay),
  );

  const result: (Course & { _virtual?: boolean })[] = [];
  const assigned: Course[] = [];

  for (const course of courses) {
    if (course.day && course.time) {
      // Already scheduled — keep as-is
      result.push(course);
      assigned.push(course);
      continue;
    }

    // Find best (pattern, time) combo by scoring
    let bestScore = -Infinity;
    let bestDay   = allowedPatterns[0];
    let bestTime  = STANDARD_TIMES[0];

    for (const pattern of allowedPatterns) {
      for (const time of STANDARD_TIMES) {
        const candidate: Course = { ...course, day: pattern, time };
        const testSet = [...assigned, candidate];
        const s = scorePlan(testSet, preferOffDay);
        if (s > bestScore) {
          bestScore = s;
          bestDay   = pattern;
          bestTime  = time;
        }
      }
    }

    const virtual: Course & { _virtual: boolean } = {
      ...course,
      day:      bestDay,
      time:     bestTime,
      _virtual: true,
    };
    result.push(virtual);
    assigned.push(virtual);
  }

  return result;
}

// ─── CJK Noise Removal ───────────────────────────────────────────────────────

/**
 * Strip Chinese/Japanese CJK characters that occasionally leak into AI output
 * when processing mixed Korean/Chinese corpus (편람 PDFs).
 * Preserves Korean (Hangul), ASCII, and all standard punctuation.
 */
export function stripCjkNoise(text: string): string {
  return text
    // CJK Unified Ideographs + Extension A + Compatibility block
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Credit Calculation ───────────────────────────────────────────────────────

/** Sum the credits of all courses that have a defined credit value. */
export function calculateTotalCredits(courses: Course[]): number {
  return courses.reduce((sum, c) => sum + (c.credits ?? 0), 0);
}

// ─── Required-Course Prioritization ──────────────────────────────────────────

/**
 * Sort courses so that those matching a "require" rule appear first.
 * Stable sort — tie-breaks preserve original order.
 */
export function prioritizeRequired(courses: Course[], rules: CourseRule[]): Course[] {
  const requiredCodes = new Set(
    rules.filter((r) => r.action === "require" && r.code).map((r) => r.code!.toLowerCase()),
  );
  const requiredNames = rules
    .filter((r) => r.action === "require")
    .map((r) => r.name.toLowerCase());

  function isRequired(c: Course): boolean {
    if (c.code && requiredCodes.has(c.code.toLowerCase())) return true;
    if (requiredNames.some((n) => c.name.toLowerCase().includes(n))) return true;
    if (c.requirement && (c.requirement.includes("필수") || c.requirement.includes("기초"))) return true;
    return false;
  }

  return [...courses].sort((a, b) => (isRequired(a) ? 0 : 1) - (isRequired(b) ? 0 : 1));
}

// ─── Prompt Constraint Builder ────────────────────────────────────────────────

/**
 * Produce a human-readable constraint block for AI prompt injection.
 */
export function buildPlannerConstraints(rules: CourseRule[]): string {
  const required = rules.filter((r) => r.action === "require");
  const excluded = rules.filter((r) => r.action === "exclude");
  const lines: string[] = [];
  if (required.length) {
    lines.push("【필수 포함 과목】");
    for (const r of required) {
      const code = r.code ? `(${r.code}) ` : "";
      const hint = r.semesterHint ? ` — ${r.semesterHint}` : "";
      lines.push(`  • ${code}${r.name}${hint}`);
    }
  }
  if (excluded.length) {
    lines.push("【제외 과목】");
    for (const r of excluded) {
      lines.push(`  • ${r.code ? `(${r.code}) ` : ""}${r.name}`);
    }
  }
  return lines.join("\n");
}

// ─── Retake Course Locking ────────────────────────────────────────────────────

/**
 * Lock retake courses at the TOP of every plan — they are non-negotiable.
 * A course is treated as a retake if:
 *   1. (course as any).retake === true, OR
 *   2. course.code is in the retakeCodes list (case-insensitive), OR
 *   3. course.note includes "재수강"
 */
export function lockRetakesFirst(
  courses: Course[],
  retakeCodes: string[] = [],
): Course[] {
  const retakeSet = new Set(retakeCodes.map((c) => c.toLowerCase()));

  function isRetake(c: Course): boolean {
    if ((c as unknown as { retake?: boolean }).retake === true) return true;
    if (c.code != null && retakeSet.has(c.code.toLowerCase())) return true;
    if (c.note && c.note.includes("재수강")) return true;
    return false;
  }

  const retakes = courses.filter(isRetake);
  const rest    = courses.filter((c) => !isRetake(c));
  return [...retakes, ...rest];
}

// ─── 4-Way Scenario Engine ────────────────────────────────────────────────────

interface ScenarioConfig {
  label: string;
  strategy: string;
  targetCredits: number;
  preferOffDay: string;
}

const SCENARIO_PRESETS: ScenarioConfig[] = [
  {
    label:         "Plan A",
    strategy:      "재수강 우선 + 전공필수 확보 (성적 회복 집중형)",
    targetCredits: 18,
    preferOffDay:  "금",
  },
  {
    label:         "Plan B",
    strategy:      "균형 이수 (오전 집중 + 수요일 공강)",
    targetCredits: 18,
    preferOffDay:  "수",
  },
  {
    label:         "Plan C",
    strategy:      "공강일 최대화 (취업·스터디 병행형 15학점)",
    targetCredits: 15,
    preferOffDay:  "금",
  },
  {
    label:         "Plan D",
    strategy:      "경량 학기 (실습·인턴십 병행 최소 이수 12학점)",
    targetCredits: 12,
    preferOffDay:  "월",
  },
];

/**
 * Generate 4 distinct course plans from a pool of available courses.
 * Retake courses are ALWAYS locked at the top of every plan.
 * Each scenario trims to its targetCredits, then injects virtual times and scores.
 */
export function generateFourScenarios(
  coursePool: Course[],
  rules: CourseRule[] = [],
  retakeCodes: string[] = [],
): Array<StudyPlan & { score: number; conflicts: TimeConflict[] }> {
  return SCENARIO_PRESETS.map((cfg) => {
    // 1. Apply rules priority + lock retakes at top
    const ordered = lockRetakesFirst(prioritizeRequired(coursePool, rules), retakeCodes);

    // 2. Trim greedily to targetCredits
    let used = 0;
    const picked = ordered.filter((c) => {
      const cr = c.credits ?? 3;
      if (used + cr <= cfg.targetCredits) { used += cr; return true; }
      return false;
    });

    // 3. Inject virtual times for courses missing schedule data
    const withTimes = generateVirtualTimes(picked, cfg.preferOffDay);

    // 4. Annotate
    const conflicts = checkTimeConflict(withTimes);
    const score     = scorePlan(withTimes, cfg.preferOffDay);

    return {
      label:        cfg.label,
      strategy:     cfg.strategy,
      courses:      withTimes,
      totalCredits: used,
      score,
      conflicts,
    };
  });
}

// ─── Plan Annotation ──────────────────────────────────────────────────────────

/**
 * Annotate a StudyPlan with computed totalCredits, time conflicts, and quality score.
 * Returns a new plan object (does not mutate the original).
 */
export function annotatePlan(
  plan: StudyPlan,
  rules: CourseRule[] = [],
  preferOffDay?: string,
): StudyPlan & { conflicts: TimeConflict[]; score: number } {
  const courses   = plan.courses ?? [];
  const sorted    = prioritizeRequired(courses, rules);
  const total     = calculateTotalCredits(sorted);
  const conflicts = checkTimeConflict(sorted);
  const score     = scorePlan(sorted, preferOffDay);

  return {
    ...plan,
    courses: sorted,
    totalCredits: plan.totalCredits ?? total,
    conflicts,
    score,
  };
}
