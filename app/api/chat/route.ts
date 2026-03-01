// Counseling AI chat route — direct Groq API when key is set, Replit proxy fallback.
// Groq model: llama-3.3-70b-versatile + university-aware KB (multi-university)

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { checkUsage, usageLimitResponse } from "@/lib/usage";
import { buildChatSystemPrompt, getUniversityConfig } from "@/lib/university-kb";

// ─── Groq client (build-safe) ─────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const groq: Groq | null = GROQ_API_KEY
  ? new Groq({ apiKey: GROQ_API_KEY })
  : null;

const CHAT_MODEL = "llama-3.3-70b-versatile";

// ─── Replit fallback ──────────────────────────────────────────────────────────

const REPLIT_CHAT_URL =
  process.env.REPLIT_API_URL ??
  "https://groq-chatbot-backend--ghimdohyun.replit.app/api/chat";

const CHAT_TIMEOUT_MS = 15_000;

const FALLBACK_REPLY =
  "현재 AI 챗봇 서버가 점검 중입니다. 잠시 후 다시 시도해주세요. " +
  "수강 계획 생성 기능은 아래 폼에서 이용 가능합니다.";

async function callReplitChat(message: string): Promise<string> {
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
    if (fetchErr instanceof Error && fetchErr.name === "AbortError") return FALLBACK_REPLY;
    throw fetchErr;
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    if (upstream.status === 404 || upstream.status === 503) return FALLBACK_REPLY;
    throw new Error(`Upstream ${upstream.status}`);
  }

  const data = await upstream.json() as { reply?: string };
  return data.reply ?? FALLBACK_REPLY;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const usage = await checkUsage();
  if (!usage.allowed && usage.plan !== "beta") {
    return usageLimitResponse(usage);
  }

  const body = await req.json().catch(() => ({})) as { message?: string; universityId?: string };
  const { message, universityId } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message 필드가 필요합니다." }, { status: 400 });
  }

  const systemPrompt = buildChatSystemPrompt(getUniversityConfig(universityId));

  // Path 1: Direct Groq (preferred when GROQ_API_KEY is set)
  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.4,
        max_tokens: 512,
      });

      const reply = completion.choices[0]?.message?.content ?? FALLBACK_REPLY;
      return NextResponse.json({ reply });
    } catch (err: unknown) {
      console.error("[chat] Groq error:", err instanceof Error ? err.message : err);
      return NextResponse.json({ reply: FALLBACK_REPLY });
    }
  }

  // Path 2: Replit proxy fallback
  try {
    const reply = await callReplitChat(message);
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
