// Hook for study plan generation state management with step-loader and error normalization

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { StudyPlanInput, StudyPlanResult } from '@/types';
import { fetchStudyPlan, UpgradeRequiredError, type UpgradeRequiredDetail } from '@/lib/api';

// ─── Step-by-step loading messages ───────────────────────────────────────────

const VISION_BATCH_SIZE = 5; // must match lib/groq.ts

const SINGLE_STEP_MS = 2500;
const MULTI_STEP_MS  = 7500; // each batch takes ~8-12s on Groq

const BASE_STEPS = [
  '경성대 커리큘럼 데이터 로드 중...',
  '학생 프로필 분석 중...',
  '최적의 수강 조합 탐색 중...',
  'Plan A~D 시간표 구성 중...',
  '1년 학습 로드맵 생성 중...',
  '최종 결과 정리 중...',
] as const;

/** Builds progress step messages based on uploaded image count */
function buildLoadingSteps(imageCount: number): string[] {
  if (imageCount <= VISION_BATCH_SIZE) {
    return [...BASE_STEPS];
  }
  const batchCount = Math.ceil(imageCount / VISION_BATCH_SIZE);
  const steps: string[] = [
    `총 ${imageCount}장 이미지 감지 — ${batchCount}개 배치로 분할 분석 시작...`,
  ];
  for (let i = 1; i <= batchCount; i++) {
    const from = (i - 1) * VISION_BATCH_SIZE + 1;
    const to   = Math.min(i * VISION_BATCH_SIZE, imageCount);
    steps.push(
      `이미지를 분석 중입니다... (${i}/${batchCount} 배치 — ${from}~${to}번 이미지)`
    );
  }
  steps.push('전공 편성표 + 교양 편성표 결과 통합 중...');
  steps.push('Plan A~D 시간표 최종 구성 중...');
  steps.push('1년 학습 로드맵 생성 중...');
  return steps;
}

// ─── Error normalization ──────────────────────────────────────────────────────

