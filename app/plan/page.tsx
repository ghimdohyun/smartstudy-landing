// /plan page: Plan A~D cards, YearPlanView, and JSON/CSV export

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StudyPlanResult } from '@/types';
import PlanCard from '@/components/PlanCard';
import YearPlanView from '@/components/YearPlanView';
import { downloadJSON, downloadCSV } from '@/lib/exportUtils';

export default function PlanPage() {
  const [result, setResult] = useState<StudyPlanResult | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('smartstudy_result');
    if (!stored) return;
    try {
      setResult(JSON.parse(stored) as StudyPlanResult);
    } catch {
      setResult(null);
    }
  }, []);

  if (!result) {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg,#eff6ff,#eef2ff,#f5f3ff)',
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        padding: 32,
      }}>
        <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 16 }}>
          아직 생성된 계획이 없습니다.
        </p>
        <Link href="/" style={{
          padding: '10px 24px', background: '#10b981', color: '#fff',
          borderRadius: 999, textDecoration: 'none', fontWeight: 600,
          boxShadow: '0 6px 12px rgba(16,185,129,0.3)',
        }}>
          계획 생성하러 가기
        </Link>
      </main>
    );
  }

  const hasPlans = (result.plans ?? []).length > 0;

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#eff6ff,#eef2ff,#f5f3ff)',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      padding: '32px 16px',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Demo mode notice — glassmorphism floating bar */}
        {result.isDemo && (
          <div style={{
            padding: '11px 18px', marginBottom: 20,
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.55)',
            borderRadius: 14,
            boxShadow: '0 4px 24px rgba(15,23,42,0.07)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#f59e0b', flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(245,158,11,0.18)',
            }} />
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              <strong style={{ color: '#374151' }}>데모 모드</strong> —
              AI 서버 점검 중입니다. 잠시 후 다시 시도하면 실제 맞춤 계획을 받을 수 있습니다.
            </p>
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 28, gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <Link href="/" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
              ← 돌아가기
            </Link>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '6px 0 4px' }}>
              수강 계획표
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              AI가 생성한 Plan A~D와 1년 학습 로드맵을 확인하세요.
            </p>
          </div>

          {/* Export buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            <button
              onClick={() => downloadJSON(result, 'smartstudy-plan.json')}
              style={{
                padding: '8px 16px', background: '#1e293b', color: '#fff',
                border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              JSON 다운로드
            </button>
            {hasPlans && (
              <button
                onClick={() => downloadCSV(result, 'smartstudy-plan.csv')}
                style={{
                  padding: '8px 16px', background: '#10b981', color: '#fff',
                  border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', boxShadow: '0 4px 10px rgba(16,185,129,0.3)',
                }}
              >
                CSV 다운로드
              </button>
            )}
          </div>
        </div>

        {/* Plan A~D cards */}
        {hasPlans && (
          <section style={{ marginBottom: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
              수강 계획 4안
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {result.plans!.map((plan, i) => (
                <PlanCard key={i} plan={plan} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Year plan */}
        {result.yearPlan && <YearPlanView yearPlan={result.yearPlan} />}

        {/* Fallback: raw response when JSON parse failed */}
        {!hasPlans && !result.yearPlan && result.raw && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
              원본 응답
            </h2>
            <pre style={{
              padding: 16, background: '#0f172a', color: '#e5e7eb',
              borderRadius: 12, fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap',
              margin: 0,
            }}>
              {result.raw}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
