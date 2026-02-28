// Study plan input form component

'use client';

import { useState } from 'react';
import type { StudyPlanInput } from '@/types';

interface Props {
  onSubmit: (input: StudyPlanInput) => void;
  loading: boolean;
  status: string;
  error: string | null;
}

export default function StudyPlanForm({ onSubmit, loading, status, error }: Props) {
  const [mode, setMode] = useState<'plans' | 'year'>('plans');
  const [studentInfo, setStudentInfo] = useState('');
  const [timetableInfo, setTimetableInfo] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleSubmit = () => {
    onSubmit({ studentInfo, timetableInfo, imageUrl, mode });
  };

  const isPlansMode = mode === 'plans';

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{
          background: '#fff', borderRadius: 999, padding: 4,
          boxShadow: '0 10px 25px rgba(15,23,42,0.08)', display: 'inline-flex',
        }}>
          {(['plans', 'year'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                border: 'none', outline: 'none',
                padding: '8px 18px', borderRadius: 999,
                fontSize: 13, fontWeight: mode === m ? 600 : 500,
                cursor: 'pointer',
                background: mode === m ? '#10b981' : 'transparent',
                color: mode === m ? '#fff' : '#6b7280',
                boxShadow: mode === m ? '0 6px 12px rgba(16,185,129,0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {m === 'plans' ? '수강 계획표 (Plan A~D)' : '1년 학습 계획표'}
            </button>
          ))}
        </div>
      </div>

      {/* Form card */}
      <div style={{
        background: '#fff', borderRadius: 16,
        boxShadow: '0 18px 40px rgba(15,23,42,0.09)', padding: '20px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 999, background: '#ecfdf5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8,
          }}>
            <span style={{ fontSize: 16, color: '#10b981' }}>★</span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            {isPlansMode ? '수강 계획표 입력' : '1년 학습 계획표 입력'}
          </h2>
        </div>

        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
          {isPlansMode
            ? '아래 두 칸에 내용을 최대한 자세히 적을수록 더 정확한 수강 계획 4안이 만들어집니다.'
            : '1년 동안의 목표, 시간표, 동아리/인턴 계획 등을 적으면 학습 로드맵을 생성합니다.'}
        </p>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            학생 정보
          </label>
          <textarea
            rows={4}
            value={studentInfo}
            onChange={(e) => setStudentInfo(e.target.value)}
            style={{
              width: '100%', padding: 10, fontSize: 13,
              border: '1px solid #d1d5db', borderRadius: 10,
              resize: 'vertical', boxSizing: 'border-box',
            }}
            placeholder={'- 학교/학과/학년\n- 이번 학기 목표 학점\n- 진로/관심 분야 등'}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            시간표/지침서 설명
          </label>
          <textarea
            rows={4}
            value={timetableInfo}
            onChange={(e) => setTimetableInfo(e.target.value)}
            style={{
              width: '100%', padding: 10, fontSize: 13,
              border: '1px solid #d1d5db', borderRadius: 10,
              resize: 'vertical', boxSizing: 'border-box',
            }}
            placeholder={'- 현재(또는 희망) 시간표\n- 꼭 듣고 싶은/피하고 싶은 과목\n- 기타 조건 등을 적어주세요.'}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            시간표 이미지 URL (선택)
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', fontSize: 12,
              border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box',
            }}
            placeholder="예: https://example.com/timetable.png"
          />
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
            이미지를 웹에 업로드한 뒤, 해당 이미지의 직접 주소를 붙여넣어 주세요. (입력하지 않아도 동작합니다)
          </p>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '10px 12px',
              border: 'none', borderRadius: 999,
              background: loading ? '#9ca3af' : '#10b981',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 12px 22px rgba(16,185,129,0.35)',
            }}
          >
            {loading ? '생성 중...' : 'AI 결과 생성하기'}
          </button>

          {(status || error) && (
            <div style={{ marginTop: 6, fontSize: 12, color: error ? '#ef4444' : '#4b5563' }}>
              {error ?? status}
            </div>
          )}
        </div>

        <div style={{
          marginTop: 12, padding: 10, borderRadius: 10,
          background: '#ecfdf5', border: '1px solid #bbf7d0',
          fontSize: 11, color: '#166534', lineHeight: 1.6,
        }}>
          {isPlansMode ? (
            <>
              • Plan A~D는 서로 다른 전략의 시간표를 제안합니다.<br />
              • 1년 계획(yearPlan)에는 1학기/2학기 목표와 추천 과목이 함께 들어갑니다.
            </>
          ) : (
            <>• 1학기/2학기 별 학습 목표와 전략, 주간 루틴, 마일스톤, 리스크 대응까지 JSON으로 내려갑니다.</>
          )}
        </div>
      </div>
    </div>
  );
}
