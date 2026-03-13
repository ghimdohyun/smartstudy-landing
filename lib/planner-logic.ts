// Planner Logic — pure utility functions for schedule validation and optimization.
// Algorithm inspired by timetable-wizard (karpitony/timetable-wizard) scoring model.
// No LLM calls. Used for prompt injection (constraints) and post-processing (validate).

import type { Course, StudyPlan } from "@/types";
import type { CourseRule } from "@/lib/university-kb";
import { getCoreCoursesForYear, getElectiveCoursesForYear } from "@/lib/data/ksu-sw";

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

// ─── Year-Level Hard Filtering ───────────────────────────────────────────────

/**
 * 1학년 전용 과목 목록 — 2학년 이상 플랜에서 자동 제거됨 (Hard-Filter).
 * 비교는 대소문자 무시(toLowerCase) + 부분 일치로 처리.
 */
const YEAR1_EXCLUSIVE_COURSES = [
  "사고와표현", "사고와 표현", "사고와표현(1)",
  "english communication", "english comm", "englishcomm",
  "academic english",
  "영어커뮤니케이션", "기초영어작문", "기초영어", "기초영어회화",
  "대학생활과 진로", "대학생활과진로", "대학생활과진로탐색",
  "대학영어", "영어회화기초", "영어회화",
  "글쓰기기초", "글쓰기와소통",
  // QY027045 — 1학년 공통필수: 2학년 이상 플랜에서 제외
  "인성과성찰", "인성 및 성찰", "인성및성찰",
];

/**
 * Detect student's grade year from studentInfo text.
 * "2학년" → 2, "3학년" → 3. Returns null if not found.
 */
export function detectStudentYear(studentInfo: string): number | null {
  const match = studentInfo.match(/([1-4])학년/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse an explicitly requested credit count from studentInfo / timetableInfo.
 * "21학점" or "21 학점" → 21.  Returns null if not found.
 * Used to override the university config's default targetCredits with the
 * student's own requested value (WEIGHT=ABSOLUTE per REQUIRED_STRICT).
 */
export function detectRequestedCredits(text: string): number | null {
  // Match patterns like "21학점", "총 21학점", "21 학점", "학점: 21"
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
      // Sanity-check: valid semester credit range
      if (n >= 9 && n <= 24) return n;
    }
  }
  return null;
}

/**
 * Hard-filter: remove courses that belong exclusively to a lower year.
 * - target="1학년" with student ≥ 2학년  → removed
 * - Course name in YEAR1_EXCLUSIVE_COURSES with student ≥ 2학년 → removed
 * Safe: 1학년 students always receive unfiltered course pool.
 */
export function hardFilterCoursesByYear(courses: Course[], studentYear: number): Course[] {
  if (studentYear <= 1) return courses;

  return courses.filter((course) => {
    const target = (course.target ?? "").trim();
    // Target explicitly "1학년" only → exclude for 2학년+
    if (/^1학년$/.test(target) && studentYear >= 2) return false;

    // Known exclusive course names — case-insensitive partial match
    const nameLower = (course.name ?? "").toLowerCase();
    if (YEAR1_EXCLUSIVE_COURSES.some((exc) => nameLower.includes(exc.toLowerCase()))) return false;

    return true;
  });
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

// ─── Must-Have Courses (2학년 1학기 SOT) ──────────────────────────────────────

/**
 * 2학년 1학기 소프트웨어학과 Must-Have 과목 (전공기초 필수 3종).
 * Plan A (stable) 에서 시간충돌이 없는 한 반드시 최우선 포함.
 */
export const MUST_HAVE_YEAR2_SEM1_NAMES = ["전산수학", "리눅스시스템", "자료구조"] as const;
const MUST_HAVE_SET = new Set(MUST_HAVE_YEAR2_SEM1_NAMES as readonly string[]);

function isMustHave(c: Course): boolean {
  const n = (c.name ?? "").replace(/\s+/g, "");
  return MUST_HAVE_SET.has(c.name ?? "") || [...MUST_HAVE_SET].some((m) => n.includes(m.replace(/\s+/g, "")));
}

/**
 * Sort courses so that Must-Have courses appear first (stable sort).
 * Used for Plan A (stable) year=2 to guarantee must-haves are picked first.
 */
function sortMustHaveFirst(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => (isMustHave(a) ? 0 : 1) - (isMustHave(b) ? 0 : 1));
}

