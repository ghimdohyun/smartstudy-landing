// Pricing section — shadcn-style cards, dark mode, Stripe Checkout integration
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Tier {
  id: "beta" | "basic" | "pro";
  name: string;
  price: string;
  period: string;
  desc: string;
  highlight: boolean;
  badge: string;
  features: string[];
  cta: string;
  stripePlan?: "basic" | "pro";
  ctaHref?: string;
}

const TIERS: Tier[] = [
  {
    id: "beta",
    name: "베타",
    price: "무료",
    period: "현재",
    desc: "베타 기간 동안 모든 기능 무료 제공",
    highlight: false,
    badge: "지금 이용 중",
    features: [
      "수강 계획 4안 생성 (월 3회)",
      "1년 학습 로드맵",
      "JSON / CSV 내보내기",
      "상담 AI 챗봇",
      "브라우저 저장",
    ],
    cta: "무료로 시작",
    ctaHref: "#service",
  },
  {
    id: "basic",
    name: "기본",
    price: "₩4,900",
    period: "/ 월",
    desc: "자주 사용하는 개인 사용자에게 적합",
    highlight: true,
    badge: "가장 인기",
    features: [
      "베타 기능 전체 포함",
      "월 30회 계획 생성",
      "계획 히스토리 저장",
      "이메일 내보내기",
    ],
    cta: "기본 플랜 시작",
    stripePlan: "basic",
  },
  {
    id: "pro",
    name: "프로",
    price: "₩14,900",
    period: "/ 월",
    desc: "스터디 그룹 및 튜터링 센터 대상",
    highlight: false,
    badge: "무제한",
    features: [
      "기본 기능 전체 포함",
      "무제한 계획 생성",
      "팀 공유 기능",
      "맞춤 브랜딩",
      "우선 지원",
    ],
    cta: "프로 플랜 시작",
    stripePlan: "pro",
  },
];

async function handleCheckout(plan: "basic" | "pro", setLoading: (v: string | null) => void) {
  setLoading(plan);
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json() as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? "결제 페이지 연결 실패. 잠시 후 다시 시도해주세요.");
    }
  } finally {
    setLoading(null);
  }
}

export default function PricingSection() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  return (
    <section
      id="pricing"
      className="py-[72px] px-5 pb-24 bg-gradient-to-b from-transparent to-violet-50/60 dark:to-violet-950/20"
    >
      <div className="max-w-[960px] mx-auto">
        {/* Heading */}
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-[0.1em] mb-3">
            요금제
          </p>
          <h2 className="text-[clamp(24px,4vw,36px)] font-extrabold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">
            지금은 모두 무료
          </h2>
          <p className="text-[15px] text-gray-500 dark:text-gray-400">
            베타 기간 동안 모든 기능을 무료로 이용하세요. 추후 유료 플랜이 출시될 예정입니다.
          </p>
        </div>

        {/* Cards */}
        <div className="flex flex-wrap gap-6 justify-center items-start">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={cn(
                "relative flex-1 min-w-[240px] max-w-[300px] rounded-[20px] p-8",
                "transition-transform duration-200",
                tier.highlight
                  ? [
                      "bg-gradient-to-br from-[#667eea] to-[#764ba2]",
                      "shadow-[0_16px_48px_rgba(102,126,234,0.4)]",
                      "scale-[1.04]",
                    ]
                  : [
                      "bg-white dark:bg-neutral-900",
                      "border border-gray-100 dark:border-neutral-800",
                      "shadow-[0_4px_20px_rgba(15,23,42,0.07)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]",
                    ]
              )}
            >
              {/* Top badge */}
              <Badge
                className={cn(
                  "absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold whitespace-nowrap shadow-md",
                  tier.highlight
                    ? "bg-yellow-300 text-yellow-900"
                    : "bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400"
                )}
                variant="secondary"
              >
                {tier.badge}
              </Badge>

              {/* Plan name */}
              <p
                className={cn(
                  "text-[13px] font-bold mb-1.5",
                  tier.highlight ? "text-violet-200" : "text-violet-600 dark:text-violet-400"
                )}
              >
                {tier.name}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-2">
                <span
                  className={cn(
                    "text-[34px] font-extrabold",
                    tier.highlight ? "text-white" : "text-gray-900 dark:text-gray-100"
                  )}
                >
                  {tier.price}
                </span>
                <span
                  className={cn(
                    "text-[13px]",
                    tier.highlight ? "text-violet-300" : "text-gray-400 dark:text-gray-500"
                  )}
                >
                  {tier.period}
                </span>
              </div>

              {/* Desc */}
              <p
                className={cn(
                  "text-[13px] mb-6",
                  tier.highlight ? "text-violet-200" : "text-gray-500 dark:text-gray-400"
                )}
              >
                {tier.desc}
              </p>

              {/* Feature list */}
              <ul className="flex flex-col gap-2.5 mb-7">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className={cn(
                      "flex items-center gap-2 text-[13px]",
                      tier.highlight ? "text-violet-100" : "text-gray-700 dark:text-gray-300"
                    )}
                  >
                    <span
                      className={cn(
                        "font-bold text-[15px]",
                        tier.highlight ? "text-cyan-300" : "text-emerald-500"
                      )}
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {tier.stripePlan ? (
                <Button
                  className={cn(
                    "w-full rounded-full text-[13px] font-bold",
                    tier.highlight
                      ? "bg-white text-violet-700 hover:bg-violet-50 shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
                      : "bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-[0_4px_14px_rgba(102,126,234,0.35)] hover:shadow-[0_6px_20px_rgba(102,126,234,0.5)]"
                  )}
                  disabled={loadingPlan !== null}
                  onClick={() => handleCheckout(tier.stripePlan!, setLoadingPlan)}
                >
                  {loadingPlan === tier.stripePlan ? "이동 중..." : tier.cta}
                </Button>
              ) : (
                <Button
                  asChild
                  className={cn(
                    "w-full rounded-full text-[13px] font-bold",
                    "bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-[0_4px_14px_rgba(102,126,234,0.35)]"
                  )}
                >
                  <a href={tier.ctaHref}>{tier.cta}</a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
