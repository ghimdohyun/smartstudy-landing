// Pricing section: Beta / Basic / Pro tier comparison

interface Tier {
  name: string;
  price: string;
  period: string;
  desc: string;
  highlight: boolean;
  badge: string;
  features: string[];
  cta: string;
  ctaHref: string;
}

const TIERS: Tier[] = [
  {
    name: '베타',
    price: '무료',
    period: '현재',
    desc: '베타 기간 동안 모든 기능 무료 제공',
    highlight: false,
    badge: '지금 이용 중',
    features: [
      '수강 계획 4안 생성',
      '1년 학습 로드맵',
      'JSON / CSV 내보내기',
      '상담 AI 챗봇',
      '브라우저 저장',
    ],
    cta: '무료로 시작',
    ctaHref: '#service',
  },
  {
    name: '기본',
    price: '₩4,900',
    period: '/ 월',
    desc: '자주 사용하는 개인 사용자에게 적합',
    highlight: true,
    badge: '출시 예정',
    features: [
      '베타 기능 전체 포함',
      '월 30회 계획 생성',
      '계획 히스토리 저장',
      '이메일 내보내기',
    ],
    cta: '알림 신청',
    ctaHref: 'mailto:contact@dreamhelixion.com?subject=기본 플랜 알림 신청',
  },
  {
    name: '프로',
    price: '₩14,900',
    period: '/ 월',
    desc: '스터디 그룹 및 튜터링 센터 대상',
    highlight: false,
    badge: '출시 예정',
    features: [
      '기본 기능 전체 포함',
      '무제한 계획 생성',
      '팀 공유 기능',
      '맞춤 브랜딩',
      '우선 지원',
    ],
    cta: '알림 신청',
    ctaHref: 'mailto:contact@dreamhelixion.com?subject=프로 플랜 알림 신청',
  },
];

export default function PricingSection() {
  return (
    <section
      id="pricing"
      style={{
        padding: '72px 20px 96px',
        background: 'linear-gradient(180deg, transparent 0%, #f5f3ff 100%)',
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <p style={{
            fontSize: 12, fontWeight: 700, color: '#7c3aed',
            textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px',
          }}>
            요금제
          </p>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: '#0f172a',
            margin: '0 0 12px', letterSpacing: '-0.5px',
          }}>
            지금은 모두 무료
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>
            베타 기간 동안 모든 기능을 무료로 이용하세요. 추후 유료 플랜이 출시될 예정입니다.
          </p>
        </div>

        {/* Pricing cards */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 24,
          justifyContent: 'center', alignItems: 'flex-start',
        }}>
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              style={{
                flex: '1 1 260px', maxWidth: 300, minWidth: 240,
                background: tier.highlight
                  ? 'linear-gradient(145deg,#667eea,#764ba2)'
                  : '#fff',
                borderRadius: 20, padding: '32px 24px',
                boxShadow: tier.highlight
                  ? '0 16px 48px rgba(102,126,234,0.4)'
                  : '0 4px 20px rgba(15,23,42,0.07)',
                border: tier.highlight ? 'none' : '1px solid #e5e7eb',
                transform: tier.highlight ? 'scale(1.04)' : 'none',
                position: 'relative',
              }}
            >
              {/* Top badge */}
              <span style={{
                position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                padding: '4px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                background: tier.highlight ? '#fde68a' : '#f1f5f9',
                color: tier.highlight ? '#92400e' : '#64748b',
                whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}>
                {tier.badge}
              </span>

              <p style={{
                fontSize: 13, fontWeight: 700, margin: '0 0 6px',
                color: tier.highlight ? '#c4b5fd' : '#7c3aed',
              }}>
                {tier.name}
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{
                  fontSize: 34, fontWeight: 800,
                  color: tier.highlight ? '#fff' : '#0f172a',
                }}>
                  {tier.price}
                </span>
                <span style={{ fontSize: 13, color: tier.highlight ? '#c4b5fd' : '#9ca3af' }}>
                  {tier.period}
                </span>
              </div>

              <p style={{
                fontSize: 13, margin: '0 0 22px',
                color: tier.highlight ? '#ddd6fe' : '#6b7280',
              }}>
                {tier.desc}
              </p>

              <ul style={{
                margin: '0 0 26px', padding: 0, listStyle: 'none',
                display: 'flex', flexDirection: 'column', gap: 9,
              }}>
                {tier.features.map((f) => (
                  <li key={f} style={{
                    fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                    color: tier.highlight ? '#ede9fe' : '#374151',
                  }}>
                    <span style={{ color: tier.highlight ? '#a5f3fc' : '#10b981', fontWeight: 700 }}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={tier.ctaHref}
                style={{
                  display: 'block', textAlign: 'center',
                  padding: '11px 20px',
                  background: tier.highlight
                    ? '#fff'
                    : 'linear-gradient(135deg,#667eea,#764ba2)',
                  color: tier.highlight ? '#7c3aed' : '#fff',
                  borderRadius: 999, fontSize: 13, fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: tier.highlight
                    ? '0 4px 14px rgba(0,0,0,0.12)'
                    : '0 4px 14px rgba(102,126,234,0.35)',
                }}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
