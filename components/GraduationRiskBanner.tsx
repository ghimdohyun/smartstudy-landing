"use client";

// GraduationRiskBanner — 졸업 지연 위기 경고 UI
// Displays a high-impact red alert when required annual courses are missing.
// v2: optional pdfExtractedCourses prop enables real-time PDF diff display.

import { useState, useMemo } from "react";
import type { GraduationRisk } from "@/lib/graduation-risk";
import academicRules from "@/lib/data/academic-rules.json";

// ─── PDF Diff Types ───────────────────────────────────────────────────────────

interface PdfDiffEntry {
  code: string;
  name: string;
  offeredOnce: boolean;
  inPdf: boolean;    // true if PDF mentions this course
  inPlan: boolean;   // true if current plan includes this course
}

/** Compare PDF-extracted course list against academic-rules required courses. */
function buildPdfDiff(
  pdfCourses: string[],
  plannedCourseCodes: string[],
): PdfDiffEntry[] {
  const pdfNorm = pdfCourses.map(s => s.toLowerCase().replace(/\s/g, ""));
  const planNorm = plannedCourseCodes.map(s => s.toLowerCase());

  return (academicRules.courses as Array<{
    code: string; name: string; required: boolean; offeredOnce: boolean;
  }>)
    .filter(c => c.required)
    .map(c => {
      const codeL = c.code.toLowerCase();
      const nameL = c.name.toLowerCase().replace(/\s/g, "");
      const inPdf = pdfNorm.some(p => p.includes(codeL) || p.includes(nameL));
      const inPlan = planNorm.some(p => p.includes(codeL));
      return { code: c.code, name: c.name, offeredOnce: c.offeredOnce, inPdf, inPlan };
    });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  risk: GraduationRisk;
  /**
   * Codes/names extracted from the uploaded PDF curriculum guide.
   * When provided, a "PDF 편람 대조" diff section is rendered below the
   * standard risk summary, showing which required courses are confirmed in
   * the PDF vs. which are missing from the current plan.
   */
  pdfExtractedCourses?: string[];
  /** Codes of courses currently included in any of the four plans. */
  plannedCourseCodes?: string[];
}

