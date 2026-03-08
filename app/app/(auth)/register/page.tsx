// Register page — Google OAuth (no separate sign-up; Google handles account creation)
"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-[400px] bg-white dark:bg-neutral-900 rounded-2xl p-10 shadow-[0_8px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
      <h1 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 mb-2">
        회원가입
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-7">
        AI 수강 계획 서비스를 무료로 시작하세요.
      </p>

      <Button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className={cn(
          "w-full rounded-full text-sm font-semibold",
          "bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200",
          "border border-gray-200 dark:border-gray-700",
          "hover:bg-gray-50 dark:hover:bg-neutral-700",
          "shadow-sm"
        )}
        variant="outline"
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Google로 시작하기
      </Button>

      <p className="mt-5 text-[11px] text-gray-400 dark:text-gray-500 text-center leading-relaxed">
        Google 계정으로 가입 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
      </p>

      <p className="mt-4 text-center text-[13px] text-gray-500 dark:text-gray-400">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-emerald-600 dark:text-emerald-400 font-semibold">
          로그인
        </Link>
      </p>
      <p className="text-center mt-2">
        <Link href="/" className="text-[13px] text-gray-400 dark:text-gray-500">
          ← 홈으로
        </Link>
      </p>
    </div>
  );
}
