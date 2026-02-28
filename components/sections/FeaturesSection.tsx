// Features overview section — core value propositions

const FEATURES = [
  {
    icon: '🖼️',
    title: '시간표 이미지 인식',
    desc: '시간표 이미지 URL을 붙여넣으면 AI가 자동으로 분석해 충돌 없는 계획을 수립합니다.',
    badge: 'AI 분석',
    badgeBg: '#ede9fe', badgeColor: '#7c3aed',
  },
  {
    icon: '📋',
    title: '4가지 맞춤 플랜',
    desc: '학점 극대화 / 진로 집중 / 균형 / 여유 등 서로 다른 전략의 Plan A~D를 한 번에 비교하세요.',
    badge: '핵심 기능',
    badgeBg: '#dbeafe', badgeColor: '#1d4ed8',
  },
  {
    icon: '🗓️',
    title: '1년 학습 로드맵',
    desc: '1학기·2학기 목표, 월별 마일스톤, 주간 루틴까지 포함된 완전한 1년 계획을 생성합니다.',
    badge: '1년 플래닝',
    badgeBg: '#dcfce7', badgeColor: '#166534',
  },
  {
    icon: '⬇️',
    title: 'JSON / CSV 내보내기',
    desc: '생성된 계획을 JSON 또는 Excel 호환 CSV로 다운로드해 어디서든 활용하세요.',
    badge: '내보내기',
    badgeBg: '#ffedd5', badgeColor: '#c2410c',
  },
  {
    icon: '💬',
    title: '상담 AI 챗봇',
    desc: '수강 신청, 학점 계산, 진로 선택 등 궁금한 점을 실시간으로 물어보세요.',
    badge: '24/7 상담',
    badgeBg: '#fef9c3', badgeColor: '#854d0e',
  },
  {
    icon: '🔒',
    title: '로그인 불필요',
    desc: '회원가입 없이 바로 사용할 수 있습니다. 생성 결과는 브라우저에 안전하게 저장됩니다.',
    badge: '즉시 사용',
    badgeBg: '#f0fdf4', badgeColor: '#166534',
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      style={{
        padding: '72px 20px',
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <p style={{
            fontSize: 12, fontWeight: 700, color: '#7c3aed',
            textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px',
          }}>
            기능 소개
          </p>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: '#0f172a',
            margin: '0 0 14px', letterSpacing: '-0.5px',
          }}>
            하나의 서비스로 모든 수강 고민 해결
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            AI가 학생의 상황을 분석해 최적의 수강 계획을 자동으로 만들어드립니다.
          </p>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                flex: '1 1 280px', minWidth: 0,
                background: '#fff', borderRadius: 16, padding: '22px 20px',
                boxShadow: '0 2px 16px rgba(15,23,42,0.06)',
                border: '1px solid #f1f5f9',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12, lineHeight: 1 }}>{f.icon}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
                  {f.title}
                </h3>
                <span style={{
                  padding: '2px 9px', background: f.badgeBg, color: f.badgeColor,
                  borderRadius: 999, fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {f.badge}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.65 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
