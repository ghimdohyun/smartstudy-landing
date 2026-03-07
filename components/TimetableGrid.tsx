// TimetableGrid — weekly colour-block visualisation of Plan A~D courses
// v2: per-plan tab selector + retake course highlighting + score badge
// Parses course.day (e.g., "월,수,금" or "화목") and course.time (e.g., "3교시", "09:00").
// Displays colour blocks per column with a time axis (1~9교시) on the left.
// Courses without schedule → virtual time injection via generateVirtualTimes().
// PNG download via html2canvas.
"use client";

import { useRef, useState } from "react";
import type { StudyPlan } from "@/types";
import { cn } from "@/lib/utils";
import { generateVirtualTimes } from "@/lib/planner-logic";

const DAYS = ["월", "화", "수", "목", "금"] as const;
type Day = (typeof DAYS)[number];

// 1교시~9교시 with times
const PERIODS = [
  { label: "1교시", time: "09:00" },
  { label: "2교시", time: "10:00" },
  { label: "3교시", time: "11:00" },
  { label: "4교시", time: "12:00" },
  { label: "5교시", time: "13:00" },
  { label: "6교시", time: "14:00" },
  { label: "7교시", time: "15:00" },
  { label: "8교시", time: "16:00" },
  { label: "9교시", time: "17:00" },
] as const;

const PLAN_COLORS: { bg: string; text: string; border: string; label: string }[] = [
  { bg: "bg-blue-100  dark:bg-blue-900/40",   text: "text-blue-800  dark:text-blue-200",   border: "border-blue-200  dark:border-blue-700",   label: "Plan A" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-200", border: "border-emerald-200 dark:border-emerald-700", label: "Plan B" },
  { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-800 dark:text-purple-200", border: "border-purple-200 dark:border-purple-700", label: "Plan C" },
  { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-800 dark:text-orange-200", border: "border-orange-200 dark:border-orange-700", label: "Plan D" },
];

/**
 * Safe parser — accepts unknown input (non-string, null, undefined, broken chars).
 * Wraps all logic in try-catch; returns [] on any failure.
 * Handles "월,수,금", "월수금", "화목", comma/·/slash/whitespace delimiters.
 */
function safeParseDay(raw?: unknown): Day[] {
  try {
    if (raw == null) return [];
    const str = String(raw).trim();
    if (!str) return [];
    const normalized = str.replace(/[,、·/\s]+/g, ",");
    const tokens = normalized.split(",").map((t) => t.trim()).filter(Boolean);
    return tokens.filter((t): t is Day => (DAYS as readonly string[]).includes(t));
  } catch {
    return [];
  }
}

/**
 * Safe parser — accepts unknown input for period/time fields.
 * Returns 0-based 교시 index (0=1교시…8=9교시), or null if unparseable.
 * Handles "3교시", "09:00", "9:00".
 */
function safeParseTime(raw?: unknown): number | null {
  try {
    if (raw == null) return null;
    const str = String(raw).trim();
    if (!str) return null;
    const koMatch = str.match(/(\d+)교시/);
    if (koMatch) {
      const n = parseInt(koMatch[1], 10);
      if (n >= 1 && n <= 9) return n - 1;
    }
    const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1], 10);
      if (hour >= 9 && hour <= 17) return hour - 9;
    }
    return null;
  } catch {
    return null;
  }
}

interface CourseBlock {
  planIdx: number;
  name: string;
  credits?: number;
  req?: string;
  periodIdx: number | null; // null = no time info, stack from top
  virtual?: boolean;        // true = synthetic time assigned by generateVirtualTimes
  retake?: boolean;         // true = 재수강 — highlighted with rose left-border
}

interface Props {
  plans: StudyPlan[];
}

