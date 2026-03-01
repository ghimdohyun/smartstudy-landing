// Site footer with links and copyright

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-slate-800 py-9 px-5 bg-gray-50 dark:bg-slate-950"
      style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div className="max-w-[1100px] mx-auto flex flex-wrap gap-5 justify-between items-center">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-[6px] flex items-center justify-center text-[11px] text-white font-extrabold shrink-0"
              style={{ background: "linear-gradient(135deg,#667eea,#764ba2)" }}>
              DH
            </span>
            <span className="text-[14px] font-bold text-gray-900 dark:text-gray-100">Dream Helixion</span>
          </div>
          <p className="m-0 text-[12px] text-gray-400 dark:text-gray-500">
            AI 기반 수강 계획 서비스 — 현재 베타 운영 중
          </p>
        </div>

        {/* Links */}
        <div className="flex gap-5 text-[12px]">
          <a href="/terms"    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 no-underline transition-colors">이용약관</a>
          <a href="/privacy"  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 no-underline transition-colors">개인정보처리방침</a>
          <a href="mailto:contact@dreamhelixion.com"
             className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 no-underline transition-colors">문의하기</a>
        </div>

        {/* Copyright */}
        <p className="m-0 text-[12px] text-gray-400 dark:text-gray-600">
          © 2026 Dream Helixion. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
