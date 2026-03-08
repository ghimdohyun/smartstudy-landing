// vision-risk.ts — Instant client-side graduation risk check
// Runs immediately when user pastes/uploads timetable image description
// Checks if critical required courses (EO203, EO209, etc.) appear to be
// missing from the user's current semester based on their text input.

import criticalPath from "@/lib/data/critical-path.json";
import type { GraduationRisk, MissedRequiredCourse } from "@/lib/graduation-risk";

/** Normalize course code/name for fuzzy matching */
function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/** Check if text contains a course reference (code or name) */
function mentionsCourse(text: string, code: string, name: string): boolean {
  const t = normalize(text);
  if (t.includes(normalize(code))) return true;
  if (t.includes(normalize(name))) return true;
  // Also check common abbreviations
  const shortName = normalize(name).slice(0, 4);
  if (shortName.length >= 3 && t.includes(shortName)) return true;
  return false;
}

/**
 * Detect graduation risk from raw text input (timetableInfo / studentInfo).
 * This is a FAST client-side check — no API call needed.
 *
 * @param studentInfo  Free-text student info (학년·학기 extraction)
 * @param timetableInfo  Free-text timetable/conditions input
 * @param imageDescription  Optional: description extracted from uploaded image
 * @returns GraduationRisk | null (null if not enough info to determine)
 */
export function detectVisionRisk(
  studentInfo: string,
  timetableInfo: string,
  imageDescription?: string,
): GraduationRisk | null {
  // Only run for kyungsung-sw context (detect from studentInfo text)
  const combinedText = [studentInfo, timetableInfo, imageDescription ?? ""].join(" ");
  const isKyungsungContext =
    combinedText.includes("경성") ||
    combinedText.includes("소프트웨어학과") ||
    combinedText.includes("EO") ||
    combinedText.includes("전산수학") ||
    combinedText.includes("리눅스시스템");

  if (!isKyungsungContext) return null;

  // Determine current year/semester from studentInfo
  const yearMatch = studentInfo.match(/(\d)[학년]/);
  const semMatch = studentInfo.match(/(\d)[학기]/);
  const currentYear = yearMatch ? parseInt(yearMatch[1], 10) : 2;
  const currentSemester = semMatch ? parseInt(semMatch[1], 10) : 1;

  // Find critical courses that SHOULD be taken by now but appear missing
  const missed: MissedRequiredCourse[] = [];

  for (const course of criticalPath.criticalCourses) {
    // Only check courses that should have been taken by now
    const isPast =
      course.year < currentYear ||
      (course.year === currentYear && course.semester <= currentSemester);

    if (!isPast) continue;

    // Only warn about REQUIRED offeredOnce courses (highest impact)
    if (!course.required || !course.offeredOnce) continue;

    // If the text mentions this course, consider it taken
    if (mentionsCourse(combinedText, course.code, course.name)) continue;

    missed.push({
      code: course.code,
      name: course.name,
      category: "전공기초",
      offeredSemesters: [course.semester],
      offeredOnce: course.offeredOnce,
      note: course.riskMessage,
      consequence: course.riskMessage,
    });
  }

  if (missed.length === 0) return null;

  // Check key risks
  const missedCodes = new Set(missed.map((m) => m.code));
  let maxDelay = 0;
  const triggeredRules: string[] = [];

  for (const risk of criticalPath.keyRisks) {
    if (risk.courses.every((c) => missedCodes.has(c))) {
      triggeredRules.push(risk.id);
      if (risk.delayYears > maxDelay) maxDelay = risk.delayYears;
    }
  }

  const headline =
    missed.length === 1
      ? `⚠️ 위기 감지: ${missed[0].name} 누락 시 졸업 ${maxDelay}년 지연 확률 98%`
      : `${missed.length}개 필수 과목 누락 — 졸업 ${maxDelay > 0 ? maxDelay + "년" : ""} 지연 위험`;

  return {
    severity: "danger",
    extraYears: maxDelay,
    missedCourses: missed,
    triggeredRules,
    headline,
    details: missed.map(
      (m) => `${m.name}(${m.code}) — 연 1회 개설 · ${m.consequence}`,
    ),
  };
}
