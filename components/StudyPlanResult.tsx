// Raw JSON result viewer for study plan output

'use client';

import Link from 'next/link';
import type { StudyPlanResult } from '@/types';

interface Props {
  result: StudyPlanResult | null;
}

const PLACEHOLDER =
  '{/* 아직 생성된 내용이 없습니다. 좌측에서 정보를 입력하고 [AI 결과 생성하기] 버튼을 눌러보세요. */}';

export default function StudyPlanResult({ result }: Props) {
  const displayText = result
    ? JSON.stringify({ plans: result.plans, yearPlan: result.yearPlan }, null, 2)
    : PLACEHOLDER;

  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      boxShadow: '0 18px 40px rgba(15,23,42,0.08)', padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 26, height: 26, borderRadius: 999, background: '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8,
          }}>
            <span style={{ fontSize: 15, color: '#3b82f6' }}>✓</span>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
            생성된 수강 계획 JSON
          </h3>
        </div>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Plan A~D / yearPlan 구조</span>
      </div>

      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>
        Plan A~D와 yearPlan 구조로 된 JSON을 그대로 내려보냅니다. 오류가 나면 원문 응답이 표시됩니다.
      </p>

      <pre style={{
        marginTop: 8, padding: 10, borderRadius: 10,
        background: '#0f172a', color: '#e5e7eb', fontSize: 11,
        maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap',
        fontFamily: "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace",
        margin: 0,
      }}>
        {displayText}
      </pre>

      {result && (
        <div style={{ marginTop: 12 }}>
          <Link
            href="/plan"
            style={{
              display: 'inline-block', padding: '8px 18px',
              background: '#6366f1', color: '#fff', borderRadius: 999,
              fontSize: 12, fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 6px 12px rgba(99,102,241,0.3)',
            }}
          >
            플랜 상세 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
