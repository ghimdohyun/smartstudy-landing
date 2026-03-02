// 402 Usage-limit upgrade modal — glassmorphism, dark mode aware
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** plan currently on: 'beta' | 'basic' | 'pro' */
  currentPlan?: string;
  used?: number;
  limit?: number;
}

async function startCheckout(plan: "basic" | "pro"): Promise<void> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json() as { url?: string; error?: string };
  if (data.url) {
    window.location.href = data.url;
  } else {
    alert(data.error ?? "결제 페이지로 이동할 수 없습니다.");
  }
}

export default function UpgradeModal({ open, onClose, currentPlan, used, limit }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<"basic" | "pro" | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const handleUpgrade = async (plan: "basic" | "pro") => {
    setLoadingPlan(plan);
    await startCheckout(plan);
    setLoadingPlan(null);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(10,15,35,0.78)", backdropFilter: "blur(20px) saturate(1.6)" }}
      onClick={onClose}
    >
      {/* Card */}
      <div
        className={cn(
          "relative w-full max-w-[480px] rounded-3xl p-8",
          "bg-white/96 dark:bg-neutral-900/96",
          "backdrop-blur-3xl",
          "shadow-[0_32px_80px_rgba(15,23,42,0.28),0_0_0_1.5px_rgba(255,255,255,0.3)]",
          "dark:shadow-[0_32px_80px_rgba(0,0,0,0.75),0_0_0_1.5px_rgba(255,255,255,0.08)]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl leading-none"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-2xl mb-5 shadow-[0_8px_20px_rgba(124,58,237,0.4)]">
          ⚡
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1.5">
          이번 달 한도에 도달했어요
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          현재 플랜:{" "}
          <span className="font-semibold text-violet-600 dark:text-violet-400">
            {currentPlan === "beta" ? "베타 (무료)" : currentPlan}
          </span>
        </p>
        {used !== undefined && limit !== undefined && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
            이번 달 사용: {used}회 / {limit === Infinity ? "무제한" : `${limit}회`}
          </p>
        )}

        {/* Usage bar */}
        {limit !== undefined && limit !== Infinity && used !== undefined && (
          <div className="mb-6">
            <div className="h-1.5 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-red-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div className="flex gap-3 mb-6">
          {/* Basic */}
          <div className="flex-1 rounded-2xl border border-gray-200 dark:border-neutral-700 p-4 bg-white/60 dark:bg-neutral-800/60">
            <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">
              기본
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
              ₩4,900
              <span className="text-xs font-normal text-gray-400 ml-1">/ 월</span>
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">월 30회 생성</p>
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-full text-xs font-semibold border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
              disabled={loadingPlan !== null}
              onClick={() => handleUpgrade("basic")}
            >
              {loadingPlan === "basic" ? "이동 중..." : "기본 플랜 시작"}
            </Button>
          </div>

          {/* Pro — highlighted */}
          <div className="flex-1 rounded-2xl p-4 bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_8px_24px_rgba(124,58,237,0.35)] relative overflow-hidden">
            <span className="absolute top-2 right-2 text-[9px] font-bold bg-yellow-300 text-yellow-900 px-1.5 py-0.5 rounded-full">
              인기
            </span>
            <p className="text-[11px] font-bold text-violet-200 uppercase tracking-wider mb-1">
              프로
            </p>
            <p className="text-xl font-bold text-white mb-0.5">
              ₩14,900
              <span className="text-xs font-normal text-violet-300 ml-1">/ 월</span>
            </p>
            <p className="text-[11px] text-violet-200 mb-3">무제한 생성</p>
            <Button
              size="sm"
              className="w-full rounded-full text-xs font-semibold bg-white text-violet-700 hover:bg-violet-50 shadow-sm"
              disabled={loadingPlan !== null}
              onClick={() => handleUpgrade("pro")}
            >
              {loadingPlan === "pro" ? "이동 중..." : "프로 플랜 시작"}
            </Button>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
          결제는 Stripe를 통해 안전하게 처리됩니다 · 언제든 취소 가능
        </p>
      </div>
    </div>
  );
}
