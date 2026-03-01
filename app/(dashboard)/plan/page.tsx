// /plan page — glassmorphism dark mode, forced black text, Tailwind-based layout
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { StudyPlanResult } from "@/types";
import PlanCard from "@/components/PlanCard";
import YearPlanView from "@/components/YearPlanView";
import { downloadJSON, downloadCSV } from "@/lib/exportUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { getUniversityConfig } from "@/lib/university-kb";

// SSR:false — prevents hydration mismatch from html2canvas + useRef DOM measurements
const TimetableGrid = dynamic(() => import("@/components/TimetableGrid"), {
  ssr: false,
  loading: () => <div className="h-40 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[13px]">시간표 로딩 중...</div>,
});

// ─── Data sanitization (preFormat) ───────────────────────────────────────────
// Replaces null/undefined in AI-returned JSON with type-safe defaults so that
// downstream component accesses never throw on missing fields.

function preFormat(raw: unknown): StudyPlanResult {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const plans = (Array.isArray(data.plans) ? data.plans : []).map((plan: unknown) => {
    const p = (plan && typeof plan === "object" ? plan : {}) as Record<string, unknown>;
    const courses = (Array.isArray(p.courses) ? p.courses : []).map((c: unknown) => {
      const course = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
      return {
        ...course,
        name:        course.name != null ? String(course.name) : "",
        credits:     typeof course.credits === "number" ? course.credits : undefined,
        requirement: course.requirement != null ? String(course.requirement) : undefined,
        day:         course.day  != null ? String(course.day)  : undefined,
        time:        course.time != null ? String(course.time) : undefined,
      };
    });
    return { ...p, label: p.label != null ? String(p.label) : "", courses };
  });

  return { ...data, plans } as StudyPlanResult;
}

// ─── 편람 근거 데이터 footer ───────────────────────────────────────────────────

function CurriculumSourceFooter() {
  const universityId =
    typeof window !== "undefined"
      ? (localStorage.getItem("smartstudy_university") ?? "generic")
      : "generic";
  const config = getUniversityConfig(universityId);

  const requiredCodes = config.courseRules
    .filter((r) => r.action === "require")
    .map((r) => `${r.name}${r.code ? ` (${r.code})` : ""}`)
    .join(" · ");

  return (
    <div className="mt-8 pt-5 border-t border-gray-200/60 dark:border-slate-700/60">
      <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center leading-relaxed">
        <span className="font-semibold text-gray-500 dark:text-gray-400">편람 근거 데이터</span>
        {" "}—{" "}
        {config.name} {config.department}
        {config.year ? ` ${config.year}년도` : ""}
        {config.notes
          ? ` · ${config.notes.split("—")[0].trim()}`
          : ""}
        {requiredCodes && (
          <>{" "}· 필수 이수: <span className="text-indigo-400 dark:text-indigo-400">{requiredCodes}</span></>
        )}
        <span className="ml-2 opacity-60">
          · 졸업 {config.graduation.totalCredits}학점 · 학기 {config.timetable.targetCredits}학점
          {config.timetable.preferOffDay ? ` · ${config.timetable.preferOffDay} 공강` : ""}
        </span>
      </p>
    </div>
  );
}

// ─── Upgrade success banner ───────────────────────────────────────────────────

