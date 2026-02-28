// Service section: AI study plan form + result viewer (scroll target #service)
// Includes step-by-step loading indicator and Korean error banner with retry.

'use client';

import StudyPlanForm from '@/components/StudyPlanForm';
import { useStudyPlan } from '@/hooks/useStudyPlan';

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingStepBanner({ step }: { step: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        marginBottom: 20, padding: '14px 20px',
        background: 'linear-gradient(135deg,rgba(102,126,234,0.08),rgba(168,85,247,0.08))',
        border: '1px solid rgba(102,126,234,0.2)', borderRadius: 14,
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      {/* Spinner */}
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="#667eea" strokeWidth="2.5" strokeLinecap="round"
        style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }}
      >
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <span style={{ fontSize: 14, color: '#5046e5', fontWeight: 600 }}>{step}</span>
    </div>
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const isRetryable = !message.includes('학생 정보를 입력해주세요');

  return (
    <div
      role="alert"
      style={{
        marginBottom: 20, padding: '16px 20px',
        background: 'linear-gradient(135deg,#fff1f2,#fff7ed)',
        border: '1px solid #fca5a5', borderRadius: 14,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.4 }}>⚠️</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 14, fontWeight: 600, color: '#b91c1c', marginBottom: 4,
        }}>
          오류가 발생했습니다
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>
          {message}
        </p>
      </div>

      {/* Retry button — only shown for API / network errors */}
      {isRetryable && (
        <button
          onClick={onRetry}
          style={{
            flexShrink: 0, padding: '8px 16px',
            background: 'linear-gradient(135deg,#667eea,#764ba2)',
            color: '#fff', border: 'none', borderRadius: 999,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(102,126,234,0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          다시 시도하기
        </button>
      )}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function ServiceSection() {
  const { result, loading, error, status, generate, retry } = useStudyPlan();

  // Validation errors (empty studentInfo) show inside the form, not in the banner.
  const isValidationError = error === '학생 정보를 입력해주세요.';
  const showBanner = !!error && !isValidationError && !loading;

  return (
    <section
      id="service"
      style={{
        padding: '72px 20px',
        background: 'linear-gradient(135deg,#eff6ff,#eef2ff,#f5f3ff)',
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      }}
    >
      {/* CSS keyframes for spinner — injected once */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Section heading */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={{
            fontSize: 12, fontWeight: 700, color: '#10b981',
            textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px',
          }}>
            AI 수강 계획 생성
          </p>
          <h2 style={{
            fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 800, color: '#0f172a',
            margin: '0 0 10px', letterSpacing: '-0.5px',
          }}>
            지금 바로 계획을 만들어보세요
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            학생 정보를 입력하면 AI가 수강 계획 4안과 1년 로드맵을 즉시 생성합니다.
          </p>
        </div>

        {/* Step-by-step loading indicator */}
        {loading && <LoadingStepBanner step={status} />}

        {/* API / network error banner with retry */}
        {showBanner && <ErrorBanner message={error!} onRetry={retry} />}

        {/* Form — centered, max-width 640px */}
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <StudyPlanForm
            onSubmit={generate}
            loading={loading}
            status={loading ? '' : status}
            error={isValidationError ? error : null}
          />
        </div>
      </div>
    </section>
  );
}
