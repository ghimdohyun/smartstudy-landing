// Global ErrorBoundary — catches any uncaught rendering error anywhere in the tree.
// Shows "데이터를 정제 중입니다..." and auto-resets after 3 s so the app self-heals.
// Must be a class component (React's error boundary API requires lifecycle methods).

"use client";

import { Component, ReactNode } from "react";

interface Props  { children: ReactNode }
interface State  { hasError: boolean; resetKey: number }

export default class ErrorBoundary extends Component<Props, State> {
  private _resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, resetKey: 0 };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] 렌더링 오류 감지:", error.message);
    console.error("[ErrorBoundary] 컴포넌트 스택:", info.componentStack);

    // Auto-reset: re-render the tree with a new key after 3 s
    this._resetTimer = setTimeout(() => {
      this.setState((prev) => ({ hasError: false, resetKey: prev.resetKey + 1 }));
    }, 3000);
  }

  componentWillUnmount() {
    if (this._resetTimer) clearTimeout(this._resetTimer);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-4
                     bg-slate-50 dark:bg-slate-950 p-8"
        >
          {/* Pulse indicator */}
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full bg-indigo-500 shrink-0"
              style={{ animation: "pulse 1.2s ease-in-out infinite" }}
            />
            <p className="m-0 text-[15px] font-semibold text-slate-700 dark:text-slate-200">
              데이터를 정제 중입니다...
            </p>
          </div>
          <p className="m-0 text-[12px] text-slate-400 dark:text-slate-500">
            잠시 후 자동으로 복구됩니다.
          </p>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }`}</style>
        </div>
      );
    }

    return (
      // key change forces full remount after auto-reset, clearing stale state
      <div key={this.state.resetKey}>{this.props.children}</div>
    );
  }
}
