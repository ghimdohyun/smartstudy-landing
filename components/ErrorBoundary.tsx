// Global ErrorBoundary — catches any uncaught rendering error anywhere in the tree.
// On error: clears localStorage + sessionStorage (corrupted data), then prompts
// the user to reload manually. No auto-reset loop that could re-trigger the same error.

"use client";

import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; resetKey: number }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, resetKey: 0 };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] 렌더링 오류 감지:", error.message);
    console.error("[ErrorBoundary] 스택:", info.componentStack);
  }

  /** Wipe all cached data then force a hard reload — breaks any error loop. */
  private handleReset = () => {
    try { localStorage.clear(); } catch { /* sandboxed env */ }
    try { sessionStorage.clear(); } catch { /* sandboxed env */ }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-5
                     bg-slate-50 dark:bg-slate-950 px-6 py-12 text-center"
        >
          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/40
                          flex items-center justify-center text-2xl shrink-0">
            🔄
          </div>

          {/* Headline */}
          <div className="max-w-sm">
            <p className="m-0 mb-1.5 text-[16px] font-bold text-slate-800 dark:text-white">
              데이터를 정제 중입니다...
            </p>
            <p className="m-0 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
              이전 오류 데이터가 감지되었습니다.
              <br />
              캐시를 초기화한 후 새로고침하면 정상 작동합니다.
            </p>
          </div>

          {/* Reset button */}
          <button
            onClick={this.handleReset}
            className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-white
                       bg-indigo-600 hover:bg-indigo-700 active:scale-95
                       shadow-[0_4px_14px_rgba(99,102,241,0.4)]
                       transition-all cursor-pointer border-none"
          >
            새로고침하여 다시 시도하기
          </button>

          <p className="m-0 text-[11px] text-slate-400 dark:text-slate-600">
            (브라우저 캐시 + 이전 분석 데이터 자동 초기화)
          </p>
        </div>
      );
    }

    return (
      <div key={this.state.resetKey}>{this.props.children}</div>
    );
  }
}
