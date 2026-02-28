// Year plan view component for SmartStudy — renders semesters with monthly goals timeline

'use client';

import { useState } from 'react';
import type { YearPlan, MonthlyGoal, SemesterDetail } from '@/types';

interface Props {
  yearPlan: YearPlan;
}

const SEMESTER_ACCENTS = ['#3b82f6', '#10b981', '#a855f7', '#f97316'];
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function MonthTimeline({ monthlyGoals }: { monthlyGoals: MonthlyGoal[] }) {
  if (monthlyGoals.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 8px' }}>월별 목표</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {monthlyGoals.map((mg) => (
          <div key={mg.month} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            {/* Month dot + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 28 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#e0e7ff', color: '#4338ca',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {MONTH_NAMES[(mg.month - 1) % 12]}
              </span>
            </div>
            {/* Goal + tasks */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              {mg.goal && (
                <p style={{ margin: 0, fontSize: 12, color: '#111827', fontWeight: 500 }}>{mg.goal}</p>
              )}
              {(mg.tasks ?? []).length > 0 && (
                <ul style={{ margin: '3px 0 0', padding: '0 0 0 14px', fontSize: 11, color: '#6b7280' }}>
                  {(mg.tasks ?? []).map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_LABELS = ['1학기 (봄)', '2학기 (가을)'];

export default function YearPlanView({ yearPlan }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  // Cast to SemesterDetail[] at runtime to safely access monthlyGoals
  const semesters = (yearPlan.semesters ?? []) as SemesterDetail[];
  const sem = semesters[activeTab] ?? semesters[0];
  const accent = SEMESTER_ACCENTS[activeTab % SEMESTER_ACCENTS.length];

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 16, marginTop: 0 }}>
        1년 학습 로드맵
        {yearPlan.year && (
          <span style={{ fontSize: 14, color: '#6b7280', marginLeft: 8, fontWeight: 400 }}>
            {yearPlan.year}
          </span>
        )}
      </h2>

      {semesters.length > 0 && (
        <>
          {/* ── Pill-style tab switcher ── */}
          {semesters.length > 1 && (
            <div style={{
              display: 'inline-flex', gap: 4,
              background: '#f1f5f9', borderRadius: 14, padding: 4,
              marginBottom: 16,
            }}>
              {TAB_LABELS.slice(0, semesters.length).map((label, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  style={{
                    padding: '8px 20px', borderRadius: 10, border: 'none',
                    background: activeTab === i ? '#fff' : 'transparent',
                    boxShadow: activeTab === i ? '0 2px 8px rgba(15,23,42,0.10)' : 'none',
                    color: activeTab === i ? '#111827' : '#6b7280',
                    fontWeight: activeTab === i ? 700 : 500,
                    fontSize: 13, cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Active semester panel ── */}
          {sem && (
            <div style={{
              background: '#fff', borderRadius: 20, padding: 24,
              boxShadow: '0 2px 8px rgba(15,23,42,0.05), 0 12px 32px rgba(15,23,42,0.06)',
              borderTop: `4px solid ${accent}`,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: 10 }}>
                {sem.semester ?? `${activeTab + 1}학기`}
              </h3>

              {sem.goal && (
                <p style={{
                  fontSize: 14, color: '#374151', margin: '0 0 14px',
                  padding: '10px 14px',
                  background: `${accent}12`,
                  borderRadius: 10, borderLeft: `3px solid ${accent}`,
                }}>
                  {sem.goal}
                </p>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                {/* Recommended courses */}
                {(sem.recommendedCourses ?? []).length > 0 && (
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>추천 과목</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(sem.recommendedCourses ?? []).map((c, j) => (
                        <span key={j} style={{
                          fontSize: 12, padding: '4px 10px',
                          background: '#f1f5f9', color: '#374151',
                          borderRadius: 999, fontWeight: 500,
                        }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Milestones */}
                {(sem.milestones ?? []).length > 0 && (
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>마일스톤</p>
                    <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                      {(sem.milestones ?? []).map((m, j) => <li key={j}>{m}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {sem.weeklyRoutine && (
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '14px 0 0' }}>
                  주간 루틴: {sem.weeklyRoutine}
                </p>
              )}

              {(sem.monthlyGoals ?? []).length > 0 && (
                <MonthTimeline monthlyGoals={sem.monthlyGoals!} />
              )}
            </div>
          )}
        </>
      )}

      {(yearPlan.risks ?? []).length > 0 && (
        <div style={{
          marginTop: 16, padding: 14, background: '#fff7ed',
          borderRadius: 12, border: '1px solid #fed7aa',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#c2410c', margin: '0 0 6px' }}>리스크 대응</p>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: '#374151' }}>
            {(yearPlan.risks ?? []).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {yearPlan.note && (
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>{yearPlan.note}</p>
      )}
    </div>
  );
}
