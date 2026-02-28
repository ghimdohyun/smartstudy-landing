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
      background: '#fff', borderRadius: 16,
      boxShadow: '0 4px 24px rgba(15,23,42,0.08)',
      border: `1px solid ${color.border}`,
      padding: 20, flex: '1 1 280px', minWidth: 0,
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
                <span style={{ fontWeight: 500, color: '#111827' }}>{course.name}</span>
                {(course.code ?? course.requirement) && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {course.code && (
                      <span style={{
                        fontSize: 10, padding: '1px 5px',
                        background: '#f1f5f9', color: '#475569', borderRadius: 3,
                        fontFamily: 'ui-monospace, monospace',
                      }}>
                        {course.code}
                      </span>
                    )}
                    {course.requirement && (
                      <span style={{
                        fontSize: 10, padding: '1px 5px',
                        background: course.requirement.includes('필수') ? '#fef2f2' : '#f0fdf4',
                        color: course.requirement.includes('필수') ? '#b91c1c' : '#166534',
                        borderRadius: 3,
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
                    fontSize: 11, padding: '2px 6px',
                    background: color.badge, color: color.badgeText, borderRadius: 4,
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
