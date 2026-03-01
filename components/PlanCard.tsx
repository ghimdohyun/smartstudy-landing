// PlanCard — Manus-style dark card + instant download per plan
"use client";

import type { StudyPlan } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  plan: StudyPlan;
  index: number;
}

const PLAN_META = [
  { label: "Plan A", accent: "#3b82f6", glow: "rgba(59,130,246,0.3)"  },
  { label: "Plan B", accent: "#10b981", glow: "rgba(16,185,129,0.3)"  },
  { label: "Plan C", accent: "#a855f7", glow: "rgba(168,85,247,0.3)"  },
  { label: "Plan D", accent: "#f97316", glow: "rgba(249,115,22,0.3)"  },
];

function reqBadge(req: string): string {
  if (req.includes("공통필수")) return "bg-rose-900/50 text-rose-300";
  if (req.includes("필수"))     return "bg-indigo-900/50 text-indigo-300";
  return "bg-emerald-900/50 text-emerald-300";
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
      "bg-gradient-to-b from-slate-900 to-slate-950",
      "border border-slate-800",
      "shadow-[0_4px_24px_rgba(0,0,0,0.5)]",
      "flex flex-col"
    )}
    style={{ borderTop: `3px solid ${meta.accent}` }}
    >
      <div className="p-5 flex-1 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${meta.accent}20`, color: meta.accent, border: `1px solid ${meta.accent}40` }}>
              {label}
            </span>
            {plan.totalCredits !== undefined && (
              <span className="text-[11px] text-slate-500 font-mono">{plan.totalCredits}학점</span>
            )}
          </div>
        </div>

        {/* Strategy */}
        {plan.strategy && (
          <p className="text-[12px] text-slate-400 leading-relaxed mb-3 pl-3"
            style={{ borderLeft: `2px solid ${meta.accent}60` }}>
            {plan.strategy}
          </p>
        )}

        {/* Course list */}
        {(plan.courses ?? []).length > 0 && (
          <ul className="space-y-1.5 flex-1">
            {(plan.courses ?? []).map((c, i) => (
              <li key={i} className="flex items-start justify-between gap-2 px-2.5 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800/80 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-100 truncate">{c.name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {c.code && (
                      <span className="text-[10px] font-mono px-1.5 py-px rounded bg-slate-700/80 text-slate-400 tracking-wide">
                        {c.code}
                      </span>
                    )}
                    {c.requirement && (
                      <span className={cn("text-[10px] font-semibold px-1.5 py-px rounded", reqBadge(c.requirement))}>
                        {c.requirement}
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
                    <span className="text-[10px] text-slate-600 font-mono">{c.day}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {plan.note && (
          <p className="mt-3 text-[11px] text-slate-600 font-mono">{plan.note}</p>
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
            borderColor: `${meta.accent}40`,
            color: meta.accent,
            background: `${meta.accent}0d`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = `${meta.accent}20`;
            (e.currentTarget as HTMLButtonElement).style.boxShadow  = `0 0 12px ${meta.glow}`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = `${meta.accent}0d`;
            (e.currentTarget as HTMLButtonElement).style.boxShadow  = "none";
          }}>
          ↓ CSV 다운로드
        </button>
      </div>
    </div>
  );
}
