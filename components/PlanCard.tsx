// PlanCard — white-theme card + instant CSV download per plan
"use client";

import type { StudyPlan } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  plan: StudyPlan;
  index: number;
}

const PLAN_META = [
  { label: "Plan A", badge: "안정형",   accent: "#3b82f6", glow: "rgba(59,130,246,0.15)"  },
  { label: "Plan B", badge: "전공몰입", accent: "#10b981", glow: "rgba(16,185,129,0.15)"  },
  { label: "Plan C", badge: "공강수호", accent: "#a855f7", glow: "rgba(168,85,247,0.15)"  },
  { label: "Plan D", badge: "도전형",   accent: "#f97316", glow: "rgba(249,115,22,0.15)"  },
];

function reqBadge(req: string): string {
  if (req.includes("공통필수")) return "bg-rose-50 text-rose-700 border border-rose-200";
  if (req.includes("필수"))     return "bg-indigo-50 text-indigo-700 border border-indigo-200";
  return "bg-emerald-50 text-emerald-700 border border-emerald-200";
}

// v2: codes that get a glow highlight (2nd-year critical required)
const CRITICAL_CODES_CARD = new Set(["EO203", "EO209", "EO201", "EO211", "EO212"]);

/**
 * Derive academic year from EO code pattern for card visual treatment.
 * EO1xx → 1, EO2xx → 2, etc.
 */
function deriveCardYear(code?: string, recommendedYear?: number): number | null {
  if (recommendedYear != null) return recommendedYear;
  if (!code) return null;
  const m = code.match(/^EO(\d)/i);
  return m ? parseInt(m[1], 10) : null;
}