function UpgradedBanner({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 8000);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white/96 dark:bg-slate-900/96 backdrop-blur-[20px]">
      <span className="text-lg shrink-0">🎉</span>
      <p className="m-0 text-[13px] text-emerald-800 dark:text-emerald-300 flex-1 font-medium">
        <strong>플랜 업그레이드 완료!</strong> 이제 더 많은 AI 수강 계획을 생성할 수 있습니다.
      </p>
      <button
        onClick={onClose}
        className="shrink-0 bg-transparent border-none cursor-pointer text-base text-gray-400 dark:text-gray-500 leading-none p-0.5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PlanPageSkeleton() {
  return (
    <main className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-slate-950 dark:via-indigo-950/70 dark:to-violet-950/60">
      <div className="max-w-[960px] mx-auto">
        <div className="flex justify-between mb-7 gap-4 flex-wrap">
          <div>
            <Skeleton className="h-3 w-16 rounded mb-2" />
            <Skeleton className="h-6 w-32 rounded mb-1.5" />
            <Skeleton className="h-3 w-52 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-5 w-24 rounded mb-3" />
        <div className="flex flex-wrap gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1 min-w-[280px] rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/96 dark:bg-slate-900/96 backdrop-blur-[20px] p-6"
            >
              <div className="flex gap-2 mb-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded" />
              </div>
              <Skeleton className="h-12 w-full rounded-lg mb-3" />
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} className="h-9 w-full rounded-lg mb-1.5" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const [result, setResult] = useState<StudyPlanResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showUpgraded, setShowUpgraded] = useState(false);
  const [planView, setPlanView] = useState<"card" | "timetable">("card");

  useEffect(() => {
    const stored = localStorage.getItem("smartstudy_result");
    if (stored) {
      try {
        // preFormat sanitizes null/undefined fields before they reach renderers
        setResult(preFormat(JSON.parse(stored)));
      } catch {
        setResult(null);
      }
    }

    if (window.location.search.includes("upgraded=1")) {
      setShowUpgraded(true);
      window.history.replaceState({}, "", "/plan");
    }

    setHydrated(true);
  }, []);

  if (!hydrated) return <PlanPageSkeleton />;

  if (!result) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-slate-950 dark:via-indigo-950/70 dark:to-violet-950/60 p-8">
        <p className="text-base text-gray-500 dark:text-gray-400 mb-4">
          아직 생성된 계획이 없습니다.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[14px] font-semibold no-underline shadow-[0_6px_12px_rgba(16,185,129,0.3)] transition-colors"
        >
          계획 생성하러 가기
        </Link>
      </main>
    );
  }

  const hasPlans = (result.plans ?? []).length > 0;

  return (
    <main className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-slate-950 dark:via-indigo-950/70 dark:to-violet-950/60">
      <div className="max-w-[960px] mx-auto">

        {/* Stripe upgrade success */}
        {showUpgraded && <UpgradedBanner onClose={() => setShowUpgraded(false)} />}

        {/* Real AI result indicator — shown when NOT demo */}
        {!result.isDemo && (
          <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-2xl bg-white/96 dark:bg-slate-900/96 backdrop-blur-[20px] border border-emerald-200/60 dark:border-emerald-800/60 shadow-[0_4px_24px_rgba(16,185,129,0.08)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_0_3px_rgba(16,185,129,0.2)] animate-pulse" />
            <p className="m-0 text-[13px] text-gray-600 dark:text-gray-300">
              <strong className="text-emerald-700 dark:text-emerald-400">실시간 AI 분석 완료</strong>{" "}
              — Llama 4 Scout 비전 모델이 업로드된 이미지를 직접 분석하여 생성한 맞춤 계획입니다.
            </p>
          </div>
        )}

        {/* Demo mode — glassmorphism bar (blur 20px, bg-96%) */}
        {result.isDemo && (
          <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-2xl bg-white/96 dark:bg-slate-900/96 backdrop-blur-[20px] border border-white/60 dark:border-slate-700/60 shadow-[0_4px_24px_rgba(15,23,42,0.07)]">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]" />
            <p className="m-0 text-[13px] text-gray-500 dark:text-gray-300">
              <strong className="text-gray-800 dark:text-white">데모 모드</strong> — AI 서버
              점검 중입니다. 잠시 후 다시 시도하면 실제 맞춤 계획을 받을 수 있습니다.
            </p>
          </div>
        )}

        {/* Page header */}
        <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
          <div>
            <Link
              href="/"
              className="text-[13px] text-gray-500 dark:text-gray-400 no-underline hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              ← 돌아가기
            </Link>
            <h1 className="text-2xl font-bold text-black dark:text-white mt-1.5 mb-1">
              수강 계획표
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 m-0">
              AI가 생성한 Plan A~D와 1년 학습 로드맵을 확인하세요.
            </p>
          </div>

          {/* Export buttons */}
          <div className="flex gap-2 shrink-0 items-center">
            <button
              onClick={() => downloadJSON(result, "smartstudy-plan.json")}
              className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-full text-xs font-semibold cursor-pointer border-none transition-colors"
            >
              JSON 다운로드
            </button>
            {hasPlans && (
              <button
                onClick={() => downloadCSV(result, "smartstudy-plan.csv")}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-semibold cursor-pointer border-none shadow-[0_4px_10px_rgba(16,185,129,0.3)] transition-colors"
              >
                CSV 다운로드
              </button>
            )}
          </div>
        </div>

        {/* Plan A~D — card or timetable view */}
        {hasPlans && (
          <section className="mb-2">
            <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
              <h2 className="text-lg font-bold text-black dark:text-white m-0">
                수강 계획 4안
              </h2>
              {/* View toggle */}
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700
                              overflow-hidden text-[12px] font-semibold bg-white dark:bg-slate-900">
                {(["card", "timetable"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setPlanView(v)}
                    className={[
                      "px-3 py-1.5 transition-colors",
                      v === "timetable" && "border-l border-slate-200 dark:border-slate-700",
                      planView === v
                        ? "bg-indigo-600 text-white"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                    ].filter(Boolean).join(" ")}>
                    {v === "card" ? "카드 보기" : "🗓 시간표 보기"}
                  </button>
                ))}
              </div>
            </div>

            {planView === "card" ? (
              <div className="flex flex-wrap gap-4">
                {result.plans!.map((plan, i) => (
                  <PlanCard key={i} plan={plan} index={i} />
                ))}
              </div>
            ) : (
              <TimetableGrid plans={result.plans!} />
            )}
          </section>
        )}

        {/* Year plan */}
        {result.yearPlan && <YearPlanView yearPlan={result.yearPlan} />}

        {/* Raw response fallback */}
        {!hasPlans && !result.yearPlan && result.raw && (
          <div>
            <h2 className="text-base font-bold text-black dark:text-white mb-2.5">
              원본 응답
            </h2>
            <pre className="p-4 bg-slate-900 dark:bg-slate-950 text-gray-200 rounded-xl text-xs overflow-auto whitespace-pre-wrap m-0">
              {result.raw}
            </pre>
          </div>
        )}

        {/* 편람 근거 데이터 */}
        <CurriculumSourceFooter />
      </div>
    </main>
  );
}
