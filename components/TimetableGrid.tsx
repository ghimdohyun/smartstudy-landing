// TimetableGrid — weekly colour-block visualisation of Plan A~D courses
// Parses course.day (e.g., "월,수,금" or "화목") and displays colour blocks per column.
// Falls back to an empty-slot badge when day data is absent.
"use client";

import type { StudyPlan } from "@/types";
import { cn } from "@/lib/utils";

const DAYS = ["월", "화", "수", "목", "금"] as const;
type Day = (typeof DAYS)[number];

const PLAN_COLORS: { bg: string; text: string; border: string; label: string }[] = [
  { bg: "bg-blue-100  dark:bg-blue-900/40",   text: "text-blue-800  dark:text-blue-200",   border: "border-blue-200  dark:border-blue-700",   label: "Plan A" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-200", border: "border-emerald-200 dark:border-emerald-700", label: "Plan B" },
  { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-800 dark:text-purple-200", border: "border-purple-200 dark:border-purple-700", label: "Plan C" },
  { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-800 dark:text-orange-200", border: "border-orange-200 dark:border-orange-700", label: "Plan D" },
];

/** Parse "월,수,금" or "월수금" or "화목" → ["월","수","금"] */
function parseDays(raw: string | undefined): Day[] {
  if (!raw) return [];
  // comma-separated or concatenated day names
  const normalized = raw.replace(/[,、·/\s]+/g, ",");
  const tokens = normalized.split(",").map((t) => t.trim());
  return tokens.filter((t): t is Day => (DAYS as readonly string[]).includes(t));
}

interface Props {
  plans: StudyPlan[];
}

export default function TimetableGrid({ plans }: Props) {
  // Build grid: day → array of { planIndex, courseName, credits }
  const grid: Record<Day, { planIdx: number; name: string; credits?: number; req?: string }[]> = {
    월: [], 화: [], 수: [], 목: [], 금: [],
  };

  plans.forEach((plan, pi) => {
    (plan.courses ?? []).forEach((c) => {
      const days = parseDays(c.day);
      if (days.length === 0) return;
      days.forEach((d) => {
        grid[d].push({ planIdx: pi, name: c.name, credits: c.credits, req: c.requirement });
      });
    });
  });

  const hasAnyData = Object.values(grid).some((col) => col.length > 0);

  return (
    <div className="mt-2">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {plans.map((plan, i) => {
          const c = PLAN_COLORS[i % PLAN_COLORS.length];
          return (
            <span key={i} className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
              c.bg, c.text, c.border,
            )}>
              <span className="w-2 h-2 rounded-full"
                style={{ background: "currentColor" }} />
              {plan.label ?? c.label}
              {plan.totalCredits !== undefined && (
                <span className="opacity-70 font-normal">{plan.totalCredits}학점</span>
              )}
            </span>
          );
        })}
      </div>

      {hasAnyData ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700
                        bg-white dark:bg-slate-900 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
          <table className="w-full border-collapse min-w-[420px]">
            <thead>
              <tr>
                {DAYS.map((d) => (
                  <th key={d} className="py-2.5 px-2 text-[12px] font-bold text-center
                                         text-slate-500 dark:text-slate-400
                                         border-b border-slate-200 dark:border-slate-700
                                         bg-slate-50 dark:bg-slate-800/50 w-1/5">
                    {d}요일
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="align-top">
                {DAYS.map((d) => (
                  <td key={d} className="px-1.5 py-1.5 border-r border-slate-100 dark:border-slate-800
                                         last:border-r-0 min-h-[120px] align-top">
                    <div className="flex flex-col gap-1 min-h-[80px]">
                      {grid[d].length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                        </div>
                      ) : (
                        grid[d].map((item, j) => {
                          const c = PLAN_COLORS[item.planIdx % PLAN_COLORS.length];
                          return (
                            <div key={j} className={cn(
                              "rounded-lg px-2 py-1.5 border text-[11px] leading-snug",
                              c.bg, c.text, c.border,
                            )}>
                              <p className="m-0 font-semibold truncate">{item.name}</p>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {item.credits !== undefined && (
                                  <span className="opacity-70">{item.credits}학점</span>
                                )}
                                {item.req && (
                                  <span className="opacity-60 text-[10px]">· {item.req}</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600
                        bg-slate-50 dark:bg-slate-900/40 py-10 text-center">
          <p className="text-[13px] text-slate-400 dark:text-slate-500 m-0">
            AI가 요일/시간 정보를 포함한 경우에만 시간표 그리드가 표시됩니다.
          </p>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1 m-0">
            학생 정보에 선호 요일을 명시하면 더 정확한 결과를 얻을 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