// ─── Plan Risk Analyzer ────────────────────────────────────────────────────────

/**
 * Compute dynamic risk analysis items for a finalized plan.
 * Returns human-readable Korean strings for UI display.
 */
function computePlanRisks(
  courses: (Course & { _virtual?: boolean })[],
  preferOffDay?: string,
  missingMustHaves: string[] = [],
): string[] {
  const risks: string[] = [];

  // 1. Off-day preference violation — courses that landed on the requested 공강일
  if (preferOffDay) {
    const offDay = preferOffDay.replace("요일", "").trim();
    const violated = courses.filter(
      (c) => c.day && !c._virtual && (c.day.match(/[월화수목금]/g) ?? []).includes(offDay),
    );
    if (violated.length > 0) {
      risks.push(`${offDay}공강 실패 — ${violated.map((c) => c.name).join(", ")} 배치됨`);
    }
  }

  // 2. Consecutive class pairs (연강) — same day, no gap between slots
  type DaySlot = { start: number; end: number };
  const dayMap = new Map<string, DaySlot[]>();
  for (const c of courses) {
    const days  = parseDays(c.day ?? "");
    const start = toMinutes(c.time);
    if (start === null) continue;
    for (const day of days) {
      const slots = dayMap.get(day) ?? [];
      slots.push({ start, end: start + PERIOD_MINS });
      dayMap.set(day, slots);
    }
  }
  let consecutivePairs = 0;
  for (const [, slots] of dayMap) {
    const sorted = [...slots].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start === sorted[i - 1].end) consecutivePairs++;
    }
  }
  if (consecutivePairs >= 3) {
    risks.push(`연강 ${consecutivePairs}쌍 발생 — 집중력 저하 주의`);
  } else if (consecutivePairs > 0) {
    risks.push(`연강 ${consecutivePairs}쌍 발생`);
  }

  // 3. Missing must-have courses (blocked by timetable conflict)
  for (const name of missingMustHaves) {
    risks.push(`필수과목 "${name}" 시간충돌 — 수동 확인 필요`);
  }

  return risks;
}

// ─── Pool Size Helper (for O(n + m²) complexity display) ─────────────────────

/**
 * Returns the total available course pool size for a given year/semester.
 * Used to compute the actual m in O(n + m²) complexity display.
 */
export function getActualPoolSize(year: number, semester?: 1 | 2): number {
  const core  = getCoreCoursesForYear(year, semester) as Course[];
  const elect = getElectiveCoursesForYear(year, semester) as Course[];
  return core.length + elect.length;
}

// ─── Pipeline Complexity Analyzer ────────────────────────────────────────────

export interface PipelineComplexity {
  /** Big-O notation for the full pipeline worst case */
  formula: string;
  /** Number of images / PDF pages (n) */
  n: number;
  /** Estimated course pool size (m) */
  m: number;
  /** Abstract worst-case operation count */
  worstCaseOps: number;
  /** Estimated wall-clock time in seconds */
  estSeconds: number;
  /** Human-readable per-stage breakdown */
  breakdown: string[];
}

/**
 * Compute worst-case time complexity and estimated wall-clock seconds
 * for the full SmartStudy pipeline.
 *
 * Pipeline stages:
 *  1. Vision OCR (Groq)       — O(n)      batched by 5, ~3.5s/batch
 *  2. Curriculum dedup        — O(m log m)
 *  3. buildConstraintAwarePlan × 4 variants:
 *       filterByBlockedSlots  — O(m · b) ≈ O(m)
 *       checkTimeConflict     — O(m²)  ← dominates
 *       generateVirtualTimes  — O(m · 36)
 *  4. dedupeCourses + score   — O(m)
 *
 * Worst-case overall: O(n + m²)
 *
 * @param n  number of uploaded images / PDF pages
 * @param m  estimated course pool size (default 42 for KSU SOT 2학년)
 * @param b  blocked time slots from vision (default 0)
 */