export default function GraduationRiskBanner({ risk, pdfExtractedCourses, plannedCourseCodes }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [diffExpanded, setDiffExpanded] = useState(false);

  // Build PDF diff only when pdfExtractedCourses is provided
  const pdfDiff = useMemo<PdfDiffEntry[] | null>(() => {
    if (!pdfExtractedCourses || pdfExtractedCourses.length === 0) return null;
    return buildPdfDiff(pdfExtractedCourses, plannedCourseCodes ?? []);
  }, [pdfExtractedCourses, plannedCourseCodes]);

  const pdfMissing = pdfDiff?.filter(d => !d.inPlan) ?? [];
  const pdfCovered = pdfDiff?.filter(d => d.inPlan) ?? [];

  if (risk.severity === "safe" || dismissed) return null;

  const isDanger = risk.severity === "danger";

  return (
    <div
      className={[
        "relative mb-6 rounded-2xl overflow-hidden border-2",
        "backdrop-blur-[20px] shadow-2xl",
        isDanger
          ? "border-red-500/70 bg-red-950/90 dark:bg-red-950/95"
          : "border-amber-500/70 bg-amber-950/90 dark:bg-amber-950/95",
      ].join(" ")}
      role="alert"
      aria-live="assertive"
    >
      {/* Pulsing glow border */}
      <div
        className={[
          "absolute inset-0 rounded-2xl pointer-events-none",
          isDanger
            ? "shadow-[inset_0_0_40px_rgba(239,68,68,0.18)] animate-pulse"
            : "shadow-[inset_0_0_40px_rgba(245,158,11,0.15)]",
        ].join(" ")}
        aria-hidden="true"
      />

      {/* Top stripe */}
      <div
        className={[
          "w-full h-1.5",
          isDanger
            ? "bg-gradient-to-r from-red-600 via-rose-400 to-red-600"
            : "bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600",
        ].join(" ")}
      />

      <div className="px-5 py-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={[
              "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-2xl mt-0.5",
              isDanger ? "bg-red-500/20" : "bg-amber-500/20",
            ].join(" ")}
          >
            {isDanger ? "🚨" : "⚠️"}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span
                className={[
                  "text-xs font-bold px-2 py-0.5 rounded-full tracking-wider",
                  isDanger
                    ? "bg-red-500/30 text-red-300"
                    : "bg-amber-500/30 text-amber-300",
                ].join(" ")}
              >
                {isDanger ? "위기 감지" : "경고"}
              </span>
              {risk.extraYears > 0 && (
                <span className="text-xs text-white/60">
                  예상 지연 +{risk.extraYears}년
                </span>
              )}
            </div>

            <h3
              className={[
                "text-xl font-black leading-tight mb-1",
                isDanger ? "text-red-200" : "text-amber-200",
              ].join(" ")}
            >
              {risk.headline}
            </h3>

            <p className="text-sm text-white/70 leading-relaxed mb-0">
              현재 계획에서{" "}
              <strong className={isDanger ? "text-red-300" : "text-amber-300"}>
                {risk.missedCourses.length}개 필수 과목
              </strong>
              이 누락되었습니다.
              {isDanger &&
                " 연 1회 개설 과목 누락 시 재이수 기회가 1년 후로 밀립니다."}
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
            aria-label="경고 닫기"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Missed courses quick list */}
        <div className="mt-3 flex flex-wrap gap-2">
          {risk.missedCourses.map((course) => (
            <span
              key={course.code}
              className={[
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                course.offeredOnce
                  ? isDanger
                    ? "bg-red-500/20 border-red-500/40 text-red-200"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-200"
                  : "bg-white/10 border-white/20 text-white/70",
              ].join(" ")}
            >
              {course.offeredOnce && (
                <span title="연 1회 개설" className="opacity-80">
                  🔒
                </span>
              )}
              {course.name}
              <span className="opacity-60 text-[10px]">({course.code})</span>
            </span>
          ))}
        </div>

        {/* Expandable detail */}
        <div className="mt-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1"
          >
            <svg
              className={[
                "w-3.5 h-3.5 transition-transform",
                expanded ? "rotate-180" : "",
              ].join(" ")}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
            {expanded ? "접기" : "영향 상세 보기"}
          </button>

          {expanded && (
            <ul className="mt-2 space-y-1.5 pl-1">
              {risk.details.map((detail, i) => (
                <li
                  key={i}
                  className="text-[12px] text-white/60 leading-relaxed flex gap-2"
                >
                  <span
                    className={isDanger ? "text-red-400" : "text-amber-400"}
                  >
                    •
                  </span>
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── PDF 편람 실시간 Diff ──────────────────────────────── */}
        {pdfDiff && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
            <button
              onClick={() => setDiffExpanded(v => !v)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70 uppercase tracking-wider">
                  PDF 편람 대조
                </span>
                <span className="text-xs text-white/60">
                  필수 {pdfCovered.length}/{pdfDiff.length} 이수 확인
                  {pdfMissing.length > 0 && (
                    <span className={isDanger ? "text-red-300 ml-1 font-bold" : "text-amber-300 ml-1 font-bold"}>
                      · {pdfMissing.length}개 미확인
                    </span>
                  )}
                </span>
              </div>
              <svg
                className={["w-3.5 h-3.5 text-white/40 transition-transform", diffExpanded ? "rotate-180" : ""].join(" ")}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {diffExpanded && (
              <div className="px-4 pb-4 pt-1 space-y-1.5">
                {/* Missing from plan */}
                {pdfMissing.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5">
                      계획 미포함 — 즉시 추가 필요
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pdfMissing.map(d => (
                        <span
                          key={d.code}
                          className={[
                            "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border",
                            d.offeredOnce
                              ? "bg-red-500/20 border-red-500/40 text-red-200"
                              : "bg-amber-500/20 border-amber-500/40 text-amber-200",
                          ].join(" ")}
                        >
                          {d.offeredOnce && <span title="연 1회">🔒</span>}
                          {d.name}
                          <span className="opacity-50 text-[9px]">({d.code})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Covered in plan */}
                {pdfCovered.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5">
                      계획 포함 확인
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pdfCovered.map(d => (
                        <span
                          key={d.code}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        >
                          ✓ {d.name}
                          <span className="opacity-50 text-[9px]">({d.code})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CTA row */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <a
            href="/"
            className={[
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white",
              "no-underline transition-all shadow-lg",
              isDanger
                ? "bg-red-600 hover:bg-red-500 shadow-red-900/40"
                : "bg-amber-600 hover:bg-amber-500 shadow-amber-900/40",
            ].join(" ")}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h16v16H4z" />
              <path d="M9 9h6M9 12h6M9 15h4" />
            </svg>
            지금 계획 수정하기
          </a>
          <span className="text-xs text-white/40">
            🔒 표시 = 연 1회만 개설되는 과목 (다음 기회: 내년)
          </span>
        </div>
      </div>

      {/* Bottom danger pulse bar */}
      {isDanger && (
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500/60 to-transparent animate-pulse" />
      )}
    </div>
  );
}
