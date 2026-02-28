// Site header: sticky, glass-morphism, responsive at 640 px breakpoint

'use client';

import Link from 'next/link';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        padding: '6px 12px', fontSize: 13, fontWeight: 500,
        color: '#4b5563', textDecoration: 'none', borderRadius: 8,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
      onMouseLeave={(e) => (e.currentTarget.style.color = '#4b5563')}
    >
      {children}
    </a>
  );
}

export default function Header() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '0 20px',
        display: 'flex', alignItems: 'center', height: 60, gap: 8,
      }}>
        {/* Logo */}
        <Link
          href="/"
          style={{
            textDecoration: 'none', display: 'flex',
            alignItems: 'center', gap: 8, marginRight: 8, flexShrink: 0,
          }}
        >
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg,#667eea,#764ba2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#fff', fontWeight: 800,
          }}>
            DH
          </span>
          <span style={{
            fontSize: 15, fontWeight: 700, color: '#111827',
            letterSpacing: '-0.3px', whiteSpace: 'nowrap',
          }}>
            Dream Helixion
          </span>
        </Link>

        {/* Desktop nav — hidden below 640 px via .dh-nav in globals.css */}
        <nav className="dh-nav" style={{ alignItems: 'center', flex: 1 }}>
          <NavLink href="/#features">기능</NavLink>
          <NavLink href="/#pricing">가격</NavLink>
          <NavLink href="/#faq">FAQ</NavLink>
        </nav>

        {/* Spacer on mobile so CTA stays right-aligned */}
        <div style={{ flex: 1 }} className="dh-nav" />

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Login (disabled) — hidden on mobile */}
          <button
            disabled
            title="로그인 기능 준비 중"
            className="dh-login"
            style={{
              padding: '7px 16px', background: 'transparent',
              color: '#9ca3af', borderRadius: 999, fontSize: 13, fontWeight: 500,
              border: '1.5px solid #e5e7eb', cursor: 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            로그인 (준비 중)
          </button>

          {/* Primary CTA — always visible */}
          <a
            href="/#service"
            style={{
              padding: '7px 18px',
              background: 'linear-gradient(135deg,#667eea,#764ba2)',
              color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', flexShrink: 0,
              boxShadow: '0 4px 14px rgba(102,126,234,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            지금 시작하기
          </a>
        </div>
      </div>
    </header>
  );
}
