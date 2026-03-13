// ── Single physical API file — all AI endpoints in one serverless function ─────
// POST /api/v1?type=plan    → study plan generation  (Groq + lib/groq)
// POST /api/v1?type=chat    → counseling chat reply  (Groq llama-3.3-70b)
// POST /api/v1?type=vision  → 에브리타임 image OCR   (Groq llama-4-scout)
export const dynamic     = "force-dynamic";
export const maxDuration = 60;
export const runtime     = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { checkUsage, recordUsage, usageLimitResponse } from "@/lib/usage";
import { callStudyPlanApi, UpstreamError } from "@/lib/groq";
import { StudyPlanRequestSchema } from "@/lib/validations/study-plan";
import { buildChatSystemPrompt, getUniversityConfig } from "@/lib/university-kb";

// ─── Shared Groq client ────────────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const groq: Groq | null = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

// ══════════════════════════════════════════════════════════════════════════════
// type=plan
// ══════════════════════════════════════════════════════════════════════════════
async function handlePlan(req: NextRequest): Promise<NextResponse> {
  try {
    const usage = await checkUsage();
    if (!usage.allowed) return usageLimitResponse(usage) as NextResponse;

    const body = await req.json().catch(() => null);
    const parsed = StudyPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { studentInfo, timetableInfo, imageUrl, universityId } = parsed.data;
    const result = await callStudyPlanApi({ studentInfo, timetableInfo, imageUrl, universityId });
    if (usage.userId) await recordUsage(usage.userId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof UpstreamError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// type=chat
// ══════════════════════════════════════════════════════════════════════════════
const CHAT_MODEL      = "llama-3.3-70b-versatile";
const REPLIT_CHAT_URL = process.env.REPLIT_API_URL ??
  "https://groq-chatbot-backend--ghimdohyun.replit.app/api/chat";
const CHAT_TIMEOUT_MS = 15_000;
const FALLBACK_REPLY  =
  "현재 AI 챗봇 서버가 점검 중입니다. 잠시 후 다시 시도해주세요. " +
  "수강 계획 생성 기능은 아래 폼에서 이용 가능합니다.";

async function callReplitChat(message: string): Promise<string> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CHAT_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(REPLIT_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: ctrl.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === "AbortError") return FALLBACK_REPLY;
    throw e;
  } finally { clearTimeout(timer); }
  if (!upstream.ok) {
    if (upstream.status === 404 || upstream.status === 503) return FALLBACK_REPLY;
    throw new Error(`Upstream ${upstream.status}`);
  }
  const data = await upstream.json() as { reply?: string };
  return data.reply ?? FALLBACK_REPLY;
}

async function handleChat(req: NextRequest): Promise<NextResponse> {
  const usage = await checkUsage();
  if (!usage.allowed && usage.plan !== "beta") return usageLimitResponse(usage) as NextResponse;

  const body = await req.json().catch(() => ({})) as { message?: string; universityId?: string };
  const { message, universityId } = body;
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message 필드가 필요합니다." }, { status: 400 });
  }

  const systemPrompt = buildChatSystemPrompt(getUniversityConfig(universityId));

  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: message },
        ],
        temperature: 0.4,
        max_tokens: 512,
      });
      return NextResponse.json({
        reply: completion.choices[0]?.message?.content ?? FALLBACK_REPLY,
      });
    } catch (err: unknown) {
      console.error("[chat] Groq error:", err instanceof Error ? err.message : err);
      return NextResponse.json({ reply: FALLBACK_REPLY });
    }
  }

  try {
    return NextResponse.json({ reply: await callReplitChat(message) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// type=vision
// ══════════════════════════════════════════════════════════════════════════════
const VISION_MODEL   = "meta-llama/llama-4-scout-17b-16e-instruct";
const EXTRACT_PROMPT = `이 이미지는 대학 수강신청 시간표 또는 에브리타임(Everytime) 앱의 시간표 캡처본입니다.
이미지에서 각 수업 블록의 정보를 추출하여 JSON으로 반환하라.

반환 형식 (순수 JSON, 코드블록 없음):
{
  "courses": [
    {
      "code":    "학수번호 (없으면 null)",
      "name":    "과목명",
      "day":     "요일 (한글, 예: 월, 화수, 월수금)",
      "time":    "시간 (예: 09:00, 1교시, 10:30-12:00)",
      "credits": 학점_숫자_또는_null,
      "room":    "강의실 (없으면 null)"
    }
  ],
  "detectedType": "everytime | timetable | unknown"
}

규칙:
- 보이는 모든 수업 블록을 빠짐없이 추출하라
- 요일은 반드시 한글 단일 문자로 통일 (월화수목금 중 해당하는 것)
- 시간은 시간표에 표시된 그대로 기입
- 과목명에 CJK/중국어가 섞여 있으면 제거하고 순수 한국어만 남겨라
- 확신할 수 없는 필드는 null로 남겨라`;

async function handleVision(req: NextRequest): Promise<NextResponse> {
  if (!groq) {
    return NextResponse.json(
      { error: "GROQ_API_KEY가 설정되지 않았습니다. 환경변수를 확인하세요." },
      { status: 501 }
    );
  }
  let imageUrl: string;
  try {
    const body = await req.json() as { imageUrl?: string };
    if (!body.imageUrl?.trim()) {
      return NextResponse.json({ error: "imageUrl 필드가 필요합니다." }, { status: 400 });
    }
    imageUrl = body.imageUrl.trim();
  } catch {
    return NextResponse.json({ error: "요청 본문을 파싱할 수 없습니다." }, { status: 400 });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: EXTRACT_PROMPT },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }],
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch { return NextResponse.json({ error: "AI 응답 파싱 실패", raw }, { status: 502 }); }
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Groq API 오류: ${msg}` }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DISPATCHER — switch on ?type=
// ══════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest): Promise<NextResponse> {
  const type = req.nextUrl.searchParams.get("type");
  switch (type) {
    case "plan":   return handlePlan(req);
    case "chat":   return handleChat(req);
    case "vision": return handleVision(req);
    default:
      return NextResponse.json(
        { error: `Unknown type: ${type ?? "(none)"}. Valid: plan, chat, vision` },
        { status: 404 }
      );
  }
}
