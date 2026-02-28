// Hero section: headline, CTA, and mock plan preview

const MOCK_PLANS = [
  { label: 'Plan A', bg: '#dbeafe', color: '#1d4ed8', text: '학점 극대화 전략 — 18학점' },
  { label: 'Plan B', bg: '#dcfce7', color: '#166534', text: '진로 집중 전략 — 15학점' },
  { label: 'Plan C', bg: '#f3e8ff', color: '#7e22ce', text: '균형 전략 — 16학점' },
  { label: 'Plan D', bg: '#ffedd5', color: '#c2410c', text: '여유 전략 — 12학점' },
];

export default function HeroSection() {
  return (
    <section style={{
      padding: 'clamp(56px, 10vw, 96px) 20px 64px',
      textAlign: 'center',
      background: 'linear-gradient(180deg, #f0f4ff 0%, rgba(240,244,255,0) 100%)',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Beta badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 16px', background: '#ede9fe',
          borderRadius: 999, fontSize: 12, color: '#7c3aed', fontWeight: 600, marginBottom: 28,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', display: 'inline-block',
          }} />
          베타 무료 이용 중
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(32px, 7vw, 56px)', fontWeight: 800,
          color: '#0f172a', lineHeight: 1.18, margin: '0 0 20px',
          letterSpacing: '-1.5px',
        }}>
          AI 수강 계획,<br />
          <span style={{
            background: 'linear-gradient(135deg,#667eea 20%,#a855f7 80%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            5분이면 완성
          </span>
        </h1>

        {/* Subtext */}
        <p style={{
          fontSize: 17, color: '#475569', lineHeight: 1.75,
          margin: '0 auto 44px', maxWidth: 520,
        }}>
          학생 정보와 희망 시간표를 입력하면 서로 다른 전략의{' '}
          <strong style={{ color: '#374151' }}>수강 계획 4안</strong>과{' '}
          <strong style={{ color: '#374151' }}>1년 학습 로드맵</strong>을 즉시 생성합니다.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="#service"
            style={{
              padding: '14px 34px',
              background: 'linear-gradient(135deg,#667eea,#764ba2)',
              color: '#fff', borderRadius: 999, fontSize: 15, fontWeight: 700,
              textDecoration: 'none', display: 'inline-block',
              boxShadow: '0 8px 28px rgba(102,126,234,0.45)',
            }}
          >
            무료로 시작하기 →
          </a>
          <a
            href="#features"
            style={{
              padding: '14px 28px', background: '#fff', color: '#374151',
              border: '1.5px solid #e2e8f0', borderRadius: 999, fontSize: 15, fontWeight: 600,
              textDecoration: 'none', display: 'inline-block',
            }}
          >
            기능 살펴보기
          </a>
        </div>

        {/* Trust bar */}
        <p style={{ marginTop: 24, fontSize: 13, color: '#94a3b8' }}>
          ✦ 지금 바로 사용 가능 &nbsp;·&nbsp; 회원가입 불필요 &nbsp;·&nbsp; 베타 무료
        </p>

        {/* Mock UI preview */}
        <div style={{
          marginTop: 52, background: '#fff', borderRadius: 20,
          boxShadow: '0 28px 80px rgba(15,23,42,0.12), 0 4px 16px rgba(102,126,234,0.08)',
          padding: '18px 20px', textAlign: 'left', maxWidth: 480, margin: '52px auto 0',
          border: '1px solid #e2e8f0',
        }}>
          {/* Window dots */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['#ff5f57', '#ffbd2e', '#28c940'].map((c) => (
              <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
            ))}
          </div>
          {/* Mock plan rows */}
          {MOCK_PLANS.map(({ label, bg, color, text }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', background: '#f9fafb',
              borderRadius: 10, marginBottom: 7,
            }}>
              <span style={{
                padding: '3px 11px', background: bg, color, borderRadius: 999,
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {label}
              </span>
              <span style={{ fontSize: 12, color: '#374151' }}>{text}</span>
            </div>
          ))}
          <div style={{
            marginTop: 4, padding: '8px 12px', background: '#f0fdf4',
            borderRadius: 10, fontSize: 12, color: '#166534', fontWeight: 500,
          }}>
            ✓ 1년 학습 로드맵 생성 완료
          </div>
        </div>
      </div>
    </section>
  );
}
