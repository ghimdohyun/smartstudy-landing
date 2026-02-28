// Individual Plan A/B/C/D card for the /plan page

'use client';

import type { StudyPlan } from '@/types';

interface Props {
  plan: StudyPlan;
  index: number;
}

const PLAN_COLORS = [
  { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6', badge: '#dbeafe', badgeText: '#1d4ed8' },
  { bg: '#f0fdf4', border: '#bbf7d0', accent: '#10b981', badge: '#dcfce7', badgeText: '#166534' },
  { bg: '#fdf4ff', border: '#e9d5ff', accent: '#a855f7', badge: '#f3e8ff', badgeText: '#7e22ce' },
  { bg: '#fff7ed', border: '#fed7aa', accent: '#f97316', badge: '#ffedd5', badgeText: '#c2410c' },
];

export default function PlanCard({ plan, index }: Props) {
  const color = PLAN_COLORS[index % PLAN_COLORS.length];

  return (
    <div style={{
      background: '#fff', borderRadius: 20,
      boxShadow: '0 2px 8px rgba(15,23,42,0.05), 0 12px 32px rgba(15,23,42,0.06)',
      border: `1px solid ${color.border}`,
      padding: 24, flex: '1 1 280px', minWidth: 0,
    }}>
      {/* Plan label + credits */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 10 }}>
        <span style={{
          padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
          background: color.badge, color: color.badgeText,
        }}>
          {plan.label ?? `Plan ${String.fromCharCode(65 + index)}`}
        </span>
        {plan.totalCredits !== undefined && (
          <span style={{ fontSize: 12, color: '#6b7280' }}>총 {plan.totalCredits}학점</span>
        )}
      </div>

      {/* Strategy */}
      {plan.strategy && (
        <p style={{
          fontSize: 13, color: '#374151', margin: '0 0 12px',
          padding: '8px 12px', background: color.bg,
          borderRadius: 8, borderLeft: `3px solid ${color.accent}`,
        }}>
          {plan.strategy}
        </p>
      )}

      {/* Course list */}
      {(plan.courses ?? []).length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(plan.courses ?? []).map((course, i) => (
            <li key={i} style={{
              fontSize: 13, padding: '6px 10px',
              background: '#f9fafb', borderRadius: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: '#111827' }}>{course.name}</span>
                {(course.code ?? course.requirement) && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {course.code && (
                      <span style={{
                        fontSize: 10, padding: '2px 6px',
                        background: '#f1f5f9', color: '#475569', borderRadius: 4,
                        fontFamily: 'ui-monospace, monospace', letterSpacing: '0.02em',
                      }}>
                        {course.code}
                      </span>
                    )}
                    {course.requirement && (
                      <span style={{
                        fontSize: 10, padding: '2px 6px',
                        /* 공통필수(COR) → Sogang crimson, 선택 → green, 전공필수 → indigo */
                        background: course.requirement.includes('공통필수') ? '#fde8eb'
                          : course.requirement.includes('필수') ? '#eef2ff'
                          : '#f0fdf4',
                        color: course.requirement.includes('공통필수') ? '#b5152b'
                          : course.requirement.includes('필수') ? '#4338ca'
                          : '#166534',
                        borderRadius: 4, fontWeight: 600,
                      }}>
                        {course.requirement}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {course.credits !== undefined && (
                  <span style={{
                    fontSize: 12, padding: '2px 8px',
                    background: color.badge, color: color.badgeText,
                    borderRadius: 999, fontWeight: 700,
                  }}>
                    {course.credits}학점
                  </span>
                )}
                {course.day && (
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{course.day}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Note */}
      {plan.note && (
        <p style={{ fontSize: 11, color: '#9ca3af', margin: '10px 0 0' }}>{plan.note}</p>
      )}
    </div>
  );
}
