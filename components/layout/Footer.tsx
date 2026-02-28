// Site footer with links and copyright

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #e5e7eb',
      padding: '36px 20px',
      background: '#f9fafb',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', flexWrap: 'wrap', gap: 20,
        justifyContent: 'space-between', alignItems: 'center',
      }}>
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'linear-gradient(135deg,#667eea,#764ba2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#fff', fontWeight: 800,
            }}>
              DH
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Dream Helixion</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
            AI 기반 수강 계획 서비스 — 현재 베타 운영 중
          </p>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
          <a href="/terms" style={{ color: '#6b7280', textDecoration: 'none' }}>이용약관</a>
          <a href="/privacy" style={{ color: '#6b7280', textDecoration: 'none' }}>개인정보처리방침</a>
          <a
            href="mailto:contact@dreamhelixion.com"
            style={{ color: '#6b7280', textDecoration: 'none' }}
          >
            문의하기
          </a>
        </div>

        {/* Copyright */}
        <p style={{ margin: 0, fontSize: 12, color: '#d1d5db' }}>
          © 2026 Dream Helixion. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