export function computePipelineComplexity(
  n: number,
  m = 42,
  b = 0,
): PipelineComplexity {
  const safeN = Math.max(1, n);
  const safeM = Math.max(1, m);

  // ── Operation estimates ──────────────────────────────────────────────────
  const visionOps   = safeN * 800;                          // OCR token budget/image
  const dedupeOps   = Math.round(safeM * Math.log2(safeM)); // O(m log m)
  const filterOps   = safeM * Math.max(b, 1);               // O(m·b)
  const conflictOps = 4 * safeM * safeM;                    // O(4·m²) — 4 variants
  const scoreOps    = safeM;

  const worstCaseOps = visionOps + dedupeOps + filterOps + conflictOps + scoreOps;

  // ── Wall-clock estimation ────────────────────────────────────────────────
  // Vision: Groq API network-bound, ~3.5s per batch of 5
  const visionBatches = Math.ceil(safeN / 5);
  const visionSec     = visionBatches * 3.5;
  // LLM plan generation: baseline 8s (Groq 70B)
  const llmBaseSec    = 8;
  // Local compute: planner runs at ~2×10^7 ops/s on serverless
  const localSec      = (dedupeOps + filterOps + conflictOps + scoreOps) / 2e7;
  const estSeconds    = Math.round((visionSec + llmBaseSec + localSec) * 10) / 10;

  return {
    formula:      "O(n + m²)",
    n:            safeN,
    m:            safeM,
    worstCaseOps: Math.round(worstCaseOps),
    estSeconds,
    breakdown: [
      `Vision OCR  : O(n)    — ${safeN}장 / ${visionBatches}배치 × ~3.5s`,
      `Dedup+Sort  : O(m·log m) — m=${safeM} → ${dedupeOps}ops`,
      `Conflict    : O(m²)   — ${safeM}² × 4variants = ${conflictOps}ops`,
      `LLM Generate: baseline — ~${llmBaseSec}s (Groq)`,
    ],
  };
}

// ─── Course Deduplication ─────────────────────────────────────────────────────

/**
 * 과목 목록에서 중복을 완전히 제거한다.
 * - code가 있는 과목: code 기준 (대소문자 무시)
 * - code가 없는 과목: name 기준 (공백·대소문자 정규화)
 * 앞에 나오는 과목을 우선 유지하고 이후 중복을 제거한다.
 */
