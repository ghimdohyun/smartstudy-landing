// Hero section — new slogan + sub-copy, dark-mode text contrast

const MOCK_PLANS = [
  { label: 'Plan A', bg: '#dbeafe', color: '#1d4ed8', text: '학점 극대화 전략 — 18학점' },
  { label: 'Plan B', bg: '#dcfce7', color: '#166534', text: '진로 집중 전략 — 15학점' },
  { label: 'Plan C', bg: '#f3e8ff', color: '#7e22ce', text: '균형 전략 — 16학점' },
  { label: 'Plan D', bg: '#ffedd5', color: '#c2410c', text: '여유 전략 — 12학점' },
];

export default function HeroSection() {
  return (
    <section
      className="py-[clamp(56px,10vw,96px)] px-5 pb-16 text-center
                 bg-gradient-to-b from-[#f0f4ff] to-transparent
                 dark:from-slate-950 dark:to-transparent"
      style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Beta badge */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 mb-7
                        bg-violet-100 dark:bg-violet-900/40 rounded-full
                        text-[12px] text-violet-700 dark:text-violet-300 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400 inline-block" />
          베타 무료 이용 중
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(28px,6vw,52px)] font-extrabold leading-[1.18]
                       tracking-tight m-0 mb-5
                       text-slate-900 dark:text-white">
          시간표 사진만 올리면,
          <br />
          <span style={{
            background: 'linear-gradient(135deg,#667eea 20%,#a855f7 80%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            1년치 전공·교양
          </span>{' '}
          수강 계획 4안 자동 생성
        </h1>

        {/* Sub-copy */}
        <p className="text-[17px] leading-[1.75] m-0 mb-2 max-w-[520px] mx-auto
                      text-slate-600 dark:text-slate-300">
          잘 짠 시간표 하나가 학점을 바꿉니다.
        </p>
        <p className="text-[17px] leading-[1.75] m-0 mb-11 max-w-[520px] mx-auto
                      text-slate-600 dark:text-slate-300">
          AI 최적화로{' '}
          <strong className="text-slate-800 dark:text-slate-100">공강은 늘리고</strong>{' '}
          <strong className="text-slate-800 dark:text-slate-100">성적은 높이세요.</strong>
        </p>

        {/* CTA buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
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
            className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                       border border-slate-200 dark:border-slate-700"
            style={{
              padding: '14px 28px', borderRadius: 999, fontSize: 15, fontWeight: 600,
              textDecoration: 'none', display: 'inline-block',
            }}
          >
            기능 살펴보기
          </a>
        </div>

        {/* Trust bar */}
        <p className="mt-6 text-[13px] text-slate-400 dark:text-slate-500">
          ✦ 지금 바로 사용 가능 &nbsp;·&nbsp; 회원가입 불필요 &nbsp;·&nbsp; 베타 무료
        </p>

        {/* Mock UI preview */}
        <div
          className="mt-14 bg-white dark:bg-slate-900 rounded-2xl text-left mx-auto
                     border border-slate-200 dark:border-slate-700"
          style={{
            maxWidth: 480,
            boxShadow: '0 28px 80px rgba(15,23,42,0.12), 0 4px 16px rgba(102,126,234,0.08)',
            padding: '18px 20px',
          }}
        >
          {/* Window dots */}
          <div className="flex gap-1.5 mb-4">
            {['#ff5f57', '#ffbd2e', '#28c940'].map((c) => (
              <span key={c} className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />
            ))}
          </div>
          {/* Mock plan rows */}
          {MOCK_PLANS.map(({ label, bg, color, text }) => (
            <div key={label}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2
                         bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0"
                style={{ background: bg, color }}>
                {label}
              </span>
              <span className="text-[12px] text-slate-700 dark:text-slate-300">{text}</span>
            </div>
          ))}
          <div className="mt-1 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl
                          text-[12px] text-emerald-700 dark:text-emerald-400 font-medium">
            ✓ 1년 학습 로드맵 생성 완료
          </div>
        </div>
      </div>
    </section>
  );
}
