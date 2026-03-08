// Year plan view — shadcn Tabs for semester switcher, dark mode aware
"use client";

import type { YearPlan, MonthlyGoal, SemesterDetail } from "@/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Props {
  yearPlan: YearPlan;
}

const SEMESTER_ACCENTS = ["#3b82f6", "#10b981", "#a855f7", "#f97316"];
const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function MonthTimeline({ monthlyGoals }: { monthlyGoals: MonthlyGoal[] }) {
  if (monthlyGoals.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
        월별 목표
      </p>
      <div className="flex flex-col gap-1.5">
        {monthlyGoals.map((mg) => (
          <div key={mg.month} className="flex gap-2.5 items-start">
            {/* Month dot */}
            <span className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">
              {MONTH_NAMES[(mg.month - 1) % 12]}
            </span>
            {/* Goal + tasks */}
            <div className="flex-1 min-w-0 pt-1">
              {mg.goal && (
                <p className="m-0 text-xs text-gray-900 dark:text-gray-100 font-medium">
                  {mg.goal}
                </p>
              )}
              {(mg.tasks ?? []).length > 0 && (
                <ul className="mt-0.5 mb-0 pl-3.5 text-[11px] text-gray-500 dark:text-gray-400">
                  {(mg.tasks ?? []).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_VALUES = ["semester-0", "semester-1"];
const TAB_LABELS = ["1학기 (봄)", "2학기 (가을)"];

export default function YearPlanView({ yearPlan }: Props) {
  const semesters = (yearPlan.semesters ?? []) as SemesterDetail[];

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 mt-0">
        1년 학습 로드맵
        {yearPlan.year && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 font-normal">
            {yearPlan.year}
          </span>
        )}
      </h2>

      {semesters.length > 0 && (
        <Tabs defaultValue={TAB_VALUES[0]}>
          {semesters.length > 1 && (
            <TabsList className="mb-4 rounded-[14px] bg-slate-100 dark:bg-neutral-800 p-1">
              {TAB_LABELS.slice(0, semesters.length).map((label, i) => (
                <TabsTrigger
                  key={i}
                  value={TAB_VALUES[i]}
                  className="rounded-xl text-[13px] data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:shadow-sm"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {semesters.map((sem, i) => {
            const accent = SEMESTER_ACCENTS[i % SEMESTER_ACCENTS.length];
            return (
              <TabsContent key={i} value={TAB_VALUES[i]} className="mt-0">
                <div
                  className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.05),0_12px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
                  style={{ borderTop: `4px solid ${accent}` }}
                >
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0 mb-2.5">
                    {sem.semester ?? `${i + 1}학기`}
                  </h3>

                  {sem.goal && (
                    <p
                      className="text-sm text-gray-700 dark:text-gray-300 mb-3.5 px-3.5 py-2.5 rounded-xl"
                      style={{
                        background: `${accent}12`,
                        borderLeft: `3px solid ${accent}`,
                      }}
                    >
                      {sem.goal}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-5">
                    {/* Recommended courses */}
                    {(sem.recommendedCourses ?? []).length > 0 && (
                      <div className="flex-1 min-w-[160px]">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                          추천 과목
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(sem.recommendedCourses ?? []).map((c, j) => (
                            <span
                              key={j}
                              className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-full font-medium"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Milestones */}
                    {(sem.milestones ?? []).length > 0 && (
                      <div className="flex-1 min-w-[160px]">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                          마일스톤
                        </p>
                        <ul className="m-0 pl-4 text-[13px] text-gray-700 dark:text-gray-300 leading-[1.8]">
                          {(sem.milestones ?? []).map((m, j) => (
                            <li key={j}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {sem.weeklyRoutine && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-3.5">
                      주간 루틴: {sem.weeklyRoutine}
                    </p>
                  )}

                  {(sem.monthlyGoals ?? []).length > 0 && (
                    <MonthTimeline monthlyGoals={sem.monthlyGoals!} />
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Risks */}
      {(yearPlan.risks ?? []).length > 0 && (
        <div className="mt-4 p-3.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-900">
          <p className="text-[13px] font-semibold text-orange-700 dark:text-orange-400 mb-1.5">
            리스크 대응
          </p>
          <ul className="m-0 pl-4 text-xs text-gray-700 dark:text-gray-300">
            {(yearPlan.risks ?? []).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {yearPlan.note && (
        <p className={cn("text-xs text-gray-500 dark:text-gray-400 mt-3")}>
          {yearPlan.note}
        </p>
      )}
    </div>
  );
}
