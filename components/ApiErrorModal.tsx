// API error modal — shown when study-plan API returns an unexpected error
// Uses the same glassmorphism pattern as UpgradeModal.
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  message: string;
  onClose: () => void;
  onRetry: () => void;
}

const ERROR_REASONS: Record<string, { icon: string; tip: string }> = {
  network: {
    icon: "📡",
    tip: "인터넷 연결을 확인하고 다시 시도해주세요.",
  },
  timeout: {
    icon: "⏱",
    tip: "AI 서버 응답이 늦습니다. 잠시 후 다시 시도하면 데모 데이터로 즉시 확인할 수 있습니다.",
  },
  server: {
    icon: "🔧",
    tip: "서버에 일시적인 문제가 생겼습니다. 대개 1~2분 안에 복구됩니다.",
  },
  limit: {
    icon: "🔒",
    tip: "이번 달 사용 한도에 도달했습니다. 플랜을 업그레이드해주세요.",
  },
  default: {
    icon: "⚠️",
    tip: "알 수 없는 오류입니다. 잠시 후 다시 시도해주세요.",
  },
};

function classifyError(msg: string): keyof typeof ERROR_REASONS {
  if (/네트워크|network|fetch/i.test(msg)) return "network";
  if (/지연|timeout|서버 사용량/i.test(msg)) return "server";
  if (/한도|limit|초과/i.test(msg)) return "limit";
  if (/준비 중|점검/i.test(msg)) return "timeout";
  return "default";
}

export default function ApiErrorModal({ open, message, onClose, onRetry }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const kind = classifyError(message);
  const { icon, tip } = ERROR_REASONS[kind];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(10,15,35,0.78)", backdropFilter: "blur(20px) saturate(1.6)" }}
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-[440px] rounded-3xl p-8",
          "bg-white/96 dark:bg-neutral-900/96 backdrop-blur-3xl",
          "shadow-[0_32px_80px_rgba(15,23,42,0.28),0_0_0_1.5px_rgba(255,255,255,0.3)]",
          "dark:shadow-[0_32px_80px_rgba(0,0,0,0.75),0_0_0_1.5px_rgba(255,255,255,0.08)]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl leading-none"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* Icon badge */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-2xl mb-5 shadow-[0_8px_20px_rgba(239,68,68,0.4)]">
          {icon}
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1.5">
          요청 처리 중 오류가 발생했습니다
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          {message}
        </p>

        {/* Tip card */}
        <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 p-4 mb-6">
          <p className="text-[13px] font-semibold text-orange-800 dark:text-orange-300 mb-1">
            해결 방법
          </p>
          <p className="text-[12px] text-orange-700 dark:text-orange-400 leading-relaxed">
            {tip}
          </p>
        </div>

        {/* Demo note */}
        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-4 py-3 mb-6">
          <p className="text-[12px] text-indigo-700 dark:text-indigo-400 leading-relaxed">
            💡 재시도 시 AI 서버가 응답하지 않으면 <strong>데모 데이터</strong>로 결과를 미리 확인할 수 있습니다.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-full text-sm font-semibold border-gray-200 dark:border-neutral-700"
            onClick={onClose}
          >
            닫기
          </Button>
          <Button
            className="flex-1 rounded-full text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-[0_8px_20px_rgba(99,102,241,0.4)] border-0 text-white"
            onClick={() => { onClose(); onRetry(); }}
          >
            다시 시도하기
          </Button>
        </div>
      </div>
    </div>
  );
}
