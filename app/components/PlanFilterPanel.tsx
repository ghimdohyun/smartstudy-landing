// PlanFilterPanel.tsx — user customization UI for planner engine preferences
"use client";

import { usePlannerContext } from "@/lib/planner-context";

const DAYS = ["월", "화", "수", "목", "금"] as const;

const PURPOSE_OPTIONS = [
  { value: "",           label: "선택 안함" },
  { value: "graduation", label: "🎓 졸업 요건 충족" },
  { value: "frontend",   label: "💻 FE (프론트엔드)" },
  { value: "backend",    label: "🖥 BE (백엔드)" },
  { value: "ai",         label: "🤖 AI / 데이터" },
] as const;

export default function PlanFilterPanel() {
  const { preferences, setPreferences } = usePlannerContext();

  const offDays = preferences.offDays ?? [];
  const priority = preferences.priority;
  const purpose = preferences.purpose ?? "";

  function toggleOffDay(day: string) {
    setPreferences(prev => {
      const current = prev.offDays ?? [];
      const next = current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day];
      return { ...prev, offDays: next };
    });
  }

  function setPriority(p: "easy" | "hard" | undefined) {
    setPreferences(prev => ({ ...prev, priority: p }));
  }

  function setPurpose(p: string) {
    setPreferences(prev => ({
      ...prev,
      purpose: (p as typeof preferences.purpose) || undefined,
    }));
  }

  return (
    <div className="space-y-4">
      {/* Off-day checkboxes */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          공강 희망 요일
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => {
            const checked = offDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleOffDay(day)}
                className={[
                  "px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all",
                  checked
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-[0_2px_6px_rgba(99,102,241,0.35)]"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500",
                ].join(" ")}
              >
                {day}요일
              </button>
            );
          })}
          {offDays.length > 0 && (
            <button
              type="button"
              onClick={() => setPreferences(prev => ({ ...prev, offDays: [] }))}
              className="px-2.5 py-1.5 rounded-lg text-[11px] text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Priority toggle */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          학습 우선순위
        </p>
        <div className="flex gap-2">
          {(["easy", "hard"] as const).map(p => {
            const active = priority === p;
            const label = p === "easy" ? "⭐ 꿀강 위주" : "💪 전공심화 (빡공)";
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(active ? undefined : p)}
                className={[
                  "flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all",
                  active
                    ? p === "easy"
                      ? "bg-amber-500 text-white border-amber-500 shadow-[0_2px_6px_rgba(245,158,11,0.3)]"
                      : "bg-violet-600 text-white border-violet-600 shadow-[0_2px_6px_rgba(124,58,237,0.3)]"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Purpose select */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          수강 목적
        </p>
        <select
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-[12px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 transition-all"
        >
          {PURPOSE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
