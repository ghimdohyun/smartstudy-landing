// Graduation Delay Risk Detection Engine
// Cross-references parsed timetable courses with academic-rules.json
// to detect "1년 더 다녀야 해!" scenarios.

import type { Course, StudyPlan } from "@/types";
import academicRules from "@/lib/data/academic-rules.json";

// ─── Types ─────────────────────────────────────────────────────────────────

export type RiskSeverity = "safe" | "warning" | "danger";

export interface MissedRequiredCourse {
  code: string;
  name: string;
  category: string;
  offeredSemesters: number[];
  offeredOnce: boolean;
  note: string;
  consequence: string;
}

export interface GraduationRisk {
  severity: RiskSeverity;
  /** Total extra years needed if current trajectory continues */
  extraYears: number;
  missedCourses: MissedRequiredCourse[];
  triggeredRules: string[];
  /** Human-readable summary for the banner headline */
  headline: string;
  /** Detailed explanation lines */
  details: string[];
}

// ─── Course name normalizer ─────────────────────────────────────────────────

/** Strip whitespace / parenthetical suffixes for fuzzy matching.
 * "전산수학(필수)" → "전산수학"
 */
function normalizeName(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** Collect all course names + codes from plan cards (all 4 plans). */
function collectTakenCourses(plans: StudyPlan[]): { names: Set<string>; codes: Set<string> } {
  const names = new Set<string>();
  const codes = new Set<string>();
  for (const plan of plans) {
    for (const course of plan.courses ?? []) {
      if (course.name) names.add(normalizeName(course.name));
      if (course.code) codes.add(course.code.toLowerCase());
    }
  }
  return { names, codes };
}

/** True if the taken set includes this DB course (by code or fuzzy name). */
function isTaken(
  dbCode: string,
  dbName: string,
  taken: { names: Set<string>; codes: Set<string> },
): boolean {
  if (taken.codes.has(dbCode.toLowerCase())) return true;
  const norm = normalizeName(dbName);
  // Exact normalised match
  if (taken.names.has(norm)) return true;
  // Partial match (DB name contained in taken name or vice versa)
  for (const takenName of taken.names) {
    if (takenName.includes(norm) || norm.includes(takenName)) return true;
  }
  return false;
}

// ─── Main engine ────────────────────────────────────────────────────────────

/**
 * Analyse which required courses are missing from the AI-generated plans.
 *
 * @param plans   The AI-generated study plans (Plan A~D from localStorage)
 * @param currentYear   Student's current year (1~4), defaults to 2
 * @param currentSemester  Student's current semester (1 or 2), defaults to 1
 */
export function detectGraduationRisk(
  plans: StudyPlan[],
  currentYear = 2,
  currentSemester = 1,
): GraduationRisk {
  const taken = collectTakenCourses(plans);
  const missed: MissedRequiredCourse[] = [];

  // Check every required course in the DB
  for (const course of academicRules.courses) {
    if (!course.required) continue;

    // Only warn about courses the student should have been able to take by now
    // (year < currentYear) OR (year === currentYear && semester <= currentSemester) OR year === null
    const courseYear = course.year ?? currentYear;
    const isPast =
      courseYear < currentYear ||
      (courseYear === currentYear &&
        course.semesters.some((s) => s <= currentSemester));

    if (!isPast) continue; // future course — not a risk yet

    if (!isTaken(course.code, course.name, taken)) {
      missed.push({
        code: course.code,
        name: course.name,
        category: course.category,
        offeredSemesters: course.semesters,
        offeredOnce: course.offeredOnce,
        note: course.note,
        consequence: findConsequence(course.code),
      });
    }
  }

  return buildRiskResult(missed);
}

/** Look up the consequence text from riskRules. */
function findConsequence(code: string): string {
  for (const rule of academicRules.riskRules) {
    if (rule.courses.includes(code)) return rule.consequence;
  }
  return "졸업 요건 미충족 위험";
}

/** Convert missed course list into a structured GraduationRisk result. */
function buildRiskResult(missed: MissedRequiredCourse[]): GraduationRisk {
  if (missed.length === 0) {
    return {
      severity: "safe",
      extraYears: 0,
      missedCourses: [],
      triggeredRules: [],
      headline: "졸업 요건 충족 중",
      details: ["현재 계획에서 필수 과목이 모두 확인됩니다."],
    };
  }

  // Calculate max delay years from triggered risk rules
  const triggeredRuleIds: string[] = [];
  let maxDelay = 0;

  for (const rule of academicRules.riskRules) {
    const allMissed = rule.courses.every((c) =>
      missed.some((m) => m.code === c),
    );
    if (allMissed) {
      triggeredRuleIds.push(rule.triggerId);
      if (rule.delayYears > maxDelay) maxDelay = rule.delayYears;
    }
  }

  // Severity: any offeredOnce missed past-due → danger; else warning
  const hasDangerCourse = missed.some((m) => m.offeredOnce);
  const severity: RiskSeverity = hasDangerCourse ? "danger" : "warning";

  const headline =
    maxDelay >= 1
      ? `${maxDelay}년 더 다녀야 할 수 있습니다!`
      : "졸업 요건 미충족 위험";

  const details = missed.map(
    (m) =>
      `${m.name}(${m.code}) — ${
        m.offeredOnce
          ? `연 1회 개설 (${m.offeredSemesters.map((s) => `${s}학기`).join("·")})`
          : "재이수 가능"
      } · ${m.consequence}`,
  );

  return {
    severity,
    extraYears: maxDelay,
    missedCourses: missed,
    triggeredRules: triggeredRuleIds,
    headline,
    details,
  };
}

// ─── Student info parser ────────────────────────────────────────────────────

/**
 * Extract current year/semester from free-text studentInfo.
 * "현재 2학년 1학기" → { year: 2, semester: 1 }
 */
export function parseStudentGrade(studentInfo: string): {
  year: number;
  semester: number;
} {
  const yearMatch = studentInfo.match(/(\d)[학년]/);
  const semMatch = studentInfo.match(/(\d)[학기]/);
  return {
    year: yearMatch ? parseInt(yearMatch[1], 10) : 2,
    semester: semMatch ? parseInt(semMatch[1], 10) : 1,
  };
}
