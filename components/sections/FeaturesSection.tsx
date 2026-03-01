// Features overview section — core value propositions, dark mode aware

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
      className="py-[72px] px-5 bg-white dark:bg-slate-950"
      style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
    >
      <div className="max-w-[1000px] mx-auto">
        {/* Heading */}
        <div className="text-center mb-13">
          <p className="text-[12px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-[0.1em] m-0 mb-3">
            기능 소개
          </p>
          <h2 className="text-[clamp(24px,4vw,36px)] font-extrabold text-gray-900 dark:text-white m-0 mb-3.5 tracking-tight">
            하나의 서비스로 모든 수강 고민 해결
          </h2>
          <p className="text-[15px] text-slate-500 dark:text-slate-300 m-0 max-w-[480px] mx-auto">
            AI가 학생의 상황을 분석해 최적의 수강 계획을 자동으로 만들어드립니다.
          </p>
        </div>

        {/* Feature grid */}
        <div className="flex flex-wrap gap-5 mt-13">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex-1 min-w-[280px] bg-white dark:bg-slate-900 rounded-2xl p-[22px_20px]
                         border border-slate-100 dark:border-slate-800
                         shadow-[0_2px_16px_rgba(15,23,42,0.06)] dark:shadow-[0_2px_16px_rgba(15,23,42,0.3)]"
            >
              <div className="text-[28px] mb-3 leading-none">{f.icon}</div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white m-0">
                  {f.title}
                </h3>
                <span className="px-[9px] py-[2px] rounded-full text-[10px] font-bold shrink-0"
                  style={{ background: f.badgeBg, color: f.badgeColor }}>
                  {f.badge}
                </span>
              </div>
              <p className="text-[13px] text-slate-500 dark:text-slate-300 m-0 leading-[1.65]">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
