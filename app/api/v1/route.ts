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
import { buildBlockedTimeSlots, detectOffDayPreference, minutesToHHMM } from "@/lib/planner-logic";

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

    const { studentInfo, timetableInfo, imageUrl, universityId, blockedSlots, preferOffDay } = parsed.data;
    if (blockedSlots?.length) {
      console.info(`[plan] blockedSlots: ${blockedSlots.length}개 차단 슬롯 → BLOCKED_SLOTS 프롬프트 주입`);
    }
    const result = await callStudyPlanApi({ studentInfo, timetableInfo, imageUrl, universityId, blockedSlots, preferOffDay });
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

/**
 * 학수번호 패턴 → 학년 매핑 (경성대 소프트웨어학과 기준)
 * EO203, EO209 는 2학년 전공기초 필수과목 — 확인 시 Confidence +0.45
 */
const KSU_YEAR2_CODES = ["EO203", "EO209", "EO204", "EO210", "EO211"];
const KSU_YEAR1_CODES = ["EO101", "EO102", "EO103", "EO104"];
const KSU_YEAR3_CODES = ["EO301", "EO302", "EO303", "EO304", "EO305"];

const EXTRACT_PROMPT = `이 이미지는 대학 수강신청 시간표 또는 에브리타임(Everytime) 앱의 시간표 캡처본입니다.
이미지의 격자(Grid) 구조를 정밀 분석하여 수업 블록 정보와 차단 시간대를 추출하라.

━━━ [Grid Calibration — 영점 조절 규칙] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 이미지 전체 높이를 기준으로 시간 축(09:00~18:00)을 등분한다.
   - 총 세로 영역 = 09:00~18:00 = 540분 = 이미지 유효 높이의 100%
   - 각 행 높이 = 이미지 유효 높이 ÷ 9시간 = 1시간 단위
   - 30분 단위 세밀도: 0.5행 = 30분, 예) 블록 상단이 전체 높이의 16.7% → 10:30
2. 이미지 전체 너비를 기준으로 요일 열(월~금)을 등분한다.
   - 왼쪽 시간 레이블 열(약 10~15% 너비)은 제외
   - 나머지 너비를 5등분 → 각 열 = 20%
   - 블록의 수평 중심 좌표가 속하는 열 = 해당 요일
3. 테마(다크/화이트) 무관 분석:
   - 다크 테마: 블록이 밝은 색, 배경이 어두운 색 — 밝은 직사각형 영역을 블록으로 인식
   - 화이트 테마: 블록이 색상 배경(파랑/녹색/보라 등), 배경이 흰색 — 컬러 직사각형을 블록으로 인식
   - 모든 테마에서 블록의 상단 y좌표 → startTime, 하단 y좌표 → endTime 계산
4. endTime 필수 추출: 블록의 물리적 하단 위치로 종료 시각을 HH:MM 형식으로 반드시 계산
   - 예) 블록 상단=09:00, 블록 높이=이미지 높이의 27.8% → 높이=150분 → endTime=11:30
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

반환 형식 (순수 JSON, 코드블록 없음):
{
  "courses": [
    {
      "code":    "학수번호 (없으면 null)",
      "name":    "과목명",
      "day":     "요일 (한글 단일문자 연속, 예: 월, 화수, 월수금)",
      "time":    "시작시간 (HH:MM 형식, 예: 09:00, 10:30)",
      "endTime": "종료시간 (HH:MM 형식 — Grid Calibration으로 계산, 절대 null 금지)",
      "credits": 학점_숫자_또는_null,
      "room":    "강의실 (없으면 null)",
      "gridRow": "격자 행 번호(1-기반, 30분=0.5단위 허용: 1=09:00, 1.5=09:30, 2=10:00, 2.5=10:30, 3=11:00, 3.5=11:30, 4=12:00, ...)",
      "gridCol": "격자 열 번호(1=월, 2=화, 3=수, 4=목, 5=금)"
    }
  ],
  "blockedTimeSlots": [
    {
      "day":        "요일 (한글 단일문자)",
      "startTime":  "시작시간 HH:MM",
      "endTime":    "종료시간 HH:MM — Grid Calibration 기반 정확한 값",
      "courseName": "해당 시간 과목명"
    }
  ],
  "preferredOffDays": ["수업 블록이 전혀 없는 요일 — 공강일 후보"],
  "detectedType": "everytime | timetable | unknown",
  "gradeDetection": {
    "detectedYear": 학년_숫자_또는_null,
    "confidence": 0~1_사이_숫자 (1.0=완전확신),
    "evidence": ["학년 판단 근거 목록"]
  }
}

격자 분석 추가 규칙:
- 이미지에 보이는 모든 수업 블록을 빠짐없이 추출 (과목명 짧아도 추출)
- blockedTimeSlots: courses의 각 과목 → 요일별로 개별 슬롯 분리
  예) 월수 동시 수강 과목 → [{day:"월",startTime:"09:00",endTime:"10:30",...}, {day:"수",...}]
- preferredOffDays: 격자에서 수업 블록이 없는 열(요일)을 모두 포함
- 요일은 반드시 한글 단일 문자 (월화수목금)
- 시간은 HH:MM 형식으로 통일 (30분 단위로 반올림: 09:00, 09:30, 10:00, 10:30 ...)
- 확신할 수 없는 필드(name 제외)는 null로 남겨라
- [gradeDetection 판정 기준]
  * 이미지에 학년 텍스트 명시 → confidence 1.0
  * EO2xx/EO20x → 2학년, EO3xx → 3학년, EO1xx → 1학년
  * 복수의 동일학년 학수번호 → confidence 높임
  * 근거 없으면 detectedYear=null, confidence=0`;

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
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(raw) as Record<string, unknown>; }
    catch { return NextResponse.json({ error: "AI 응답 파싱 실패", raw }, { status: 502 }); }

    // ── AnalyzeGradeSkill: code-based confidence boosting ────────────────
    // Cross-reference extracted course codes against KSU year tables.
    // If EO203/EO209 (2학년 전공기초 필수) are present → boost confidence to 95%+
    const courses = (parsed.courses ?? []) as Array<{ code?: string | null }>;
    const extractedCodes = courses.map((c) => (c.code ?? "").toUpperCase().trim()).filter(Boolean);

    const grade = parsed.gradeDetection as {
      detectedYear?: number | null;
      confidence?: number;
      evidence?: string[];
    } | undefined;

    let yearOut = grade?.detectedYear ?? null;
    let confOut = grade?.confidence ?? 0;
    const evidenceOut: string[] = [...(grade?.evidence ?? [])];

    // Year-2 code hits: EO203 or EO209 → 2학년 전공기초 필수과목 확인
    const year2Hits = KSU_YEAR2_CODES.filter((c) => extractedCodes.includes(c));
    const year1Hits = KSU_YEAR1_CODES.filter((c) => extractedCodes.includes(c));
    const year3Hits = KSU_YEAR3_CODES.filter((c) => extractedCodes.includes(c));

    if (year2Hits.length >= 2) {
      // 2개 이상의 2학년 전공기초 코드 → 95% 확정
      yearOut = 2;
      confOut = Math.max(confOut, 0.95 + (year2Hits.length - 2) * 0.01);
      evidenceOut.push(`KSU 2학년 전공기초 코드 ${year2Hits.length}개 감지: ${year2Hits.join(", ")} → 2학년 확정 (≥95%)`);
    } else if (year2Hits.length === 1) {
      yearOut = yearOut ?? 2;
      confOut = Math.max(confOut, 0.72);
      evidenceOut.push(`KSU 2학년 코드 1개 감지: ${year2Hits[0]}`);
    }
    if (year3Hits.length >= 1) {
      yearOut = yearOut ?? 3;
      confOut = Math.max(confOut, 0.70 + year3Hits.length * 0.05);
      evidenceOut.push(`KSU 3학년 코드 감지: ${year3Hits.join(", ")}`);
    }
    if (year1Hits.length >= 1 && year2Hits.length === 0) {
      yearOut = yearOut ?? 1;
      confOut = Math.max(confOut, 0.65);
      evidenceOut.push(`KSU 1학년 코드 감지: ${year1Hits.join(", ")}`);
    }

    // Cap at 0.99 (never claim 100% unless explicitly labelled in image)
    confOut = Math.min(0.99, confOut);

    const gradeDetectionFinal = {
      detectedYear: yearOut,
      confidence:   Math.round(confOut * 100) / 100,
      evidence:     evidenceOut,
      confidencePct: `${Math.round(confOut * 100)}%`,
    };

    console.info("[vision/AnalyzeGradeSkill]", JSON.stringify(gradeDetectionFinal));

    // ── 서버사이드 BlockedTimeSlot 계산 ─────────────────────────────────────
    // AI가 반환한 blockedTimeSlots를 검증·보강하고, 없으면 courses에서 직접 계산
    const coursesForBlocking = (parsed.courses ?? []) as Array<{
      name?: string; day?: string; time?: string; endTime?: string | null;
      code?: string; credits?: number;
    }>;
    const serverBlockedSlots = buildBlockedTimeSlots(
      coursesForBlocking.map((c) => ({
        name:    c.name    ?? "",
        day:     c.day     ?? "",
        time:    c.time    ?? "",
        endTime: c.endTime ?? undefined,   // Grid Calibration 기반 실제 종료 시각
        code:    c.code    ?? undefined,
        credits: c.credits ?? undefined,
      })),
    );

    // AI가 preferredOffDays를 반환하지 않으면 courses에서 감지
    const aiPreferredOffDays = (parsed.preferredOffDays ?? []) as string[];
    const detectedOffDay = aiPreferredOffDays[0]
      ?? detectOffDayPreference(
        coursesForBlocking.map((c) => ({ name: c.name ?? "", day: c.day ?? "" })),
      );

    // ── [Time-Shield-Scan] 분석 결과 터미널 출력 ────────────────────────────
    {
      const DAY_KO: Record<string, string> = { 월: "MON", 화: "TUE", 수: "WED", 목: "THU", 금: "FRI" };
      const border = "━".repeat(60);
      console.info(`\n[Time-Shield-Scan] ${border}`);
      console.info(`  차단 슬롯 총 ${serverBlockedSlots.length}개  /  공강 후보: ${detectedOffDay ?? "없음"}`);
      console.info(`  ${"─".repeat(58)}`);
      if (serverBlockedSlots.length === 0) {
        console.info("  (추출된 차단 슬롯 없음 — 이미지 재확인 필요)");
      } else {
        console.info("  요일    시간대             과목명");
        console.info(`  ${"─".repeat(58)}`);
        for (const slot of serverBlockedSlots) {
          const day   = (DAY_KO[slot.day] ?? slot.day).padEnd(5);
          const range = `${minutesToHHMM(slot.startMin)} ~ ${minutesToHHMM(slot.endMin)}`.padEnd(18);
          const name  = (slot.courseName ?? `[${slot.source}]`).slice(0, 30);
          console.info(`  ${day}   ${range}  ${name}`);
        }
      }
      console.info(`[Time-Shield-Scan] ${border}\n`);
    }

    return NextResponse.json({
      ...parsed,
      gradeDetection: gradeDetectionFinal,
      // 서버사이드 계산 결과 — 클라이언트가 plan 요청 시 blockedSlots로 전달
      blockedTimeSlots:   serverBlockedSlots,
      preferredOffDays:   detectedOffDay ? [detectedOffDay] : aiPreferredOffDays,
    });
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