export function dedupeCourses(courses: Course[]): Course[] {
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();
  return courses.filter((c) => {
    const code = (c.code ?? "").trim().toLowerCase();
    const name = (c.name ?? "").trim().toLowerCase().replace(/\s+/g, "");
    if (code) {
      if (seenCodes.has(code)) return false;
      seenCodes.add(code);
    }
    if (name) {
      if (seenNames.has(name)) return false;
      seenNames.add(name);
    }
    return true;
  });
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
  // coursePool 자체의 중복을 제거한 뒤 시나리오 생성 (입력 오염 방어)
  const deduped = dedupeCourses(coursePool);

  return SCENARIO_PRESETS.map((cfg) => {
    // 1. Apply rules priority + lock retakes at top
    const ordered = lockRetakesFirst(prioritizeRequired(deduped, rules), retakeCodes);

    // 2. Trim greedily to targetCredits (strict: used + cr <= target)
    let used = 0;
    const picked = ordered.filter((c) => {
      const cr = c.credits ?? 3;
      if (used + cr <= cfg.targetCredits) { used += cr; return true; }
      return false;
    });

    // 3. Inject virtual times for courses missing schedule data
    const withTimes = generateVirtualTimes(picked, cfg.preferOffDay);

    // 4. Final dedup guard — generateVirtualTimes 이후에도 중복 원천 차단
    const finalCourses = dedupeCourses(withTimes);
    const finalCredits = calculateTotalCredits(finalCourses);

    // 5. Annotate
    const conflicts = checkTimeConflict(finalCourses);
    const score     = scorePlan(finalCourses, cfg.preferOffDay);

    return {
      label:        cfg.label,
      strategy:     cfg.strategy,
      courses:      finalCourses,
      totalCredits: finalCredits,
      score,
      conflicts,
    };
  });
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

// ─── Blocked Time Slots — Vision Grid Analysis ────────────────────────────────

/**
 * 에브리타임 이미지에서 추출된 현재 수강 과목 → 차단된 시간 슬롯 변환.
 * AI가 반환한 courses 배열을 구체적인 시간 간격(분 단위)으로 변환한다.
 */
export interface BlockedTimeSlot {
  /** 요일 (한글 단일문자: 월화수목금) */
  day: string;
  /** 시작 시각 (minutes since midnight) */
  startMin: number;
  /** 종료 시각 (minutes since midnight, exclusive) */
  endMin: number;
  /** 슬롯 출처: current_course = 현재 수강 중, preference = 공강 희망 */
  source: "current_course" | "preference";
  /** 해당 시간대 과목명 (current_course인 경우) */
  courseName?: string;
}

/**
 * Vision API 응답에서 endTime 필드를 포함한 확장 과목 타입.
 * 90분 고정 가정 대신 실제 종료 시각을 사용할 수 있다.
 */
type EnrolledCourseWithEnd = Course & { endTime?: string | null };

/**
 * minutes-since-midnight → "HH:MM" 문자열 변환 유틸.
 * [Time-Shield-Scan] 로그 및 UI 표시에 사용.
 */
export function minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * buildBlockedTimeSlots
 * 이미 수강 중인 과목 목록(vision API 결과) → BlockedTimeSlot[] 변환.
 * 각 과목의 요일·시간을 개별 슬롯으로 분리한다.
 * (예: "월수 09:00" → 월 09:00-10:30, 수 09:00-10:30 두 슬롯)
 *
 * endTime 필드가 있으면 고정 90분 대신 실제 종료 시각을 사용 (1분 오차 없음).
 */
export function buildBlockedTimeSlots(enrolledCourses: EnrolledCourseWithEnd[]): BlockedTimeSlot[] {
  const slots: BlockedTimeSlot[] = [];
  for (const course of enrolledCourses) {
    if (!course.day || !course.time) continue;
    const days  = (course.day.match(/[월화수목금]/g) ?? []);
    const start = toMinutes(course.time);
    if (start === null) continue;
    // endTime이 있으면 실제 종료 시각 사용, 없으면 90분(1교시) 기본값
    const end = course.endTime
      ? (toMinutes(course.endTime) ?? start + PERIOD_MINS)
      : start + PERIOD_MINS;
    for (const day of days) {
      slots.push({ day, startMin: start, endMin: end, source: "current_course", courseName: course.name });
    }
  }
  return slots;
}

/**
 * addOffDayPreference
 * 공강 희망 요일을 전일 차단 슬롯으로 추가한다.
 * "금" → 금요일 08:00–22:00 블록 생성.
 */
export function addOffDayPreference(
  slots: BlockedTimeSlot[],
  preferOffDay: string,
): BlockedTimeSlot[] {
  const day = preferOffDay.replace("요일", "").trim();
  if (!ALL_DAYS.includes(day as (typeof ALL_DAYS)[number])) return slots;
  return [
    ...slots,
    { day, startMin: 8 * 60, endMin: 22 * 60, source: "preference" },
  ];
}

/**
 * detectOffDayPreference
 * 에브리타임 이미지에서 수업이 없는 요일을 공강일 후보로 감지.
 * enrolledCourses에서 사용된 요일 집합을 구하고 비어 있는 평일을 반환한다.
 */
export function detectOffDayPreference(enrolledCourses: Course[]): string | null {
  const activeDays = new Set<string>();
  for (const c of enrolledCourses) {
    if (!c.day) continue;
    for (const d of (c.day.match(/[월화수목금]/g) ?? [])) activeDays.add(d);
  }
  for (const day of ALL_DAYS) {
    if (!activeDays.has(day)) return day;
  }
  return null;
}

/**
 * isBlockedSlotConflict
 * 특정 과목이 차단된 시간 슬롯과 겹치는지 검사.
 * 겹침 조건: 같은 요일 AND (aStart < bEnd) AND (bStart < aEnd)
 */
function isBlockedSlotConflict(course: Course, blocked: BlockedTimeSlot[]): boolean {
  if (!course.day || !course.time) return false;
  const days  = (course.day.match(/[월화수목금]/g) ?? []) as string[];
  const start = toMinutes(course.time);
  if (start === null) return false;
  const end = start + PERIOD_MINS;
  for (const slot of blocked) {
    if (days.includes(slot.day) && start < slot.endMin && slot.startMin < end) return true;
  }
  return false;
}

/**
 * filterByBlockedSlots
 * 후보 과목 목록에서 차단된 시간대 또는 공강 희망 요일에 겹치는 과목을 제거한다.
 * day/time 정보가 없는 과목은 통과 (나중에 가상 배정).
 */
export function filterByBlockedSlots(
  candidates: Course[],
  blocked: BlockedTimeSlot[],
  preferOffDay?: string,
): Course[] {
  const offDay = preferOffDay?.replace("요일", "").trim();
  return candidates.filter((c) => {
    if (offDay && c.day && ((c.day.match(/[월화수목금]/g) ?? []) as string[]).includes(offDay)) return false;
    if (blocked.length > 0 && isBlockedSlotConflict(c, blocked)) return false;
    return true;
  });
}

// ─── Constraint-Aware Planner — 메인 스케줄링 알고리즘 ──────────────────────

export type PlanVariant = "stable" | "challenge" | "easy" | "major";

export interface ConstraintPlanInput {
  /** 감지된 학년 (KSU SOT 과목 풀 결정에 사용) */
  year: number;
  /** 감지된 학기 (미감지 시 undefined → 전체 학기 과목 사용) */
  semester?: 1 | 2;
  /** 목표 학점 (예: 21) */
  targetCredits: number;
  /** 에브리타임에서 추출한 차단 시간 슬롯 */
  blockedSlots: BlockedTimeSlot[];
  /** 공강 희망 요일 (예: "금") */
  preferOffDay?: string;
  /** 플랜 변형: stable=부담 최소, challenge=심화, easy=꿀강, major=전공집중 */
  variant?: PlanVariant;
  /** 외부 추가 교양 과목 풀 (AI 생성 또는 PDF 추출) */
  extraCourses?: Course[];
}

/**
 * buildConstraintAwarePlan
 *
 * blockedTimeSlots와 공강 희망 조건을 피해 21학점을 빈틈없이 채우는 알고리즘.
 *
 * 우선순위:
 *   1. KSU SOT 전공필수/전공기초 (isCore=true) — 최우선 고정
 *   2. 융합Cell 인문사회 1과목 (3학점)
 *   3. 융합Cell 예술창작 1과목 (3학점)
 *   4. KSU SOT 전공선택 (variant별 순서 조정)
 *   5. extraCourses (AI/PDF 결과)
 *
 * 각 단계에서 filterByBlockedSlots 적용 → 충돌 없는 과목만 선택.
 */
export function buildConstraintAwarePlan(input: ConstraintPlanInput): { courses: Course[]; riskAnalysis: string[] } {
  const {
    year, semester, targetCredits, blockedSlots,
    preferOffDay, variant = "stable", extraCourses = [],
  } = input;

  // ── Fusion Cell 상수 (공과대학 필수) ──────────────────────────────────────
  const FUSION_HUM: Course[] = [
    { code: "GE-HC101", name: "인문고전읽기와창의적소통",    credits: 3, requirement: "인문사회(융합Cell)", target: "전체", day: "화목", time: "13:30" },
    { code: "GE-WC101", name: "영화로보는서양문화사이야기", credits: 3, requirement: "인문사회(융합Cell)", target: "전체", day: "월수", time: "13:30" },
    { code: "GE-DB101", name: "디지털과비즈니스",            credits: 3, requirement: "인문사회(융합Cell)", target: "전체", day: "화목", time: "15:00" },
  ];
  const FUSION_ART: Course[] = [
    { code: "GE-DC101", name: "디자인커넥션",      credits: 3, requirement: "예술창작(융합Cell)", target: "전체", day: "월수", time: "15:00" },
    { code: "GE-DT101", name: "창의적디자인씽킹", credits: 3, requirement: "예술창작(융합Cell)", target: "전체", day: "화목", time: "10:30" },
  ];

  // ── 슬롯: 공강 희망을 전일 차단으로 추가 ──────────────────────────────────
  const allBlocked = preferOffDay
    ? addOffDayPreference(blockedSlots, preferOffDay)
    : blockedSlots;

  // ── 과목 풀 로드 (KSU SOT) ──────────────────────────────────────────────
  const rawCore   = getCoreCoursesForYear(year, semester) as Course[];
  const rawElect  = getElectiveCoursesForYear(year, semester) as Course[];

  // variant별 전공선택 순서
  const orderedElect = variant === "challenge"
    ? [...rawElect].reverse()          // 심화: 뒤에서부터 (고학년 과목 우선)
    : variant === "easy"
      ? rawElect.filter((c) => !c.isPrerequisite) // 꿀강: 선수과목 없는 것 우선
      : rawElect;                                  // stable/major: 기본 순서

  // ── 충돌 필터 적용 ──────────────────────────────────────────────────────
  let availCore   = filterByBlockedSlots(rawCore,      allBlocked, preferOffDay);
  const availElect  = filterByBlockedSlots(orderedElect, allBlocked, preferOffDay);

  // ── Must-Have 우선 정렬 (Plan A / stable, 2학년) ──────────────────────
  // 전산수학 · 리눅스시스템 · 자료구조 를 최상단으로 끌어올림
  const mustHavesMissingDueToConflict: string[] = [];
  if (variant === "stable" && year === 2) {
    availCore = sortMustHaveFirst(availCore);
    // Track must-haves present in rawCore but blocked by timetable conflict
    for (const name of MUST_HAVE_YEAR2_SEM1_NAMES) {
      const nameTrimmed = name.replace(/\s+/g, "");
      const inRaw   = rawCore.some((c) => (c.name ?? "").replace(/\s+/g, "").includes(nameTrimmed));
      const inAvail = availCore.some((c) => (c.name ?? "").replace(/\s+/g, "").includes(nameTrimmed));
      if (inRaw && !inAvail) mustHavesMissingDueToConflict.push(name);
    }
  }
  const availExtra  = filterByBlockedSlots(extraCourses, allBlocked, preferOffDay);
  const availHum    = filterByBlockedSlots(FUSION_HUM,   allBlocked, preferOffDay);
  const availArt    = filterByBlockedSlots(FUSION_ART,   allBlocked, preferOffDay);

  const plan: Course[] = [];
  let credits = 0;

  // ── 중복 키 추적 세트 (add() 내부에서 O(1) 조회) ─────────────────────────
  const usedCodes = new Set<string>();
  const usedNames = new Set<string>();

  // ── 과목 추가 헬퍼 ───────────────────────────────────────────────────────
  const add = (c: Course): boolean => {
    const cr = c.credits ?? 3;

    // ① 학점 초과 엄격 차단 — 1학점도 초과 불가
    if (credits + cr > targetCredits) return false;

    // ② 중복 검사: null/undefined code 오탐 방지를 위해 비어있지 않을 때만 비교
    const cCode = (c.code ?? "").trim().toLowerCase();
    const cName = (c.name ?? "").trim().toLowerCase().replace(/\s+/g, "");
    if (cCode && usedCodes.has(cCode)) return false;
    if (cName && usedNames.has(cName)) return false;

    // ③ 내부 시간 충돌 검사 — 충돌 시 day/time 제거 후 가상 배정 대상으로 재시도
    const inner = checkTimeConflict([...plan, c]);
    if (inner.length > 0 && c.day && c.time) {
      return add({ ...c, day: undefined, time: undefined });
    }

    // ④ 확정 추가
    plan.push(c);
    credits += cr;
    if (cCode) usedCodes.add(cCode);
    if (cName) usedNames.add(cName);
    return true;
  };

  // ── 1단계: 전공필수/전공기초 ──────────────────────────────────────────────
  for (const c of availCore) add(c);

  // ── 2단계: 융합Cell 인문사회 (1과목) ─────────────────────────────────────
  if (!plan.some((c) => c.requirement?.includes("인문사회(융합Cell)"))) {
    for (const h of availHum) { if (add(h)) break; }
  }

  // ── 3단계: 융합Cell 예술창작 (1과목) ─────────────────────────────────────
  if (!plan.some((c) => c.requirement?.includes("예술창작(융합Cell)"))) {
    for (const a of availArt) { if (add(a)) break; }
  }

  // ── 4단계: 전공선택 ──────────────────────────────────────────────────────
  for (const c of availElect) {
    if (credits >= targetCredits) break;
    add(c);
  }

  // ── 5단계: extraCourses (AI/PDF 결과) ────────────────────────────────────
  for (const c of availExtra) {
    if (credits >= targetCredits) break;
    add(c);
  }

  // ── 6단계: 여전히 부족하면 blocked 무시하고 전공선택 강제 충전 ─────────────
  if (credits < targetCredits) {
    for (const c of rawElect) {
      if (credits >= targetCredits) break;
      add({ ...c, day: undefined, time: undefined }); // 가상 배정 대상으로
    }
  }

  // ── 최종 Clean List: dedup + 학점 상한 이중 방어 ─────────────────────────
  const cleanPlan = dedupeCourses(plan).reduce<{ courses: Course[]; total: number }>(
    (acc, c) => {
      const cr = c.credits ?? 3;
      if (acc.total + cr > targetCredits) return acc; // 초과 과목 제거
      acc.courses.push(c);
      acc.total += cr;
      return acc;
    },
    { courses: [], total: 0 },
  );

  const riskAnalysis = computePlanRisks(
    cleanPlan.courses as (Course & { _virtual?: boolean })[],
    preferOffDay,
    mustHavesMissingDueToConflict,
  );

  console.info(
    `[buildConstraintAwarePlan] year=${year} variant=${variant} ` +
    `blocked=${blockedSlots.length}슬롯 offDay=${preferOffDay ?? "없음"} ` +
    `→ ${cleanPlan.courses.length}과목 ${cleanPlan.total}학점 (목표:${targetCredits})` +
    (riskAnalysis.length ? ` | risks: ${riskAnalysis.join("; ")}` : ""),
  );

  return { courses: cleanPlan.courses, riskAnalysis };
}

/**
 * buildFourConstraintPlans
 * buildConstraintAwarePlan을 4가지 variant로 실행하여
 * Plan A(stable) / B(challenge) / C(easy) / D(major) 반환.
 */
export function buildFourConstraintPlans(
  baseInput: Omit<ConstraintPlanInput, "variant">,
): Record<"planA" | "planB" | "planC" | "planD", { courses: Course[]; riskAnalysis: string[] }> {
  return {
    planA: buildConstraintAwarePlan({ ...baseInput, variant: "stable" }),
    planB: buildConstraintAwarePlan({ ...baseInput, variant: "challenge" }),
    planC: buildConstraintAwarePlan({ ...baseInput, variant: "easy" }),
    planD: buildConstraintAwarePlan({ ...baseInput, variant: "major" }),
  };
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
