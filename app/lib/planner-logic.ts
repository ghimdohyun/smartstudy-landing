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

// ─── Grade-Year Roadmap Hint Builder ─────────────────────────────────────────

/**
 * Build a grade-level yearly roadmap hint for injection into AI prompts.
 * Reflects 경성대 역량개발시스템(I-로드맵) application windows (March / September).
 */
export function buildGradeYearPlanHint(studentYear: number | null): string {
  if (!studentYear) return "";

  const baseMonths: Record<number, string> = {
    1:  "자기계발 계획서 작성 + 기초역량 강화",
    2:  "수강신청 완료 + 개강 준비",
    3:  "I-로드맵 신청 + 수강 루틴 정착",
    4:  "중간고사 준비 + 전공 교수 면담",
    5:  "팀 프로젝트 완료 + 성적 관리",
    6:  "기말고사 + 다음 학기 수강 계획 초안",
    7:  "여름방학 자기계발 (자격증·대외활동)",
    8:  "2학기 수강신청 완료 + 인턴십·대외활동",
    9:  "I-로드맵 2차 신청 + 2학기 루틴 정착",
    10: "전공 심화 학습 + 중간고사 준비",
    11: "취업 박람회·진로 세미나 참가 + 기말고사 준비",
    12: "기말고사 + 1년 회고 + 다음 학년 목표 수립",
  };

  const gradeSpecific: Record<number, Partial<Record<number, string>>> = {
    1: {
      3:  "I-로드맵 기초역량 과정 신청 (3월 개강 직후) + 전공 탐색 세미나 참가",
      9:  "I-로드맵 진로 탐색 프로그램 신청 + 학과 멘토링 신청",
    },
    2: {
      3:  "I-로드맵 전공역량 과정 신청 + 융합Cell(인문사회·예술창작) 수강 계획 확정",
      9:  "I-로드맵 전공 심화 세미나 신청 + 학술 소모임 참여",
    },
    3: {
      3:  "I-로드맵 취창업역량 과정 신청 + 상반기 인턴십 지원 시작",
      6:  "인턴십 지원 마감 체크 + 캡스톤 사전 조사",
      9:  "캡스톤 설계 착수 + 취업 스터디 개설",
      11: "취업 박람회 참가 필수 + 포트폴리오 초안 완성",
    },
    4: {
      3:  "졸업논문/캡스톤 착수 + I-로드맵 최종 성과 계획 수립",
      6:  "캡스톤 중간 발표 + 취업 최종 서류 준비",
      9:  "I-로드맵 성과 발표 신청 + 졸업요건 최종 점검",
      12: "졸업 심사 완료 + 취업·진로 확정",
    },
  };

  const yearMap = gradeSpecific[studentYear] ?? {};
  const lines: string[] = [`[${studentYear}학년 맞춤 월별 로드맵 — 경성대 I-로드맵 연계]`];
  for (let m = 1; m <= 12; m++) {
    const base = baseMonths[m] ?? "";
    const extra = yearMap[m] ?? "";
    lines.push(`  ${m}월: ${extra ? extra + " / " : ""}${base}`);
  }
  return lines.join("\n");
}

/**
 * Parse an explicitly requested credit count from studentInfo / timetableInfo.
 * "21학점" → 21.  Returns null if not found or out of valid range.
 */
export function detectRequestedCredits(text: string): number | null {
  const patterns = [
    /(\d{1,2})\s*학점\s*(으로|을|을\s*목표|을\s*원|이\s*원|이\s*목표)/,
    /총\s*(\d{1,2})\s*학점/,
    /(\d{1,2})\s*학점\s*(?:신청|등록|이수|수강)/,
    /(\d{1,2})\s*학점/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 9 && n <= 24) return n;
    }
  }
  return null;
}
