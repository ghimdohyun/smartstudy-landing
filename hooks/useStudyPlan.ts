// Hook for study plan generation state management with step-loader and error normalization

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { StudyPlanInput, StudyPlanResult } from '@/types';
import { fetchStudyPlan, UpgradeRequiredError, type UpgradeRequiredDetail } from '@/lib/api';

// ─── Step-by-step loading messages ───────────────────────────────────────────

const LOADING_STEPS = [
  '서강대 커리큘럼 데이터 로드 중...',
  '학생 프로필 분석 중...',
  '최적의 수강 조합 탐색 중...',
  'Plan A~D 시간표 구성 중...',
  '1년 학습 로드맵 생성 중...',
  '최종 결과 정리 중...',
] as const;

const STEP_INTERVAL_MS = 2500;

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
  const lastInputRef = useRef<StudyPlanInput | null>(null);
  const stepIndexRef = useRef(0);

  // Cycle through loading step messages while loading
  useEffect(() => {
    if (!loading) return;
    stepIndexRef.current = 0;
    setStatus(LOADING_STEPS[0]);
    const id = setInterval(() => {
      stepIndexRef.current = (stepIndexRef.current + 1) % LOADING_STEPS.length;
      setStatus(LOADING_STEPS[stepIndexRef.current]);
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loading]);

  const generate = useCallback(async (input: StudyPlanInput) => {
    if (!input.studentInfo.trim()) {
      setError('학생 정보를 입력해주세요.');
      return;
    }
    if (!input.imageUrl?.trim()) {
      setError('시간표 이미지를 업로드하거나 URL을 입력해주세요.');
      return;
    }

    lastInputRef.current = input;
    setError(null);
    setStatus('');
    setUpgradeDetail(null);
    setLoading(true);

    try {
      const data = await fetchStudyPlan(input);
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
