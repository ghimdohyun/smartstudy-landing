// FAQ section: accordion-style frequently asked questions

'use client';

import { useState } from 'react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'Dream Helixion은 어떤 서비스인가요?',
    a: '학생 정보와 시간표를 입력하면 AI가 서로 다른 전략의 수강 계획 4안(Plan A~D)과 1년 학습 로드맵을 즉시 생성해 드리는 서비스입니다.',
  },
  {
    q: '회원가입 없이 사용할 수 있나요?',
    a: '네, 현재 베타 기간에는 회원가입 없이 바로 사용하실 수 있습니다. 생성된 결과는 브라우저의 로컬 스토리지에 저장됩니다.',
  },
  {
    q: '시간표 이미지를 어떻게 사용하나요?',
    a: '시간표 이미지를 웹에 업로드한 뒤(예: Imgur, Google Drive 공유링크) 해당 이미지의 직접 주소(URL)를 입력란에 붙여넣으면 AI가 자동으로 분석합니다.',
  },
  {
    q: '어떤 학교 과목을 지원하나요?',
    a: '현재는 서강대학교 교과목 편성표(COR/LCS/HFS 코드 체계)를 기반으로 최적화되어 있습니다. 다른 학교도 학생 정보와 시간표 정보를 상세히 입력하면 활용 가능합니다.',
  },
  {
    q: 'JSON / CSV 내보내기는 어떻게 사용하나요?',
    a: '계획 생성 완료 후 /plan 페이지에서 \'JSON 다운로드\' 또는 \'CSV 다운로드\' 버튼을 클릭하면 됩니다. CSV 파일은 Excel에서 한글이 깨지지 않도록 BOM이 포함되어 있습니다.',
  },
  {
    q: '유료 플랜은 언제 출시되나요?',
    a: '베타 기간 이후 기본 플랜(₩4,900/월)과 프로 플랜(₩14,900/월)이 출시될 예정입니다. 출시 알림을 받으시려면 contact@dreamhelixion.com으로 이메일을 보내주세요.',
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id="faq"
      style={{
        padding: '72px 20px',
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{
            fontSize: 12, fontWeight: 700, color: '#7c3aed',
            textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px',
          }}>
            자주 묻는 질문
          </p>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800, color: '#0f172a',
            margin: '0 0 12px', letterSpacing: '-0.5px',
          }}>
            FAQ
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            궁금한 점이 더 있다면 우측 하단 상담 AI에게 물어보세요.
          </p>
        </div>

        {/* Accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                style={{
                  background: '#fff', borderRadius: 14,
                  border: `1px solid ${isOpen ? '#c4b5fd' : '#e5e7eb'}`,
                  boxShadow: isOpen ? '0 4px 20px rgba(124,58,237,0.08)' : '0 1px 4px rgba(15,23,42,0.04)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Question row */}
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  style={{
                    width: '100%', padding: '18px 20px',
                    background: 'transparent', border: 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', gap: 12, textAlign: 'left',
                  }}
                >
                  <span style={{
                    fontSize: 14, fontWeight: 600,
                    color: isOpen ? '#7c3aed' : '#111827', lineHeight: 1.5,
                  }}>
                    {item.q}
                  </span>
                  <span style={{
                    fontSize: 18, color: isOpen ? '#7c3aed' : '#9ca3af',
                    flexShrink: 0, transform: isOpen ? 'rotate(45deg)' : 'none',
                    transition: 'transform 0.2s',
                    display: 'inline-block',
                  }}>
                    +
                  </span>
                </button>

                {/* Answer */}
                {isOpen && (
                  <div style={{
                    padding: '0 20px 18px',
                    fontSize: 14, color: '#4b5563', lineHeight: 1.75,
                    borderTop: '1px solid #f3f4f6',
                  }}>
                    <p style={{ margin: '14px 0 0' }}>{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
