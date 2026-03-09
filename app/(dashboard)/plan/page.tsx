// /plan page — glassmorphism dark mode, forced black text, Tailwind-based layout
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { StudyPlanResult } from "@/types";
import PlanCard from "@/components/PlanCard";
import YearPlanView from "@/components/YearPlanView";
import { downloadJSON, downloadCSV, downloadAllPdf } from "@/lib/exportUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { getUniversityConfig } from "@/lib/university-kb";
import { StudyPlanResultSchema } from "@/lib/validations/study-plan-result";
import { RESULT_DATA_VERSION } from "@/hooks/useStudyPlan";
import { detectGraduationRisk, parseStudentGrade } from "@/lib/graduation-risk";
import GraduationRiskBanner from "@/components/GraduationRiskBanner";
import { generateAllPlans, generateAllPlansWithPreferences, generateFallbackPlan, type EngineResult, type FallbackResult } from "@/lib/planner-engine";
import RoadmapSection from "@/components/RoadmapSection";
import { PlannerProvider, usePlannerContext } from "@/lib/planner-context";
import UniversalUploader, { type PdfKnowledge } from "@/components/upload/UniversalUploader";

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

// ─── Engine Plan Section ──────────────────────────────────────────────────────

const ENGINE_ACCENT = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

function EnginePlanSection({
  enginePlans,
  activeIdx,
  setActiveIdx,
  view,
  setView,
  activePlan,
}: {
  enginePlans: EngineResult[];
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  view: "card" | "timetable";
  setView: (v: "card" | "timetable") => void;
  activePlan: EngineResult;
}) {
  return (
    <>
      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {enginePlans.map((ep, i) => {
          const accent = ENGINE_ACCENT[i % ENGINE_ACCENT.length];
          const isActive = i === activeIdx;
          return (
            <button
              key={ep.planId}
              type="button"
              onClick={() => setActiveIdx(i)}
              className="px-5 py-2.5 text-[13px] font-bold whitespace-nowrap transition-all rounded-t-lg border-b-2 -mb-px"
              style={isActive
                ? { color: accent, borderColor: accent, background: `${accent}08` }
                : { color: "#94a3b8", borderColor: "transparent" }
              }
            >
              {ep.emoji} {ep.label}
              <span className="ml-1.5 text-[11px] font-normal opacity-60">{ep.totalCredits}학점</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between py-3 flex-wrap gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="m-0 text-[13px] font-semibold text-black dark:text-white">{activePlan.description}</p>
          <p className="m-0 text-[11px] text-gray-500 dark:text-gray-400">
            평균 평점 {activePlan.avgRating}점 ·
            공강일: {activePlan.freeDays.length > 0 ? activePlan.freeDays.join("·") + "요일" : "없음"}
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-[12px] font-semibold bg-white dark:bg-slate-900">
          {(["timetable", "card"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={[
                "px-3 py-1.5 transition-colors",
                v === "card" && "border-l border-slate-200 dark:border-slate-700",
                view === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              ].filter(Boolean).join(" ")}>
              {v === "timetable" ? "🗓 시간표" : "카드"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {view === "timetable" ? (
        <TimetableGrid
          plans={[{ label: activePlan.label, courses: activePlan.courses, totalCredits: activePlan.totalCredits }]}
          colorOffset={activeIdx}
        />
      ) : (
        <div className="rounded-2xl border border-white/60 dark:border-slate-700/60 bg-white/96 dark:bg-slate-900/96 backdrop-blur-[20px] p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {activePlan.courses.map((c: import("@/types").Course) => (
              <div key={c.id ?? c.name} className="flex flex-col gap-0.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 min-w-[140px]">
                <span className="text-[13px] font-semibold text-black dark:text-white truncate max-w-[200px]">{c.name}</span>
                {c.professor && <span className="text-[11px] text-gray-500 dark:text-gray-400">{c.professor}</span>}
                <div className="flex gap-2 mt-0.5 flex-wrap">
                  {c.credits !== undefined && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">{c.credits}학점</span>
                  )}
                  {c.day && c.time && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{c.day} {c.time}</span>
                  )}
                  {c.rating !== undefined && c.rating > 0 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">★{c.rating}</span>
                  )}
                </div>
                {c.requirement && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{c.requirement}</span>
                )}
              </div>
            ))}
          </div>
          <p className="m-0 text-[12px] text-gray-500 dark:text-gray-400 border-t border-slate-200 dark:border-slate-700 pt-3">
            총 {activePlan.totalCredits}학점 · 평균 평점 {activePlan.avgRating} · 점수 {activePlan.score}
          </p>
        </div>
      )}
    </>
  );
}

// ─── Fallback swap banner ─────────────────────────────────────────────────────

function FallbackSwapBanner({ fallback }: { fallback: FallbackResult }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-3 px-4 py-3 mb-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 backdrop-blur-[12px]">
      <span className="text-lg shrink-0 mt-0.5">🔀</span>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-[12px] font-bold text-amber-800 dark:text-amber-300 mb-0.5">
          대체 순위 알고리즘 적용
        </p>
        <p className="m-0 text-[11px] text-amber-700 dark:text-amber-400">
          {fallback.fallbackReason}
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 p-0.5 transition-colors" aria-label="닫기">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

// ─── Planner settings panel (uploader + preferences) ─────────────────────────

function PlannerSettingsPanel({ onRegenerate }: { onRegenerate: () => void }) {
  const { setPdfKnowledge, setPreferences, preferences, hasPdf } = usePlannerContext();
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-[12px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
            ⚙️ 플랜 설정 — PDF 편람 / 희망 조건
          </span>
          {hasPdf && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
              PDF 로드됨
            </span>
          )}
        </div>
        <svg className={["w-4 h-4 text-slate-400 transition-transform", open ? "rotate-180" : ""].join(" ")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-200 dark:border-slate-700 pt-4">
          {/* Uploader */}
          <div>
            <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wider">
              파일 업로드
            </p>
            <UniversalUploader
              onPdfLoaded={(k: PdfKnowledge) => {
                setPdfKnowledge(k);
                // Auto-boost mandatoryChainScore when PDF is loaded
                setPreferences(prev => ({ ...prev, mandatoryChainScore: 60 }));
              }}
            />
          </div>

          {/* Preferences */}
          <div>
            <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300 mb-3 uppercase tracking-wider">
              희망/기피 조건
            </p>
            <div className="flex flex-wrap gap-3">
              {/* Early morning toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(preferences.penaltyEarlyMorning ?? 0) < 0}
                  onChange={e => setPreferences(prev => ({
                    ...prev,
                    penaltyEarlyMorning: e.target.checked ? -25 : 0,
                  }))}
                  className="w-3.5 h-3.5 rounded accent-indigo-500"
                />
                <span className="text-[12px] text-slate-600 dark:text-slate-300">🌅 1교시 기피</span>
              </label>

              {/* Preferred professor input */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-slate-600 dark:text-slate-300 shrink-0">👨‍🏫 선호 교수:</span>
                <input
                  type="text"
                  placeholder="교수명 입력"
                  defaultValue={(preferences.bonusPreferredProfs ?? []).join(",")}
                  onBlur={e => {
                    const names = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                    setPreferences(prev => ({ ...prev, bonusPreferredProfs: names }));
                  }}
                  className="px-2 py-1 text-[12px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-36 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Re-generate button */}
          <button
            type="button"
            onClick={() => { setOpen(false); onRegenerate(); }}
            className="w-full py-2.5 rounded-xl text-[13px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-[0_4px_10px_rgba(99,102,241,0.3)]"
          >
            조건 적용 후 플랜 재생성
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page (inner, consumes context) ──────────────────────────────────────────

function PlanPageInner() {
  // ── Context (PDF knowledge + preferences) ─────────────────────────────────
  const { preferences, pdfKnowledge } = usePlannerContext();

  const [result, setResult] = useState<StudyPlanResult | null>(null);
  // mounted=false → server renders only <PlanPageSkeleton />, zero hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [showUpgraded, setShowUpgraded] = useState(false);
  const [planView, setPlanView] = useState<"card" | "timetable">("card");
  /** 0-based index of the currently active Plan tab (A=0 B=1 C=2 D=3) */
  const [activePlanIdx, setActivePlanIdx] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState("");
  /** Ref for the capturable plan content area (card + timetable) */
  const planContentRef = useRef<HTMLDivElement>(null);
  /** Ref for the roadmap section (for full-page PDF export) */
  const roadmapRef = useRef<HTMLDivElement>(null);
  /** Engine-generated plans from everytime-raw.json (kyungsung-sw only) */
  const [enginePlans, setEnginePlans] = useState<EngineResult[]>([]);
  const [activeEngineIdx, setActiveEngineIdx] = useState(0);
  const [engineView, setEngineView] = useState<"card" | "timetable">("timetable");
  /** Fallback plan from alternate-rank algorithm */
  const [fallbackPlan, setFallbackPlan] = useState<FallbackResult | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("smartstudy_result");
    if (stored) {
      try {
        const raw = JSON.parse(stored) as Record<string, unknown>;

        // ── Stale data guard ────────────────────────────────────────────────
        // If _v field is missing or doesn't match the current version, the
        // data was written by an older API structure. Clear it silently —
        // the user will see the "go generate" screen instead of a crash.
        if (raw._v !== RESULT_DATA_VERSION) {
          localStorage.removeItem("smartstudy_result");
          // Also clear old-format PDF cache entries (ss_pdf_*)
          Object.keys(localStorage)
            .filter((k) => k.startsWith("ss_pdf_"))
            .forEach((k) => localStorage.removeItem(k));
          setResult(null);
          setMounted(true);
          return;
        }

        // 1) preFormat (null→default)  2) Zod schema validation
        const parsed = StudyPlanResultSchema.safeParse(preFormat(raw));
        setResult(parsed.success ? (parsed.data as StudyPlanResult) : null);
      } catch {
        localStorage.removeItem("smartstudy_result");
        setResult(null);
      }
    }

    // Read studentInfo for grade/semester parsing (set by useStudyPlan on generate)
    const storedInput = localStorage.getItem("smartstudy_last_input");
    if (storedInput) {
      try {
        const inp = JSON.parse(storedInput) as Record<string, unknown>;
        if (inp?.studentInfo) setStudentInfo(String(inp.studentInfo));
      } catch { /* ignore */ }
    }

    if (window.location.search.includes("upgraded=1")) {
      setShowUpgraded(true);
      window.history.replaceState({}, "", "/plan");
    }

    // Generate engine plans for kyungsung-sw preset
    const uid = localStorage.getItem("smartstudy_university") ?? "generic";
    if (uid === "kyungsung-sw") {
      try {
        setEnginePlans(generateAllPlans());
        // Generate alternate-rank fallback plan
        const fb = generateFallbackPlan();
        setFallbackPlan(fb);
      } catch { /* ignore — engine is best-effort */ }
    }

    setMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-generate engine plans when preferences change ──────────────────────
  function regenerateWithPreferences() {
    try {
      setEnginePlans(generateAllPlansWithPreferences(preferences));
      const fb = generateFallbackPlan(preferences);
      setFallbackPlan(fb);
    } catch { /* ignore */ }
  }

  // Hard-navigate to home and clear plan state so the main page starts fresh
  const handleHomeNav = useCallback(() => {
    try {
      localStorage.removeItem("smartstudy_result");
      localStorage.removeItem("smartstudy_last_input");
    } catch { /* ignore */ }
    window.location.href = "/";
  }, []);

  // Compute student grade early (needed for both engine-only and full result views)
  const { year: studentYear, semester: studentSemester } = parseStudentGrade(studentInfo);

  // Server send only skeleton — full content renders after client mount
  if (!mounted) return <PlanPageSkeleton />;

  if (!result) {
    // If engine plans available (kyungsung-sw), show them directly
    if (enginePlans.length > 0) {
      const ep = enginePlans[activeEngineIdx] ?? enginePlans[0];
      return (
        <main className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-slate-950 dark:via-indigo-950/70 dark:to-violet-950/60">
          <div className="max-w-[960px] mx-auto">
            <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
              <div>
                <button
                  type="button"
                  onClick={handleHomeNav}
                  className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400 no-underline hover:text-gray-700 dark:hover:text-gray-200 transition-colors bg-transparent border-none cursor-pointer p-0"
                >
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300">DH</span>
                  <span className="font-semibold">Dream Helixion</span>
                  <span className="opacity-50">← 메인으로</span>
                </button>
                <h1 className="text-2xl font-bold text-black dark:text-white mt-1.5 mb-1">수강신청 플랜 (에브리타임 기반)</h1>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 m-0">에브리타임 강의평가 데이터로 자동 생성된 Plan A~D</p>
              </div>
              <Link href="/" className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[13px] font-semibold no-underline shadow-[0_4px_10px_rgba(16,185,129,0.3)] transition-colors self-center">
                AI 플랜 생성하기
              </Link>
            </div>
            <EnginePlanSection
              enginePlans={enginePlans}
              activeIdx={activeEngineIdx}
              setActiveIdx={setActiveEngineIdx}
              view={engineView}
              setView={setEngineView}
              activePlan={ep}
            />
            <RoadmapSection
              plannedCourseCodes={(ep.courses ?? []).map(c => c.code ?? c.name).filter(Boolean) as string[]}
              currentYear={studentYear}
              currentSemester={studentSemester}
            />
          </div>
        </main>
      );
    }
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
  const plans    = result.plans ?? [];

  // Graduation risk — only run for kyungsung-sw preset
  const universityId =
    typeof window !== "undefined"
      ? (localStorage.getItem("smartstudy_university") ?? "generic")
      : "generic";
  const graduationRisk =
    universityId === "kyungsung-sw" && hasPlans
      ? detectGraduationRisk(plans, studentYear, studentSemester)
      : null;
  const activePlan = plans[activePlanIdx] ?? plans[0];

  const PLAN_META = [
    { accent: "#3b82f6" },
    { accent: "#10b981" },
    { accent: "#a855f7" },
    { accent: "#f97316" },
  ];

  const handlePdfDownload = async () => {
    if (pdfLoading) return;
    const elements: HTMLElement[] = [];
    if (planContentRef.current) elements.push(planContentRef.current);
    if (roadmapRef.current) elements.push(roadmapRef.current);
    if (elements.length === 0) return;
    setPdfLoading(true);
    try {
      const label = activePlan?.label ?? `Plan ${String.fromCharCode(65 + activePlanIdx)}`;
      await downloadAllPdf(
        elements,
        `smartstudy-${label.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      );
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-slate-950 dark:via-indigo-950/70 dark:to-violet-950/60">
      {/* 경성대 수강신청 플로팅 버튼 */}
      <a
        href="https://sugang.ks.ac.kr"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full
                   bg-gradient-to-br from-indigo-600 to-violet-600
                   text-white text-[13px] font-bold no-underline
                   shadow-[0_4px_20px_rgba(99,102,241,0.45)]
                   hover:shadow-[0_6px_28px_rgba(99,102,241,0.6)] hover:scale-105
                   transition-all duration-200"
        title="경성대학교 수강신청 시스템"
      >
        <span className="text-base leading-none">🎓</span>
        경성대 수강신청 바로가기
      </a>

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
            <button
              type="button"
              onClick={handleHomeNav}
              className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400 no-underline hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-1 bg-transparent border-none cursor-pointer p-0"
            >
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300">DH</span>
              <span className="font-semibold">Dream Helixion</span>
              <span className="opacity-50">← 메인으로</span>
            </button>
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

        {/* ── Planner settings (PDF upload + preferences) ───────────── */}
        {universityId === "kyungsung-sw" && (
          <PlannerSettingsPanel onRegenerate={regenerateWithPreferences} />
        )}

        {/* Graduation risk banner — dynamic PDF diff when pdfKnowledge is set */}
        {graduationRisk && graduationRisk.severity !== "safe" && (
          <GraduationRiskBanner
            risk={graduationRisk}
            pdfExtractedCourses={pdfKnowledge?.graduationRequired}
            plannedCourseCodes={plans.flatMap(p => (p.courses ?? []).map(c => c.code ?? c.name))}
          />
        )}

        {/* Plan A~D — tabbed single-plan view */}
        {hasPlans && (
          <section className="mb-2">

            {/* ── Plan tabs ─────────────────────────────────────────────── */}
            <div className="flex gap-0 mb-0 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
              {plans.map((plan, i) => {
                const accent = PLAN_META[i % PLAN_META.length].accent;
                const isActive = i === activePlanIdx;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setActivePlanIdx(i); setPlanView("card"); }}
                    className="px-5 py-2.5 text-[13px] font-bold whitespace-nowrap transition-all rounded-t-lg border-b-2 -mb-px"
                    style={isActive
                      ? { color: accent, borderColor: accent, background: `${accent}08` }
                      : { color: "#94a3b8", borderColor: "transparent" }
                    }
                  >
                    {plan.label ?? `Plan ${String.fromCharCode(65 + i)}`}
                    {plan.totalCredits !== undefined && (
                      <span className="ml-1.5 text-[11px] font-normal opacity-60">{plan.totalCredits}학점</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Toolbar: view toggle + PDF export ─────────────────────── */}
            <div className="flex items-center justify-between py-3 flex-wrap gap-2">
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

              <button
                type="button"
                onClick={handlePdfDownload}
                disabled={pdfLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold transition-all
                           bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700
                           text-slate-600 dark:text-slate-300
                           hover:bg-slate-50 dark:hover:bg-slate-800
                           disabled:opacity-50 disabled:cursor-not-allowed
                           shadow-[0_1px_4px_rgba(15,23,42,0.06)]"
              >
                {pdfLoading ? "생성 중..." : "📄 PDF 다운로드"}
              </button>
            </div>

            {/* ── Active plan content (capturable via ref) ───────────────── */}
            <div ref={planContentRef}>
              {planView === "card" ? (
                activePlan && <PlanCard plan={activePlan} index={activePlanIdx} />
              ) : (
                activePlan && (
                  <TimetableGrid
                    plans={[activePlan]}
                    colorOffset={activePlanIdx}
                  />
                )
              )}
            </div>
          </section>
        )}

        {/* Year plan (AI 생성) */}
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

        {/* Engine plans section (everytime-based, kyungsung-sw only) */}
        {enginePlans.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base font-bold text-black dark:text-white">에브리타임 기반 수강신청 플랜</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">자동생성</span>
            </div>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-4">
              에브리타임 강의평가 데이터 + academic-rules.json 기반 백트래킹 엔진이 자동 생성
            </p>

            {/* Fallback plan toggle */}
            {fallbackPlan && (
              <div className="mb-4">
                <FallbackSwapBanner fallback={fallbackPlan} />
                <label className="flex items-center gap-2 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={showFallback}
                    onChange={e => setShowFallback(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-amber-500"
                  />
                  <span className="text-[12px] text-slate-600 dark:text-slate-300">
                    대체 플랜 보기 (경쟁률 위험 과목 자동 교체)
                  </span>
                </label>
              </div>
            )}

            <EnginePlanSection
              enginePlans={showFallback && fallbackPlan
                ? [fallbackPlan as EngineResult, ...enginePlans.slice(1)]
                : enginePlans}
              activeIdx={activeEngineIdx}
              setActiveIdx={setActiveEngineIdx}
              view={engineView}
              setView={setEngineView}
              activePlan={showFallback && fallbackPlan
                ? (activeEngineIdx === 0 ? (fallbackPlan as EngineResult) : enginePlans[activeEngineIdx])
                : (enginePlans[activeEngineIdx] ?? enginePlans[0])}
            />
          </section>
        )}

        {/* ── 1년 로드맵 + 위험도 ───────────────────────────────────── */}
        {universityId === "kyungsung-sw" && (
          <div ref={roadmapRef}>
            <RoadmapSection
              plannedCourseCodes={[
                // 현재 선택된 AI 플랜 과목만 반영 (전체 합산 X)
                ...((activePlan?.courses ?? []).map(c => c.code ?? c.name)),
                // 엔진 플랜에서도 현재 선택 탭 과목만 반영
                ...((enginePlans[activeEngineIdx]?.courses ?? []).map(c => c.code ?? c.name)),
              ].filter(Boolean) as string[]}
              currentYear={studentYear}
              currentSemester={studentSemester}
            />
          </div>
        )}

        {/* 편람 근거 데이터 */}
        <CurriculumSourceFooter />
      </div>
    </main>
  );
}

// ─── Page (outer — wraps with PlannerProvider) ────────────────────────────────

export default function PlanPage() {
  return (
    <PlannerProvider>
      <PlanPageInner />
    </PlannerProvider>
  );
}
