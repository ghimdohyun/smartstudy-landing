// RoadmapSection — 4년 졸업 로드맵. academic-rules.json 기반.
// plannedCourseCodes 와 실시간 연동 — 이수 완료 / 계획 중 / 미이수 상태 표시.
"use client";

import { useMemo } from "react";
import academicRules from "@/lib/data/academic-rules.json";
import { cn } from "@/lib/utils";

interface AcademicCourse {
  code: string;
  name: string;
  credits: number;
  category: string;
  year: number | null;
  semesters: number[];
  required: boolean;
  offeredOnce: boolean;
  prerequisites?: string[];
  note?: string;
}

interface Props {
  /** Course codes/names from all AI plans + engine plans — determines "계획됨" state */
  plannedCourseCodes: string[];
  /** Current student academic year (1~4). Highlights the current year row. */
  currentYear: number;
  /** Current semester (1 or 2). Used to distinguish "이번학기" */
  currentSemester: number;
}

type CourseStatus = "planned" | "current" | "future" | "past";

const STATUS_STYLE: Record<CourseStatus, string> = {
  past:    "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300",
  planned: "bg-indigo-50 border-indigo-300 text-indigo-800 dark:bg-indigo-900/40 dark:border-indigo-600 dark:text-indigo-300",
  current: "bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-300",
  future:  "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400",
};

const STATUS_LABEL: Record<CourseStatus, string> = {
  past:    "이수 완료",
  planned: "계획됨",
  current: "이번 학기",
  future:  "예정",
};

const STATUS_DOT: Record<CourseStatus, string> = {
  past:    "bg-emerald-500",
  planned: "bg-indigo-500",
  current: "bg-amber-400",
  future:  "bg-slate-300 dark:bg-slate-600",
};

export default function RoadmapSection({ plannedCourseCodes, currentYear, currentSemester }: Props) {
  const planned = useMemo(() => new Set(plannedCourseCodes.map(c => c.trim())), [plannedCourseCodes]);

  const courses = academicRules.courses as AcademicCourse[];

  // Group by year then semester
  const byYear = useMemo(() => {
    const map = new Map<number, Map<number, AcademicCourse[]>>();
    for (const c of courses) {
      if (c.year === null) continue; // general education without year
      const semMap = map.get(c.year) ?? new Map<number, AcademicCourse[]>();
      for (const sem of c.semesters) {
        const list = semMap.get(sem) ?? [];
        list.push(c);
        semMap.set(sem, list);
      }
      map.set(c.year, semMap);
    }
    return map;
  }, [courses]);

  function getStatus(course: AcademicCourse, year: number, sem: number): CourseStatus {
    const isPlanned = planned.has(course.code) || planned.has(course.name);
    // Determine if this semester is in the past, current, or future
    const isPast = year < currentYear || (year === currentYear && sem < currentSemester);
    const isCurrent = year === currentYear && sem === currentSemester;

    if (isPlanned && isCurrent) return "planned"; // being planned this semester
    if (isPlanned) return isPast ? "past" : "planned";
    if (isCurrent) return "current";
    if (isPast) return "future"; // past but not planned = missed/unknown
    return "future";
  }

  const years = [1, 2, 3, 4];
  const semesters = [1, 2];

  // Count planned credits
  const plannedCredits = useMemo(() => {
    return courses
      .filter(c => planned.has(c.code) || planned.has(c.name))
      .reduce((sum, c) => sum + c.credits, 0);
  }, [courses, planned]);

  const totalRequired = academicRules.graduationCredits;

  return (
    <section className="mt-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-black dark:text-white">4년 졸업 로드맵</span>
          <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 text-[11px] font-semibold">
            경성대 소프트웨어학과
          </span>
        </div>
        <div className="text-[12px] text-gray-500 dark:text-gray-400 font-mono">
          계획 학점:{" "}
          <span className={cn("font-bold", plannedCredits >= totalRequired ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400")}>
            {plannedCredits}
          </span>
          {" "}/ {totalRequired}학점
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-5">
        {(Object.keys(STATUS_LABEL) as CourseStatus[]).map(s => (
          <span key={s} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[s])} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {/* Grid: year rows */}
      <div className="space-y-6">
        {years.map(year => {
          const semMap = byYear.get(year);
          if (!semMap) return null;
          const isCurrentYear = year === currentYear;

          return (
            <div key={year} className={cn(
              "rounded-2xl border overflow-hidden",
              isCurrentYear
                ? "border-indigo-300 dark:border-indigo-700 shadow-[0_0_0_2px_rgba(99,102,241,0.12)]"
                : "border-slate-200 dark:border-slate-700",
            )}>
              {/* Year header */}
              <div className={cn(
                "px-4 py-2.5 flex items-center gap-2 border-b",
                isCurrentYear
                  ? "bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-700"
                  : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
              )}>
                <span className={cn(
                  "text-[13px] font-bold",
                  isCurrentYear ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-200",
                )}>
                  {year}학년
                </span>
                {isCurrentYear && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">
                    현재
                  </span>
                )}
              </div>

              {/* Semesters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {semesters.map(sem => {
                  const list = semMap.get(sem) ?? [];
                  const isCurrentSem = isCurrentYear && sem === currentSemester;

                  return (
                    <div key={sem} className="p-4">
                      <p className={cn(
                        "text-[11px] font-bold uppercase tracking-wider mb-2.5",
                        isCurrentSem
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-400 dark:text-slate-500",
                      )}>
                        {sem}학기{isCurrentSem ? " · 이번 학기" : ""}
                      </p>
                      {list.length === 0 ? (
                        <p className="text-[11px] text-slate-300 dark:text-slate-600 italic">과목 없음</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {list.map(course => {
                            const status = getStatus(course, year, sem);
                            return (
                              <div
                                key={course.code}
                                title={course.note ?? ""}
                                className={cn(
                                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all",
                                  STATUS_STYLE[status],
                                )}
                              >
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[status])} />
                                <span className="truncate max-w-[140px]">{course.name}</span>
                                {course.required && (
                                  <span className="text-[9px] opacity-60 shrink-0">필수</span>
                                )}
                                {course.offeredOnce && status === "future" && (
                                  <span className="text-[9px] opacity-60 shrink-0">🔒1회</span>
                                )}
                                <span className="opacity-50 text-[9px] font-mono shrink-0">{course.credits}학점</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* General education note */}
      <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 text-center">
        교양 필수(자기관리·디지털·소통 역량) 및 일반 선택 교양은 위 로드맵에서 제외됩니다.
        졸업 요건 총 {totalRequired}학점 중 전공 {academicRules.majorCredits}학점 이상 필요.
      </p>
    </section>
  );
}