function downloadPlan(plan: StudyPlan, label: string) {
  const lines = [
    `# ${label} — ${plan.strategy ?? ""}`,
    "",
    "과목코드,과목명,학점,구분,요일,시간",
    ...(plan.courses ?? []).map((c) =>
      [c.code ?? "", c.name, c.credits ?? "", c.requirement ?? "", c.day ?? "", c.time ?? ""].join(",")
    ),
    "",
    `총 학점: ${plan.totalCredits ?? ""}`,
  ].join("\n");

  const blob = new Blob(["\uFEFF" + lines], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `${label.toLowerCase().replace(" ", "-")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function PlanCard({ plan, index }: Props) {
  const meta  = PLAN_META[index % PLAN_META.length];
  const label = plan.label ?? meta.label;

  return (
    <div className={cn(
      "flex-1 min-w-[272px] rounded-2xl overflow-hidden",
      "bg-white border border-slate-200",
      "shadow-[0_2px_12px_rgba(15,23,42,0.06)]",
      "flex flex-col"
    )}
    style={{ borderTop: `3px solid ${meta.accent}` }}
    >
      <div className="p-5 flex-1 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${meta.accent}12`, color: meta.accent, border: `1px solid ${meta.accent}30` }}>
              {label}
            </span>
            {/* Concept badge */}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${meta.accent}18`, color: meta.accent, border: `1px solid ${meta.accent}40` }}>
              [{meta.badge}]
            </span>
            {plan.totalCredits !== undefined && (
              <span className="text-[11px] text-slate-400 font-mono">{plan.totalCredits}학점</span>
            )}
          </div>
        </div>

        {/* Strategy */}
        {plan.strategy && (
          <p className="text-[12px] text-slate-600 leading-relaxed mb-3 pl-3"
            style={{ borderLeft: `2px solid ${meta.accent}50` }}>
            {plan.strategy}
          </p>
        )}

        {/* Dynamic Risk Analysis */}
        {(plan.riskAnalysis ?? []).length > 0 && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/60">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">⚠ 리스크 분석</p>
            <ul className="space-y-0.5">
              {(plan.riskAnalysis ?? []).map((item, i) => (
                <li key={i} className="text-[11px] text-amber-700 flex items-start gap-1">
                  <span className="shrink-0 mt-px">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Course list */}
        {(plan.courses ?? []).length > 0 && (
          <ul className="space-y-1.5 flex-1">
            {(plan.courses ?? []).map((c, i) => {
              // v2: year-based visual treatment
              const cRec = c as { recommendedYear?: number };
              const courseYear = deriveCardYear(c.code, cRec.recommendedYear);
              const isYear1 = courseYear === 1;
              const isCritical2 = c.code ? CRITICAL_CODES_CARD.has(c.code) : (c.requirement?.includes("필수") && courseYear === 2);

              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-start justify-between gap-2 px-2.5 py-2 rounded-lg transition-all relative",
                    // Year-1: dimmed
                    isYear1
                      ? "bg-slate-50/50 opacity-45 grayscale hover:opacity-70 hover:grayscale-0"
                      : "bg-slate-50 hover:bg-slate-100",
                    // Year-2 critical: glowing indigo ring
                    isCritical2 && [
                      "ring-2 ring-indigo-300/70 dark:ring-indigo-500/60",
                      "shadow-[0_0_8px_rgba(99,102,241,0.30)]",
                      "bg-indigo-50/60 hover:bg-indigo-50",
                    ].join(" "),
                  )}
                  title={
                    isCritical2
                      ? "2학년 졸업 필수 과목 — 미이수 시 3학년 트랙 봉쇄"
                      : isYear1
                      ? "1학년 과목 — 이미 이수했거나 패스 가능"
                      : undefined
                  }
                >
                  {/* Critical-2 glow indicator */}
                  {isCritical2 && (
                    <span className="absolute -top-px -right-px text-[8px] font-bold bg-indigo-500 text-white px-1 py-px rounded-bl-md rounded-tr-lg leading-none">
                      ★필수
                    </span>
                  )}
                  {/* Year-1 dim indicator */}
                  {isYear1 && (
                    <span className="absolute -top-px -right-px text-[8px] text-slate-400 bg-slate-100 px-1 py-px rounded-bl-md rounded-tr-lg leading-none">
                      1학년
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{c.name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {c.code && (
                        <span className="text-[10px] font-mono px-1.5 py-px rounded bg-slate-100 text-slate-500 tracking-wide border border-slate-200">
                          {c.code}
                        </span>
                      )}
                      {c.requirement && (
                        <span className={cn("text-[10px] font-semibold px-1.5 py-px rounded", reqBadge(c.requirement))}>
                          {c.requirement}
                        </span>
                      )}
                      {(c as { isPrerequisite?: boolean }).isPrerequisite && (
                        <span className="text-[9px] px-1 py-px rounded bg-violet-50 text-violet-600 border border-violet-200 font-semibold">
                          선수
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {c.credits !== undefined && (
                      <span className="text-[11px] font-mono font-bold" style={{ color: meta.accent }}>
                        {c.credits}학점
                      </span>
                    )}
                    {c.day && (
                      <span className="text-[10px] text-slate-400 font-mono">{c.day}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {plan.note && (
          <p className="mt-3 text-[11px] text-slate-400 font-mono">{plan.note}</p>
        )}
      </div>

      {/* Download button */}
      <div className="px-5 pb-4">
        <button type="button" onClick={() => downloadPlan(plan, label)}
          className={cn(
            "w-full py-2 rounded-xl text-[12px] font-bold transition-all",
            "border text-center font-mono tracking-wide"
          )}
          style={{
            borderColor: `${meta.accent}30`,
            color: meta.accent,
            background: `${meta.accent}08`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = `${meta.accent}15`;
            (e.currentTarget as HTMLButtonElement).style.boxShadow  = `0 0 10px ${meta.glow}`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = `${meta.accent}08`;
            (e.currentTarget as HTMLButtonElement).style.boxShadow  = "none";
          }}>
          ↓ CSV 다운로드
        </button>
      </div>
    </div>
  );
}