function normalizeError(err: unknown): string {
  if (err instanceof UpgradeRequiredError) return err.message;
  const msg = err instanceof Error ? err.message : String(err);

  // Already Korean — pass through
  if (/[가-힣]/.test(msg)) return msg;

  if (/failed to fetch|networkerror|net::/i.test(msg)) {
    return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
  }
  if (/404|not found/i.test(msg)) {
    return '현재 AI 엔진이 수강 데이터를 분석할 준비 중입니다. 잠시 후 다시 시도해주세요.';
  }
  if (/429|rate.?limit/i.test(msg)) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (/5[0-9]{2}|internal/i.test(msg)) {
    return '서버 사용량이 많아 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
  }

  return '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

// ─── Structure validation + client-side DEMO_PLAN fallback ───────────────────

/** Minimal demo result served when the AI response structure is broken. */
const CLIENT_DEMO: StudyPlanResult = {
  isDemo: true,
  plans: [
    {
      label: 'Plan A — 데모 (AI 재시도 권장)',
      totalCredits: 18,
      courses: [
        { name: '데이터구조', credits: 3, requirement: '전공기초', day: '월,수', time: '1교시' },
        { name: '알고리즘', credits: 3, requirement: '전공선택', day: '화,목', time: '2교시' },
        { name: '자료구조실습', credits: 1, requirement: '전공기초', day: '금', time: '3교시' },
      ],
    },
    {
      label: 'Plan B — 데모 (AI 재시도 권장)',
      totalCredits: 15,
      courses: [
        { name: '운영체제', credits: 3, requirement: '전공필수', day: '월,수', time: '2교시' },
        { name: '데이터베이스', credits: 3, requirement: '전공선택', day: '화,목', time: '3교시' },
      ],
    },
    {
      label: 'Plan C — 데모 (AI 재시도 권장)',
      totalCredits: 16,
      courses: [
        { name: '소프트웨어공학', credits: 3, requirement: '전공선택', day: '월,수,금', time: '1교시' },
        { name: '컴퓨터네트워크', credits: 3, requirement: '전공선택', day: '화,목', time: '1교시' },
      ],
    },
    {
      label: 'Plan D — 데모 (AI 재시도 권장)',
      totalCredits: 12,
      courses: [
        { name: '인공지능', credits: 3, requirement: '전공선택', day: '월,수', time: '3교시' },
        { name: '머신러닝', credits: 3, requirement: '전공선택', day: '화,목', time: '4교시' },
      ],
    },
  ],
};

/**
 * Validates that the AI response has the expected shape before rendering.
 * Returns false if plans/yearPlan are missing or obviously malformed.
 */
function validateStructure(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const hasPlans    = Array.isArray(d.plans) && d.plans.length > 0;
  const hasYearPlan = d.yearPlan && typeof d.yearPlan === 'object';
  return hasPlans || Boolean(hasYearPlan);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStudyPlan() {
  const router = useRouter();
  const [result, setResult] = useState<StudyPlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  /** Upgrade modal state — null = closed */
  const [upgradeDetail, setUpgradeDetail] = useState<UpgradeRequiredDetail | null>(null);

  /** Stored last input for retry support */
  const lastInputRef   = useRef<StudyPlanInput | null>(null);
  const stepIndexRef   = useRef(0);
  const stepsRef       = useRef<string[]>([...BASE_STEPS]);
  const stepIntervalRef = useRef(SINGLE_STEP_MS);

  // Cycle through dynamic loading step messages while loading
  useEffect(() => {
    if (!loading) return;
    const steps      = stepsRef.current;
    const intervalMs = stepIntervalRef.current;
    stepIndexRef.current = 0;
    setStatus(steps[0]);
    const id = setInterval(() => {
      // Clamp at last step (don't wrap) — real completion sets its own message
      stepIndexRef.current = Math.min(stepIndexRef.current + 1, steps.length - 1);
      setStatus(steps[stepIndexRef.current]);
    }, intervalMs);
    return () => clearInterval(id);
  }, [loading]);

  const generate = useCallback(async (input: StudyPlanInput) => {
    if (!input.studentInfo.trim()) {
      setError('학생 정보를 입력해주세요.');
      return;
    }
    if (!input.imageUrl?.trim() && !input.pdfMode) {
      setError('시간표 이미지를 업로드하거나 PDF를 업로드해주세요.');
      return;
    }

    // Build dynamic step messages based on image count
    const imageCount = (input.imageUrl ?? '').split('|||').filter(Boolean).length;
    stepsRef.current       = buildLoadingSteps(imageCount);
    stepIntervalRef.current = imageCount > VISION_BATCH_SIZE ? MULTI_STEP_MS : SINGLE_STEP_MS;

    const universityId =
      typeof window !== 'undefined'
        ? localStorage.getItem('smartstudy_university') ?? undefined
        : undefined;
    const enrichedInput = { ...input, universityId };

    lastInputRef.current = enrichedInput;
    setError(null);
    setStatus('');
    setUpgradeDetail(null);
    setLoading(true);

    try {
      const raw = await fetchStudyPlan(enrichedInput);
      // Guard: if AI returned an empty/malformed structure, replace with
      // CLIENT_DEMO so the plan page renders safely with no runtime errors.
      const data: StudyPlanResult = validateStructure(raw) ? raw : CLIENT_DEMO;
      setResult(data);
      setStatus('생성 완료! 플랜 페이지로 이동합니다...');
      if (typeof window !== 'undefined') {
        localStorage.setItem('smartstudy_result', JSON.stringify(data));
      }
      router.push('/plan');
    } catch (err: unknown) {
      if (err instanceof UpgradeRequiredError) {
        // Open upgrade modal instead of a plain error message
        setUpgradeDetail(err.detail);
      } else {
        setError(normalizeError(err));
      }
      setStatus('');
    } finally {
      setLoading(false);
    }
  }, [router]);

  /** Re-run the last submitted request */
  const retry = useCallback(() => {
    if (lastInputRef.current) generate(lastInputRef.current);
  }, [generate]);

  return {
    result,
    loading,
    error,
    status,
    generate,
    retry,
    clearError: () => setError(null),
    upgradeDetail,
    closeUpgradeModal: () => setUpgradeDetail(null),
  };
}
