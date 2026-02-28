// Service section: AI study plan form + result viewer (scroll target #service)
// Loading: animated skeleton preview cards. Error: modal dialog.
// Context-aware: text automatically switches with background brightness (light ↔ dark).

'use client';

import StudyPlanForm from '@/components/StudyPlanForm';
import UpgradeModal from '@/components/UpgradeModal';
import ApiErrorModal from '@/components/ApiErrorModal';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudyPlan } from '@/hooks/useStudyPlan';

// ─── Skeleton preview shown while AI is running ───────────────────────────────

function AiAnalysisSkeleton({ status }: { status: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="AI 분석 중"
      className="w-full"
    >
      {/* Status badge */}
      <div className="flex items-center justify-center gap-2.5 mb-6">
        <span
          className="inline-block w-2 h-2 rounded-full bg-indigo-500"
          style={{ animation: 'pulse 1.2s ease-in-out infinite' }}
        />
        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {status || 'AI 분석 중...'}
        </span>
        <span
          className="inline-block w-2 h-2 rounded-full bg-violet-500"
          style={{ animation: 'pulse 1.2s ease-in-out infinite 0.4s' }}
        />
      </div>

      {/* 4 Plan skeleton cards */}
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
        {['Plan A', 'Plan B', 'Plan C', 'Plan D'].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm"
          >
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

      {/* Year plan skeleton */}
      <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
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

// ─── Main section ─────────────────────────────────────────────────────────────

export default function ServiceSection() {
  const {
    loading, error, status, generate, retry, clearError,
    upgradeDetail, closeUpgradeModal,
  } = useStudyPlan();

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

      {/*
        ── Context-aware section ──
        Light mode:  soft blue/indigo/violet gradient, dark text
        Dark mode:   deep slate/indigo gradient, light text
        Text color auto-switches via Tailwind dark: variants.
      */}
      <section
        id="service"
        className={[
          'py-20 px-5',
          /* Light bg → dark text */
          'bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50',
          'text-gray-900',
          /* Dark bg → light text */
          'dark:from-slate-950 dark:via-indigo-950/70 dark:to-violet-950/60',
          'dark:text-gray-100',
          /* Font */
          "font-['system-ui','Segoe_UI',sans-serif]",
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
            </div>
          )}
        </div>
      </section>
    </>
  );
}
