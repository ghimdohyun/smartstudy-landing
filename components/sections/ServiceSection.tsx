// Service section — 3-step guide, persona tabs, generalized (no specific university refs),
// disclaimer. UniversitySelector removed; defaults to generic AI config.

'use client';

import { useState, useEffect } from 'react';
import StudyPlanForm from '@/components/StudyPlanForm';
import UpgradeModal from '@/components/UpgradeModal';
import ApiErrorModal from '@/components/ApiErrorModal';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudyPlan } from '@/hooks/useStudyPlan';

// ─── Skeleton while AI is running ────────────────────────────────────────────

function AiAnalysisSkeleton({ status }: { status: string }) {
  return (
    <div role="status" aria-live="polite" aria-label="AI 분석 중" className="w-full">
      <div className="flex items-center justify-center gap-2.5 mb-6">
        <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"
          style={{ animation: 'pulse 1.2s ease-in-out infinite' }} />
        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {status || 'AI 분석 중...'}
        </span>
        <span className="inline-block w-2 h-2 rounded-full bg-violet-500"
          style={{ animation: 'pulse 1.2s ease-in-out infinite 0.4s' }} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
        {['Plan A', 'Plan B', 'Plan C', 'Plan D'].map((label) => (
          <div key={label} className="rounded-2xl border border-gray-100 dark:border-neutral-800
                                      bg-white dark:bg-neutral-900 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>
            <Skeleton className="h-3 w-full rounded mb-1.5" />
            <Skeleton className="h-3 w-4/5 rounded mb-3" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5">
                <Skeleton className="w-3 h-3 rounded-full shrink-0" />
                <Skeleton className="h-2.5 rounded" style={{ width: `${55 + i * 8}%` }} />
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-neutral-800
                      bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[3, 4, 5, 6].map((m) => (
            <div key={m} className="rounded-xl bg-gray-50 dark:bg-neutral-800/50 p-3">
              <Skeleton className="h-3 w-10 rounded mb-2" />
              <Skeleton className="h-2.5 w-full rounded mb-1" />
              <Skeleton className="h-2.5 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

// ─── 3-step guide ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: '1', title: '학생 정보 입력', desc: '학과·학년·이수 현황 등 기본 정보를 간단히 입력합니다.' },
  { n: '2', title: '시간표 업로드',  desc: '시간표 이미지를 드래그하거나 편람 PDF를 첨부합니다.' },
  { n: '3', title: 'AI 계획 확인',   desc: 'Plan A~D와 1년 로드맵이 즉시 생성됩니다.' },
];

function StepGuide() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-3 mb-9 max-w-[640px] mx-auto">
      {STEPS.map(({ n, title, desc }, i) => (
        <div key={n} className="flex-1 relative">
          {/* Connector arrow for sm+ */}
          {i < STEPS.length - 1 && (
            <span className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10
                             w-4 h-4 items-center justify-center
                             text-[10px] text-slate-400 dark:text-slate-600">▶</span>
          )}
          <div className="flex flex-col items-center text-center
                          bg-white dark:bg-slate-900/60
                          border border-slate-200 dark:border-slate-700
                          rounded-2xl px-4 py-4 h-full
                          shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <span className="w-8 h-8 rounded-full bg-indigo-600 text-white
                             text-[13px] font-bold flex items-center justify-center mb-2 shrink-0">
              {n}
            </span>
            <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 m-0 mb-1">{title}</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 m-0 leading-relaxed">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Persona tabs ─────────────────────────────────────────────────────────────

const PERSONAS = [
  {
    id: '재학생',
    title: '재학생',
    icon: '📚',
    value: '매 학기 최적 조합',
    points: [
      '전공·교양 균형 잡힌 4개 시나리오',
      '공강일 확보 + 학점 극대화 전략',
      '1년 학습 로드맵으로 진로 준비',
    ],
  },
  {
    id: '편입생',
    title: '편입생',
    icon: '🔄',
    value: '복잡한 학점 인정 즉시 반영',
    points: [
      '인정된 학점 제외한 남은 이수 계산',
      '전공 필수 빠른 충족 전략 제안',
      '새 학교 환경에 맞는 적응 플랜',
    ],
  },
  {
    id: '복학생',
    title: '복학생·졸업예정',
    icon: '🎓',
    value: '마지막 학기 완벽 마무리',
    points: [
      '졸업 요건 충족 체크리스트 반영',
      '무리 없는 복귀 수강 계획',
      '부족한 학점만 빠르게 채우는 전략',
    ],
  },
];

function PersonaTabs() {
  const [active, setActive] = useState('재학생');
  const persona = PERSONAS.find((p) => p.id === active)!;

  return (
    <div className="mb-9 max-w-[640px] mx-auto">
      <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4
                      bg-slate-50 dark:bg-slate-900 p-1 gap-1">
        {PERSONAS.map((p) => (
          <button key={p.id} type="button" onClick={() => setActive(p.id)}
            className={[
              'flex-1 py-2 px-2 rounded-lg text-[12px] font-semibold transition-all',
              active === p.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
            ].join(' ')}>
            {p.icon} {p.title}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700
                      rounded-2xl px-5 py-4 shadow-[0_2px_12px_rgba(15,23,42,0.05)]">
        <p className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 m-0 mb-2">
          {persona.value}
        </p>
        <ul className="m-0 pl-0 list-none space-y-1.5">
          {persona.points.map((pt) => (
            <li key={pt} className="flex items-start gap-2 text-[13px] text-slate-700 dark:text-slate-300">
              <span className="text-emerald-500 shrink-0 mt-px">✓</span> {pt}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Disclaimer ───────────────────────────────────────────────────────────────

function Disclaimer() {
  return (
    <div className="mt-5 flex items-start gap-2 px-4 py-3 rounded-xl
                    bg-amber-50 dark:bg-amber-900/20
                    border border-amber-200 dark:border-amber-700/60">
      <span className="text-amber-500 shrink-0 text-[15px]">⚠</span>
      <p className="m-0 text-[12px] text-amber-800 dark:text-amber-300 leading-relaxed">
        <strong>최종 수강 신청 전 반드시 학교 포털에서 재확인하세요.</strong>
        {' '}AI 생성 결과는 참고용이며, 실제 개설 여부·수강 제한 인원·시간표는 학교 시스템을 기준으로 합니다.
      </p>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function ServiceSection() {
  const {
    loading, error, status, generate, retry, clearError,
    upgradeDetail, closeUpgradeModal,
  } = useStudyPlan();

  // Default to generic config (remove university-specific localStorage value if it was set)
  useEffect(() => {
    const stored = localStorage.getItem('smartstudy_university');
    if (!stored || stored === 'kyungsung-sw' || stored === 'sogang-general') {
      localStorage.setItem('smartstudy_university', 'generic');
    }
  }, []);

  const isValidationError =
    error === '학생 정보를 입력해주세요.' ||
    error === '시간표 이미지를 업로드하거나 URL을 입력해주세요.';
  const showErrorModal = !!error && !isValidationError && !loading;

  return (
    <>
      <UpgradeModal
        open={upgradeDetail !== null}
        onClose={closeUpgradeModal}
        currentPlan={upgradeDetail?.currentPlan}
        used={upgradeDetail?.used}
        limit={upgradeDetail?.limit}
      />

      <ApiErrorModal
        open={showErrorModal}
        message={error ?? ''}
        onClose={clearError}
        onRetry={retry}
      />

      <section
        id="service"
        className={[
          'py-20 px-5',
          'bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50',
          'text-gray-900',
          'dark:from-slate-950 dark:via-indigo-950/70 dark:to-violet-950/60',
          'dark:text-gray-100',
        ].join(' ')}
        style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Section heading */}
          <div className="text-center mb-9">
            <p className="text-[13px] font-bold text-emerald-500 uppercase tracking-[0.1em] m-0 mb-3">
              AI 수강 계획 생성
            </p>
            <h2 className="text-[clamp(22px,3.5vw,32px)] font-extrabold tracking-tight m-0 mb-2.5
                           text-gray-900 dark:text-white">
              지금 바로 계획을 만들어보세요
            </h2>
            <p className="text-[15px] text-gray-600 dark:text-gray-300 m-0">
              학생 정보를 입력하면 AI가 수강 계획 4안과 1년 로드맵을 즉시 생성합니다.
            </p>
          </div>

          {/* 3-step guide */}
          <StepGuide />

          {/* Persona tabs */}
          <PersonaTabs />

          {/* Skeleton while loading, form otherwise */}
          {loading ? (
            <AiAnalysisSkeleton status={status} />
          ) : (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <StudyPlanForm
                onSubmit={generate}
                loading={false}
                status={status}
                error={isValidationError ? error : null}
              />
              {/* Disclaimer */}
              <Disclaimer />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
