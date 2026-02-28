// /plan page: Plan A~D cards, YearPlanView, and JSON/CSV export
// Updated: Real-time Groq AI mode (demo banner removed, live AI indicator added)

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StudyPlanResult } from '@/types';
import PlanCard from '@/components/PlanCard';
import YearPlanView from '@/components/YearPlanView';
import { downloadJSON, downloadCSV } from '@/lib/exportUtils';

const SPIN_STYLE = `
@keyframes spin {
  from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
    }
    `;

export default function PlanPage() {
    const [result, setResult] = useState<StudyPlanResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLive, setIsLive] = useState(false);

  useEffect(() => {
        const stored = localStorage.getItem('smartstudy_result');
        if (!stored) return;
        try {
                const parsed = JSON.parse(stored) as StudyPlanResult;
                // If this is demo data, try to fetch real data from Groq backend
          if (parsed.isDemo) {
                    const formData = localStorage.getItem('smartstudy_form');
                    if (formData) {
                                setIsLoading(true);
                                const parsedForm = JSON.parse(formData);
                                fetch(`${process.env.NEXT_PUBLIC_REPLIT_API_URL}/api/generate-plan`, {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify(parsedForm),
                                })
                                  .then((res) => res.json())
                                  .then((data) => {
                                                  if (data && (data.plans || data.yearPlan)) {
                                                                    const liveResult: StudyPlanResult = { ...data, isDemo: false };
                                                                    setResult(liveResult);
                                                                    setIsLive(true);
                                                                    localStorage.setItem('smartstudy_result', JSON.stringify(liveResult));
                                                  } else {
                                                                    setResult(parsed);
                                                  }
                                  })
                                  .catch(() => {
                                                  setResult(parsed);
                                  })
                                  .finally(() => setIsLoading(false));
                    } else {
                                setResult(parsed);
                    }
          } else {
                    setResult(parsed);
                    setIsLive(true);
          }
        } catch {
                setResult(null);
        }
  }, []);

  // Loading screen while fetching real AI data
  if (isLoading) {
        return (
                <main
                          style={{
                                      minHeight: '100vh',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: 'linear-gradient(135deg,#eff6ff,#eef2ff,#f5f3ff)',
                                      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
                                      padding: 32,
                                      gap: 20,
                          }}
                        >
                        <style dangerouslySetInnerHTML={{ __html: SPIN_STYLE }} />
                        <img
                                    src="/sogang-logo.png"
                                    alt="서강대학교"
                                    style={{ width: 64, height: 64, objectFit: 'contain', opacity: 0.85 }}
                                    onError={(e) => {
                                                  (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                        <div
                                    style={{
                                                  display: 'flex',
                                                  flexDirection: 'column',
                                                  alignItems: 'center',
                                                  gap: 12,
                                    }}
                                  >
                                  <div
                                                style={{
                                                                width: 40,
                                                                height: 40,
                                                                border: '3px solid #e5e7eb',
                                                                borderTop: '3px solid #6366f1',
                                                                borderRadius: '50%',
                                                                animation: 'spin 1s linear infinite',
                                                }}
                                              />
                                  <p style={{ fontSize: 15, color: '#4b5563', margin: 0, fontWeight: 500 }}>
                                              AI가 전공 이수 현황을 분석하고 있습니다...
                                  </p>
                                  <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                                              Groq AI가 맞춤 수강 계획을 생성 중입니다
                                  </p>
                        </div>
                </main>
              );
  }
  
    if (!result) {
          return (
                  <main
                            style={{
                                        minHeight: '100vh',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'linear-gradient(135deg,#eff6ff,#eef2ff,#f5f3ff)',
                                        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
                                        padding: 32,
                            }}
                          >
                          <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 16 }}>
                                    아직 생성된 계획이 없습니다.
                          </p>
                          <Link
                                      href="/"
                                      style={{
                                                    padding: '10px 24px',
                                                    background: '#10b981',
                                                    color: '#fff',
                                                    borderRadius: 999,
                                                    textDecoration: 'none',
                                                    fontWeight: 600,
                                                    boxShadow: '0 6px 12px rgba(16,185,129,0.3)',
                                      }}
                                    >
                                    계획 생성하러 가기
                          </Link>
                  </main>
                );
    }
  
    const hasPlans = (result.plans ?? []).length > 0;
  
    return (
          <main
                  style={{
                            minHeight: '100vh',
                            background: 'linear-gradient(135deg,#eff6ff,#eef2ff,#f5f3ff)',
                            fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
                            padding: '32px 16px',
                  }}
                >
                <div style={{ maxWidth: 960, margin: '0 auto' }}>
                  {/* Live AI indicator (small, subtle) */}
                  {isLive && (
                            <div
                                          style={{
                                                          display: 'inline-flex',
                                                          alignItems: 'center',
                                                          gap: 6,
                                                          padding: '5px 12px',
                                                          marginBottom: 16,
                                                          background: 'rgba(16,185,129,0.1)',
                                                          border: '1px solid rgba(16,185,129,0.25)',
                                                          borderRadius: 999,
                                          }}
                                        >
                                        <span
                                                        style={{
                                                                          width: 6,
                                                                          height: 6,
                                                                          borderRadius: '50%',
                                                                          background: '#10b981',
                                                                          boxShadow: '0 0 0 2px rgba(16,185,129,0.25)',
                                                        }}
                                                      />
                                        <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>
                                                      실시간 AI 분석
                                        </span>
                            </div>
                        )}
                
                  {/* Header */}
                        <div
                                    style={{
                                                  display: 'flex',
                                                  alignItems: 'flex-start',
                                                  justifyContent: 'space-between',
                                                  marginBottom: 28,
                                                  gap: 16,
                                                  flexWrap: 'wrap',
                                    }}
                                  >
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
                                                                                padding: '8px 16px',
                                                                                background: '#1e293b',
                                                                                color: '#fff',
                                                                                border: 'none',
                                                                                borderRadius: 999,
                                                                                fontSize: 12,
                                                                                fontWeight: 600,
                                                                                cursor: 'pointer',
                                                              }}
                                                            >
                                                            JSON 다운로드
                                              </button>
                                    {hasPlans && (
                                                  <button
                                                                    onClick={() => downloadCSV(result, 'smartstudy-plan.csv')}
                                                                    style={{
                                                                                        padding: '8px 16px',
                                                                                        background: '#10b981',
                                                                                        color: '#fff',
                                                                                        border: 'none',
                                                                                        borderRadius: 999,
                                                                                        fontSize: 12,
                                                                                        fontWeight: 600,
                                                                                        cursor: 'pointer',
                                                                                        boxShadow: '0 4px 10px rgba(16,185,129,0.3)',
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
                                        <pre
                                                        style={{
                                                                          padding: 16,
                                                                          background: '#0f172a',
                                                                          color: '#e5e7eb',
                                                                          borderRadius: 12,
                                                                          fontSize: 12,
                                                                          overflow: 'auto',
                                                                          whiteSpace: 'pre-wrap',
                                                                          margin: 0,
                                                        }}
                                                      >
                                          {result.raw}
                                        </pre>
                            </div>
                        )}
                </div>
          </main>
        );
}
