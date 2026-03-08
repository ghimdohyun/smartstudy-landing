"use client";

/**
 * RoadmapSection — 1년 로드맵 + 미이수 위험도 시각화
 * Shows the graduation critical path by academic year/semester.
 * Each course shows its plan status and what it unlocks next year.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import criticalPath from "@/lib/data/critical-path.json";
import academicRules from "@/lib/data/academic-rules.json";

interface CriticalCourse {
  code: string;
  name: string;
  credits: number;
  year: number;
  semester: number;
  required: boolean;
  offeredOnce: boolean;
  riskMessage: string;
  unlocks: string[];
  delayYears: number;
}

interface Props {
  plannedCourseCodes: string[];
  currentYear?: number;
  currentSemester?: number;
}

const YEAR_LABELS = ["1학년", "2학년", "3학년", "4학년"];
const YEAR_COLORS = [
  { tab: "bg-blue-500", glow: "shadow-blue-200 dark:shadow-blue-900" },
  { tab: "bg-indigo-500", glow: "shadow-indigo-200 dark:shadow-indigo-900" },
  { tab: "bg-violet-500", glow: "shadow-violet-200 dark:shadow-violet-900" },
  { tab: "bg-purple-500", glow: "shadow-purple-200 dark:shadow-purple-900" },
];

// Build a name→code lookup from academicRules for matching by name
const nameToCode = new Map<string, string>(
  (academicRules.courses as Array<{ code: string; name: string }>).map(c => [
    c.name.replace(/\s/g, "").toLowerCase(), c.code
  ])
);

function isPlanned(code: string, plannedCourseCodes: string[]): boolean {
  const normCode = code.toLowerCase();
  return plannedCourseCodes.some(p => {
    const pn = p.toLowerCase().replace(/\s/g, "");
    return pn === normCode || pn.includes(normCode);
  });
}

type CourseStatus = "planned" | "missing-required" | "missing-optional";

function getCourseStatus(
  course: CriticalCourse,
  plannedCourseCodes: string[],
  currentYear: number,
  currentSemester: number,
): CourseStatus {
  if (isPlanned(course.code, plannedCourseCodes)) return "planned";
  const isPast =
    course.year < currentYear ||
    (course.year === currentYear && course.semester <= currentSemester);
  if (course.required && isPast) return "missing-required";
  return "missing-optional";
}

function RiskMeter({ missingRequired }: { missingRequired: number }) {
  const level = missingRequired === 0 ? "safe" : missingRequired === 1 ? "warning" : "danger";
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold mt-3",
      level === "safe"    && "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
      level === "warning" && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
      level === "danger"  && "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
    )}>
      <span>
        {level === "safe"    && "✅ 이번 학기 위험 없음"}
        {level === "warning" && `⚠️ ${missingRequired}개 필수 과목 미이수 — 내년 일부 강의 봉쇄`}
        {level === "danger"  && `🚨 ${missingRequired}개 필수 과목 미이수 — 졸업 지연 위험`}
      </span>
    </div>
  );
}

export default function RoadmapSection({ plannedCourseCodes, currentYear = 2, currentSemester = 1 }: Props) {
  const [activeYear, setActiveYear] = useState(Math.max(0, currentYear - 1));
  const courses = criticalPath.criticalCourses as CriticalCourse[];

  const yearIdx = activeYear + 1; // 1-based year
  const s1Courses = courses.filter(c => c.year === yearIdx && c.semester === 1);
  const s2Courses = courses.filter(c => c.year === yearIdx && c.semester === 2);

  const s1Missing = s1Courses.filter(c => getCourseStatus(c, plannedCourseCodes, currentYear, currentSemester) === "missing-required");
  const s2Missing = s2Courses.filter(c => getCourseStatus(c, plannedCourseCodes, currentYear, currentSemester) === "missing-required");

  // Blocked courses next year if missing
  const blockedByS1 = s1Missing.flatMap(c => c.unlocks);
  const blockedByS2 = s2Missing.flatMap(c => c.unlocks);

  function renderCourse(course: CriticalCourse) {
    const status = getCourseStatus(course, plannedCourseCodes, currentYear, currentSemester);
    return (
      <div
        key={course.code}
        className={cn(
          "rounded-xl border p-3 transition-all",
          status === "planned"
            ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
            : status === "missing-required"
            ? "bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-800 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <p className={cn(
              "text-[13px] font-bold truncate m-0",
              status === "planned"          && "text-emerald-800 dark:text-emerald-200",
              status === "missing-required" && "text-red-800 dark:text-red-200",
              status === "missing-optional" && "text-slate-700 dark:text-slate-200",
            )}>
              {course.name}
            </p>
            <p className="text-[10px] font-mono text-slate-400 m-0">{course.code} · {course.credits}학점</p>
          </div>
          <span className={cn(
            "shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap",
            status === "planned"          && "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
            status === "missing-required" && "bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 border-red-200 dark:border-red-700",
            status === "missing-optional" && "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600",
          )}>
            {status === "planned"          && "✓ 이수 예정"}
            {status === "missing-required" && "⚠ 미이수"}
            {status === "missing-optional" && "선택"}
          </span>
        </div>

        {/* Unlocks */}
        {course.unlocks.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className="text-[9px] text-slate-400 dark:text-slate-500">→</span>
            {course.unlocks.map(code => (
              <span key={code} className="text-[9px] px-1 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-mono border border-indigo-100 dark:border-indigo-800">
                {code}
              </span>
            ))}
          </div>
        )}

        {/* Risk message when missing */}
        {status !== "planned" && (
          <p className={cn(
            "text-[10px] leading-relaxed m-0",
            status === "missing-required" ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
          )}>
            {status === "missing-required" && course.offeredOnce && (
              <span className="block font-bold mb-0.5">🔒 연 1회 개설 — 다음 기회: 내년</span>
            )}
            {course.riskMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="mt-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-base font-bold text-black dark:text-white m-0">
          1년 로드맵 — 미이수 위험도 분석
        </h2>
        <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 text-[11px] font-semibold">
          critical path
        </span>
      </div>
      <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-5 -mt-3">
        이번 학기 미이수 과목이 다음 학기·다음 학년에 미치는 연쇄 위험을 시각화합니다.
      </p>

      {/* Year tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {YEAR_LABELS.map((label, i) => {
          const yIdx = i + 1;
          const yCourses = courses.filter(c => c.year === yIdx);
          const yMissing = yCourses.filter(c =>
            getCourseStatus(c, plannedCourseCodes, currentYear, currentSemester) === "missing-required"
          );
          const isActive = i === activeYear;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveYear(i)}
              className={cn(
                "px-4 py-2 rounded-full text-[12px] font-bold border transition-all",
                isActive
                  ? `${YEAR_COLORS[i].tab} text-white border-transparent shadow-lg ${YEAR_COLORS[i].glow}`
                  : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300",
              )}
            >
              {label}
              {yMissing.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 text-[9px]">
                  {yMissing.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Semester columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* 1학기 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              {yearIdx}학년 1학기
            </span>
            {yearIdx === currentYear && currentSemester === 1 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                현재 학기
              </span>
            )}
          </div>
          {s1Courses.length === 0 ? (
            <p className="text-[12px] text-slate-400 dark:text-slate-500 italic">크리티컬 과목 없음</p>
          ) : (
            <div className="flex flex-col gap-2">
              {s1Courses.map(renderCourse)}
            </div>
          )}
          <RiskMeter missingRequired={s1Missing.length} />
          {blockedByS1.length > 0 && (
            <div className="mt-2 px-3 py-2 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-[10px] font-bold text-red-600 dark:text-red-400 m-0 mb-1">봉쇄될 강의 (다음 학기)</p>
              <div className="flex flex-wrap gap-1">
                {blockedByS1.map(code => (
                  <span key={code} className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-700">
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2학기 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              {yearIdx}학년 2학기
            </span>
            {yearIdx === currentYear && currentSemester === 2 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                현재 학기
              </span>
            )}
          </div>
          {s2Courses.length === 0 ? (
            <p className="text-[12px] text-slate-400 dark:text-slate-500 italic">크리티컬 과목 없음</p>
          ) : (
            <div className="flex flex-col gap-2">
              {s2Courses.map(renderCourse)}
            </div>
          )}
          <RiskMeter missingRequired={s2Missing.length} />
          {blockedByS2.length > 0 && (
            <div className="mt-2 px-3 py-2 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-[10px] font-bold text-red-600 dark:text-red-400 m-0 mb-1">봉쇄될 강의 (다음 학기)</p>
              <div className="flex flex-wrap gap-1">
                {blockedByS2.map(code => (
                  <span key={code} className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-700">
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
