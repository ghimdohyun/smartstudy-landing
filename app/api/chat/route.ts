// Counseling AI chat route — direct Groq API when key is set, Replit proxy fallback.
// Groq model: llama-3.3-70b-versatile (Korean counseling specialist)

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { checkUsage, usageLimitResponse } from "@/lib/usage";

// ─── Groq client (build-safe) ─────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const groq: Groq | null = GROQ_API_KEY
  ? new Groq({ apiKey: GROQ_API_KEY })
  : null;

const CHAT_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `당신은 서강대학교 수강신청 전문 상담 AI입니다.
학생들의 수강 계획, 학점 관리, 졸업 요건, 전공/교양 선택에 대한 질문에 친절하고 전문적으로 답변하세요.
교과목 체계: COR(공통필수), LCS(공통선택), HFS(인문사회), 전공필수, 전공선택.
답변은 반드시 한국어로, 핵심만 200자 이내로 간결하게 작성하세요.
필요한 경우 수강 계획 생성 기능 이용을 안내하세요.`;

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

  const body = await req.json().catch(() => ({})) as { message?: string };
  const { message } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message 필드가 필요합니다." }, { status: 400 });
  }

  // Path 1: Direct Groq (preferred when GROQ_API_KEY is set)
  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        temperature: 0.5,
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
