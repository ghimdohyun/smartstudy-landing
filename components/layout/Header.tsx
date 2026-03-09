// Site header: sticky glassmorphism, responsive at 640 px, dark mode aware
"use client";

import Image from "next/image";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

const LOGO_URL =
  "https://i.ibb.co/8LDvhYvw/Gemini-Generated-Image-ol8g0jol8g0jol8g.png";

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white rounded-lg transition-colors no-underline"
    >
      {children}
    </a>
  );
}

export default function Header() {
  return (
    <header
      className={cn(
        "sticky top-0 z-50",
        "bg-white/90 dark:bg-neutral-950/90",
        "backdrop-blur-[14px]",
        "border-b border-black/[0.07] dark:border-white/[0.08]"
      )}
    >
      <div className="max-w-[1100px] mx-auto px-5 flex items-center h-[60px] gap-2">
        {/* Logo — hard navigation clears plan state for a fresh start */}
        <a
          href="/"
          onClick={() => {
            try {
              localStorage.removeItem("smartstudy_result");
              localStorage.removeItem("smartstudy_last_input");
            } catch { /* ignore */ }
          }}
          className="flex items-center gap-2 mr-2 shrink-0 no-underline"
        >
          <Image
            src={LOGO_URL}
            alt="Dream Helixion"
            width={32}
            height={32}
            className="rounded-lg shadow-sm"
            unoptimized
          />
          <span className="text-[15px] font-bold text-gray-900 dark:text-gray-100 tracking-tight whitespace-nowrap">
            Dream Helixion
          </span>
        </a>

        {/* Desktop nav — hidden below 640 px via .dh-nav in globals.css */}
        <nav className="dh-nav items-center flex-1">
          <NavLink href="/#features">기능</NavLink>
          <NavLink href="/#pricing">가격</NavLink>
          <NavLink href="/#faq">FAQ</NavLink>
        </nav>

        {/* Spacer on mobile */}
        <div className="flex-1 dh-nav" />

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <ModeToggle />

          {/* Login (disabled) — hidden on mobile */}
          <button
            disabled
            title="로그인 기능 준비 중"
            className="dh-login px-4 py-[7px] bg-transparent text-gray-400 dark:text-slate-300 rounded-full text-[13px] font-medium border border-gray-200 dark:border-slate-600 cursor-not-allowed whitespace-nowrap"
          >
            로그인 (준비 중)
          </button>

          {/* Primary CTA */}
          <a
            href="/#service"
            className="px-[18px] py-[7px] bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-full text-[13px] font-semibold no-underline shrink-0 shadow-[0_4px_14px_rgba(102,126,234,0.4)] whitespace-nowrap"
          >
            지금 시작하기
          </a>
        </div>
      </div>
    </header>
  );
}
