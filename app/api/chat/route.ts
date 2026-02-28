// Proxy route: forwards chat messages to Replit /api/chat and returns the reply.
// Falls back to a Korean maintenance message when the upstream is unavailable.

import { NextRequest, NextResponse } from "next/server";

const REPLIT_CHAT_URL =
  process.env.REPLIT_API_URL ??
  "https://groq-chatbot-backend--ghimdohyun.replit.app/api/chat";

const CHAT_TIMEOUT_MS = 15_000;

const FALLBACK_REPLY =
  "현재 AI 챗봇 서버가 점검 중입니다. 잠시 후 다시 시도해주세요. " +
  "수강 계획 생성 기능은 아래 폼에서 이용 가능합니다.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message 필드가 필요합니다." },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    let upstream: Response;
    try {
      upstream = await fetch(REPLIT_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timer);
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        return NextResponse.json({ reply: FALLBACK_REPLY });
      }
      throw fetchErr;
    } finally {
      clearTimeout(timer);
    }

    if (!upstream.ok) {
      // Backend sleeping or not found — return soft fallback instead of an error
      if (upstream.status === 404 || upstream.status === 503) {
        return NextResponse.json({ reply: FALLBACK_REPLY });
      }
      const errText = await upstream.text();
      return NextResponse.json(
        { error: `Upstream error (${upstream.status}): ${errText.slice(0, 200)}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
