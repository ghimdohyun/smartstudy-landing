// Subscription tier definitions — source of truth for plan limits and pricing
// Mirrors PLAN_LIMITS in types/auth.ts; update both in sync until DB is live.

export interface SubscriptionPlan {
  id: "beta" | "pro" | "enterprise";
  name: string;
  description: string;
  monthlyLimit: number;
  price: number; // KRW / month (0 = free)
  features: string[];
  isFeatured?: boolean;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "beta",
    name: "베타 무료",
    description: "서강대 신입생과 재학생을 위한 무료 플랜",
    monthlyLimit: 3,
    price: 0,
    features: [
      "AI 수강 계획 4안 생성 (월 3회)",
      "1년 학습 로드맵",
      "JSON / CSV 다운로드",
      "AI 챗봇 (기본)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "매 학기 최적의 수강 계획이 필요한 학생에게",
    monthlyLimit: 20,
    price: 4900,
    isFeatured: true,
    features: [
      "AI 수강 계획 4안 생성 (월 20회)",
      "1년 학습 로드맵",
      "JSON / CSV 다운로드",
      "AI 챗봇 (무제한)",
      "이미지 시간표 업로드",
      "우선 지원",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "학과·행정팀 단위 도입",
    monthlyLimit: 999,
    price: 0, // 문의 가격
    features: [
      "무제한 생성",
      "팀 계정 관리",
      "커스텀 커리큘럼 업로드",
      "전담 담당자 배정",
      "API 접근",
    ],
  },
];
