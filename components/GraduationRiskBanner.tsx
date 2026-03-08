"use client";

// GraduationRiskBanner — 졸업 지연 위기 경고 UI
// Displays a high-impact red alert when required annual courses are missing.

import { useState } from "react";
import type { GraduationRisk } from "@/lib/graduation-risk";

interface Props {
  risk: GraduationRisk;
}

export default function GraduationRiskBanner({ risk }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

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
