// Plan A/B/C/D card — shadcn Card + Badge, dark mode aware
"use client";

import type { StudyPlan } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  plan: StudyPlan;
  index: number;
}

const PLAN_COLORS = [
  { border: "#bfdbfe", accent: "#3b82f6", strategyBg: "#eff6ff", badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", creditBadge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { border: "#bbf7d0", accent: "#10b981", strategyBg: "#f0fdf4", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", creditBadge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  { border: "#e9d5ff", accent: "#a855f7", strategyBg: "#fdf4ff", badge: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300", creditBadge: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  { border: "#fed7aa", accent: "#f97316", strategyBg: "#fff7ed", badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300", creditBadge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
];

function requirementClass(req: string): string {
  if (req.includes("공통필수"))
    return "bg-[#fde8eb] text-[#b5152b] dark:bg-rose-950 dark:text-rose-300";
  if (req.includes("필수"))
    return "bg-[#eef2ff] text-[#4338ca] dark:bg-indigo-950 dark:text-indigo-300";
  return "bg-[#f0fdf4] text-[#166534] dark:bg-emerald-950 dark:text-emerald-300";
}

export default function PlanCard({ plan, index }: Props) {
  const color = PLAN_COLORS[index % PLAN_COLORS.length];

  return (
    <Card
      className="flex-1 min-w-[280px] overflow-hidden rounded-2xl"
      style={{ borderTop: `4px solid ${color.accent}` }}
    >
      <CardContent className="p-6">
        {/* Plan label + credits */}
        <div className="flex items-center mb-3 gap-2.5">
          <Badge
            variant="secondary"
            className={cn("rounded-full text-xs font-bold px-3", color.badge)}
          >
            {plan.label ?? `Plan ${String.fromCharCode(65 + index)}`}
          </Badge>
          {plan.totalCredits !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              총 {plan.totalCredits}학점
            </span>
          )}
        </div>

        {/* Strategy */}
        {plan.strategy && (
          <p
            className="text-[13px] text-gray-700 dark:text-gray-300 mb-3 px-3 py-2 rounded-lg"
            style={{
              background: color.strategyBg,
              borderLeft: `3px solid ${color.accent}`,
            }}
          >
            {plan.strategy}
          </p>
        )}

        {/* Course list */}
        {(plan.courses ?? []).length > 0 && (
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
            {(plan.courses ?? []).map((course, i) => (
              <li
                key={i}
                className="text-[13px] px-2.5 py-1.5 bg-gray-50 dark:bg-neutral-800 rounded-lg flex justify-between items-center"
              >
                {/* Left: name + badges */}
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {course.name}
                  </span>
                  {(course.code ?? course.requirement) && (
                    <div className="flex gap-1 flex-wrap">
                      {course.code && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded font-mono tracking-wide">
                          {course.code}
                        </span>
                      )}
                      {course.requirement && (
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                            requirementClass(course.requirement)
                          )}
                        >
                          {course.requirement}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: credits + day */}
                <div className="flex gap-1.5 items-center shrink-0 ml-2">
                  {course.credits !== undefined && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "rounded-full text-xs font-bold px-2 py-0",
                        color.creditBadge
                      )}
                    >
                      {course.credits}학점
                    </Badge>
                  )}
                  {course.day && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {course.day}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Note */}
        {plan.note && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2.5">
            {plan.note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