export default function TimetableGrid({ plans }: Props) {
  const gridRef    = useRef<HTMLDivElement>(null);
  // -1 = "전체 비교" overlay; 0~3 = individual plan tab
  const [activePlan, setActivePlan] = useState<number>(0);

  const safePlans    = plans ?? [];
  const displayPlans = activePlan === -1 ? safePlans : safePlans.slice(activePlan, activePlan + 1);
  const activePlanObj = safePlans[activePlan] as (StudyPlan & { score?: number }) | undefined;
  const planScore = activePlanObj?.score;

  function buildGrid(source: StudyPlan[]): Record<Day, CourseBlock[]> {
    const g: Record<Day, CourseBlock[]> = { 월: [], 화: [], 수: [], 목: [], 금: [] };
    source.forEach((plan, pi) => {
      const rawCourses = plan?.courses ?? [];
      const augmented  = generateVirtualTimes(rawCourses, "금");
      augmented.forEach((c) => {
        const isVirtual = (c as { _virtual?: boolean })._virtual === true;
        const isRetake  = !!(c as { retake?: boolean }).retake ||
                          (typeof c.note === "string" && c.note.includes("재수강"));
        const days = safeParseDay(c?.day);
        if (days.length === 0) return;
        const periodIdx = safeParseTime(c?.time);
        days.forEach((d) => {
          g[d].push({
            planIdx:  activePlan === -1 ? pi : activePlan,
            name:     c?.name ?? "과목명 없음",
            credits:  c?.credits,
            req:      c?.requirement,
            periodIdx,
            virtual:  isVirtual,
            retake:   isRetake,
          });
        });
      });
    });
    for (const day of DAYS) {
      g[day].sort((a, b) => {
        if (a.periodIdx !== null && b.periodIdx !== null) return a.periodIdx - b.periodIdx;
        if (a.periodIdx !== null) return -1;
        if (b.periodIdx !== null) return 1;
        return 0;
      });
    }
    return g;
  }

  const grid       = buildGrid(displayPlans);
  const hasAnyData = Object.values(grid).some((col) => col.length > 0);

  const downloadPng = async () => {
    if (!gridRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(gridRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const link = document.createElement("a");
    link.download = `timetable-${activePlan === -1 ? "all" : (activePlanObj?.label ?? `plan${activePlan + 1}`)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="mt-2">
      {/* ── Plan tab selector ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {safePlans.map((plan, i) => {
          const c      = PLAN_COLORS[i % PLAN_COLORS.length];
          const active = activePlan === i;
          return (
            <button key={i} type="button" onClick={() => setActivePlan(i)}
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all",
                active
                  ? cn(c.bg, c.text, c.border, "shadow-[0_2px_8px_rgba(0,0,0,0.1)]")
                  : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
              )}>
              <span className={cn("w-2 h-2 rounded-full shrink-0")}
                style={{ background: active ? "currentColor" : undefined }} />
              {plan?.label ?? c.label}
              {plan?.totalCredits !== undefined && (
                <span className="opacity-70 font-normal">{plan.totalCredits}학점</span>
              )}
              {active && planScore !== undefined && (
                <span className="ml-1 opacity-60 font-normal">· {planScore}점</span>
              )}
            </button>
          );
        })}
        <button type="button" onClick={() => setActivePlan(-1)}
          className={cn(
            "text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all",
            activePlan === -1
              ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200"
              : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300",
          )}>
          전체 비교
        </button>
      </div>

      {hasAnyData ? (
        <>
          <div ref={gridRef}
            className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700
                        bg-white dark:bg-slate-900 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
            <table className="w-full border-collapse table-fixed" style={{ minWidth: 560 }}>
              <colgroup>
                <col style={{ width: 72 }} />
                {DAYS.map((d) => <col key={d} />)}
              </colgroup>
              <thead>
                <tr>
                  <th className="py-2.5 px-1.5 text-[11px] font-bold text-center text-slate-400 dark:text-slate-400
                                  border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                      style={{ width: 72, minWidth: 72 }}>
                    교시
                  </th>
                  {DAYS.map((d) => (
                    <th key={d} className="py-2.5 px-2 text-[12px] font-bold text-center
                                            text-slate-600 dark:text-slate-200
                                            border-b border-slate-200 dark:border-slate-700
                                            bg-slate-50 dark:bg-slate-800/50">
                      {d}요일
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period, pIdx) => (
                  <tr key={pIdx} className="align-top border-b border-slate-50 dark:border-slate-800/60 last:border-b-0">
                    <td className="px-1.5 py-1.5 text-center border-r border-slate-100 dark:border-slate-800
                                   bg-slate-50/60 dark:bg-slate-800/30"
                        style={{ width: 72, minWidth: 72 }}>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 leading-tight whitespace-nowrap">
                          {period.label}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">{period.time}</span>
                      </div>
                    </td>
                    {DAYS.map((d) => {
                      const explicit    = grid[d].filter((b) => b.periodIdx === pIdx);
                      const unscheduled = grid[d].filter((b) => b.periodIdx === null);
                      const implicit    = unscheduled[pIdx] ? [unscheduled[pIdx]] : [];
                      const items       = explicit.length > 0 ? explicit : implicit;
                      return (
                        <td key={d} className="px-1 py-1 border-r border-slate-100 dark:border-slate-800 last:border-r-0"
                            style={{ height: 52 }}>
                          {items.map((item, j) => {
                            const c = PLAN_COLORS[item.planIdx % PLAN_COLORS.length];
                            return (
                              <div key={j} className={cn(
                                "rounded-lg px-2 py-1 border text-[10px] leading-snug h-full flex flex-col justify-center relative",
                                c.bg, c.text, c.border,
                                item.virtual && "opacity-60 border-dashed",
                                item.retake  && "border-l-[3px] border-l-rose-500 dark:border-l-rose-400",
                              )}>
                                {item.retake && (
                                  <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-rose-500 dark:text-rose-400 leading-none">
                                    재수강
                                  </span>
                                )}
                                <p className="m-0 font-semibold truncate">
                                  {item.name}
                                  {item.virtual && <span className="ml-1 font-normal opacity-60">(가상)</span>}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {item.credits !== undefined && <span className="opacity-70">{item.credits}학점</span>}
                                  {item.req && <span className="opacity-60 text-[9px]">· {item.req}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-2.5">
            <button type="button" onClick={downloadPng}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 dark:border-slate-700
                         bg-white dark:bg-slate-900 text-[12px] font-semibold text-slate-600 dark:text-slate-300
                         hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white
                         shadow-[0_1px_4px_rgba(15,23,42,0.06)] transition-all">
              <span>🖼</span> PNG 다운로드
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600
                        bg-slate-50 dark:bg-slate-900/40 py-10 text-center">
          <p className="text-[13px] text-slate-400 dark:text-slate-500 m-0">
            수강 계획 데이터가 없습니다. Plan A~D를 먼저 생성하세요.
          </p>
        </div>
      )}

      {hasAnyData && (
        <div className="flex flex-wrap gap-4 justify-end mt-2">
          {displayPlans.some((p) => (p?.courses ?? []).some((c) => !c?.day || !c?.time)) && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 m-0">
              (가상) 표시 과목은 AI가 요일/시간을 제공하지 않아 최적 배치로 자동 생성되었습니다.
            </p>
          )}
          <p className="text-[11px] text-rose-400 dark:text-rose-500 m-0">
            ● 재수강 과목은 모든 플랜에서 최우선 배치됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
