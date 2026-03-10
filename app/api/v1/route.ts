// ── Single physical API file — all AI endpoints in one serverless function ─────
// POST /api/v1?type=plan    → study plan generation  (Groq + lib/groq)
// POST /api/v1?type=pdf     → curriculum PDF extract (lib/pdf-engine)
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
import {
  chunkPdfByPages,
  retrieveRelevantChunks,
  parseCurriculumTable,
  findCourseInChunks,
  buildCurriculumContext,
} from "@/lib/pdf-engine";
import type { ExtractedPdf } from "@/lib/pdf-engine";

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

    const { studentInfo, timetableInfo, imageUrl, universityId, pdfKnowledge } = parsed.data;
    if (pdfKnowledge) {
      console.info(`[plan] pdfKnowledge present — ${pdfKnowledge.length} chars → injecting as 학교 공식 규정`);
    }
    const result = await callStudyPlanApi({ studentInfo, timetableInfo, imageUrl, universityId, pdfKnowledge });
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
// type=pdf
// ══════════════════════════════════════════════════════════════════════════════
const MAX_TEXT_BYTES   = 1 * 1024 * 1024;
const MAX_PAGES        = 300;
const CURRICULUM_QUERY = "소프트웨어학과 교육과정 전공필수 전공기초 전공선택 EO203 EO209 졸업학점";
const VALIDATE_CODES   = ["EO203", "EO209"];
const PDF_KNOWLEDGE_MODEL = "llama-3.3-70b-versatile";
interface PageEntry { pageNum: number; text: string }

/** Prompt for structured PDF knowledge extraction — Strict 4-Target Pinset Mode */
const PDF_KNOWLEDGE_PROMPT = `당신은 대학 교육과정 편람 핀셋 분석 전문가다.
아래 편람 텍스트에서 반드시 다음 4가지 정보만 추출하여 순수 JSON으로만 반환하라.
코드블록·마크다운·설명 텍스트 없이 { 로 시작하는 JSON만 출력.

╔══════════════════════════════════════════════════════════════╗
║  【고정 페이지 타겟 맵】 — 이 범위 외 데이터는 노이즈 처리  ║
║                                                              ║
║  [졸업 요건]      →  2페이지 집중 분석                       ║
║  [학년별 로드맵]  →  4~10페이지 (이수 체계도)                ║
║  [교과목 세부]    →  65~135페이지 (소프트웨어학과: 102p 우선) ║
║  [특수 요건]      →  46~61페이지 (교직)                      ║
║                       155~158페이지 (자격증)                 ║
║                                                              ║
║  ※ 위 범위 밖 페이지 텍스트는 분석 대상에서 제외            ║
╚══════════════════════════════════════════════════════════════╝

=== 추출 타겟 (4가지만, 이것 외엔 무시) ===
[TARGET-1] 졸업 요건 (2페이지): 학과별 총 이수학점 + 영역별(교양필수/교양선택/전공필수/전공선택) 배분표
[TARGET-2] 학년별 로드맵 (4~10페이지): 1~4학년 권장 이수 체계 (2학년 과목 집중 추출)
[TARGET-3] 교과목 세부 (65~135페이지, 소프트웨어학과 102페이지 우선): 학수번호·과목명·학점·개설학기·이수구분
[TARGET-4] 특수 요건 (46~61페이지=교직 / 155~158페이지=자격증): 별도 이수 필수 과목 및 조건

=== 출력 스키마 ===
{
  "creditStructure": {
    "totalRequired": 졸업_총학점_숫자_또는_null,
    "majorRequired": 전공필수_학점_또는_null,
    "majorElective": 전공선택_학점_또는_null,
    "majorFoundation": 전공기초_학점_또는_null,
    "generalRequired": 교양필수_학점_또는_null,
    "generalElective": 교양선택_학점_또는_null,
    "summary": "졸업이수 요건 한 문장 요약"
  },
  "curriculumMap": {
    "year1": ["1학년 권장 과목명들"],
    "year2": ["2학년 권장 과목명들 — 최대한 상세히"],
    "year3": ["3학년 권장 과목명들"],
    "year4": ["4학년 권장 과목명들"]
  },
  "majorCourses": [
    {
      "code": "학수번호",
      "name": "과목명",
      "credits": 학점_숫자,
      "requirement": "전공필수 또는 전공선택 또는 전공기초",
      "year": 권장학년_숫자_또는_null,
      "semester": "1 또는 2 또는 null",
      "prerequisite": "선수과목코드 또는 null",
      "priority": "high(2학년 과목) 또는 normal(나머지)"
    }
  ],
  "certifications": [
    {
      "name": "자격증 또는 교직 이름",
      "relatedCourses": ["관련 과목명들"],
      "note": "이수 조건 또는 메모"
    }
  ]
}

=== 핀셋 추출 규칙 ===
1. 편람에 명시된 정보만 추출 — 추측·임의 생성 절대 금지
2. 확인 불가 필드는 반드시 null (빈 문자열 금지)
3. majorCourses: 전공 과목 전체 (최대 80개), 빠짐없이 추출
4. priority 규칙: year가 2이거나 과목명/학수번호 앞에 "2학년" 명시 → "high", 나머지 → "normal"
5. 한자·중국어·깨진 특수문자(\u0084 등) 완전 제거, 순수 한국어+숫자+영문만
6. creditStructure.summary는 반드시 한국어로, 숫자 포함하여 구체적으로 작성

[편람 텍스트]:
`;

/**
 * Call Groq to refine raw curriculum text into structured JSON knowledge.
 * Returns null if Groq is unavailable or parsing fails.
 */
async function extractPdfKnowledge(curriculumText: string): Promise<string | null> {
  if (!groq || curriculumText.length < 100) return null;
  try {
    const completion = await groq.chat.completions.create({
      model: PDF_KNOWLEDGE_MODEL,
      messages: [{
        role: "user",
        content: PDF_KNOWLEDGE_PROMPT + curriculumText.slice(0, 12000),
      }],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    // Validate it's parseable before returning
    const parsed = JSON.parse(raw) as {
      creditStructure?: { totalRequired?: number | null; majorRequired?: number | null; summary?: string };
      curriculumMap?: { year2?: string[] };
      majorCourses?: Array<{ priority?: string; year?: number | null; name?: string; code?: string }>;
      certifications?: Array<{ name?: string }>;
    };

    // ── 경성대 소프트웨어학과 2학년 졸업요건 구조화 로그 ──────────────────────
    const cs   = parsed.creditStructure;
    const year2Courses = parsed.curriculumMap?.year2 ?? [];
    const highPriority = (parsed.majorCourses ?? []).filter((c) => c.priority === "high");
    const certNames    = (parsed.certifications ?? []).map((c) => c.name).filter(Boolean);

    console.info("━━━ [extractPdfKnowledge] KSU 2학년 졸업요건 추출 리포트 ━━━");
    console.info(`  [TARGET-1 졸업요건] 총학점=${cs?.totalRequired ?? "미확인"}, 전공필수=${cs?.majorRequired ?? "미확인"}`);
    console.info(`  [TARGET-1 요약] ${cs?.summary ?? "(없음)"}`);
    console.info(`  [TARGET-2 로드맵] 2학년 권장과목 ${year2Courses.length}개:`, year2Courses.slice(0, 10).join(", "));
    console.info(`  [TARGET-3 교과목] priority=high(2학년) ${highPriority.length}개:`);
    highPriority.slice(0, 15).forEach((c) =>
      console.info(`    • [${c.code ?? "?"}] ${c.name ?? "?"} (year=${c.year})`)
    );
    console.info(`  [TARGET-4 특수요건] 자격증/교직 ${certNames.length}개:`, certNames.join(", ") || "(없음)");
    console.info(`  [총계] majorCourses=${parsed.majorCourses?.length ?? 0}개, rawLen=${raw.length}chars`);
    console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return raw;
  } catch (err) {
    console.warn("[extractPdfKnowledge] Groq refinement failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

function serverSanitize(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw
    // Step 1: C0 제어문자 (NUL~US, DEL) → 공백
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    // Step 2: C1 제어문자 (\u0080-\u009F, 포함 \u0084 NEL 등) → 공백
    .replace(/[\u0080-\u009F]/g, " ")
    // Step 3: 비인쇄 특수문자 (BOM, ZWSP, NBSP 등) → 공백
    .replace(/[\uFEFF\u200B-\u200D\u2060\u00A0]/g, " ")
    // Step 4: CJK 한자 (중국어·일본어) → 제거
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3000-\u303F]/g, "")
    // Step 5: 그 외 허용 범위 밖 유니코드 → 제거
    // 허용: ASCII 인쇄문자 + 한글 + 표준 공백
    .replace(/[^\x20-\x7E\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\s]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function handlePdf(req: NextRequest): Promise<NextResponse> {
  let body: { pageTexts?: PageEntry[]; totalPages?: number; universityId?: string };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: "JSON 형식이 필요합니다." }, { status: 400 }); }

  const { pageTexts, totalPages, universityId } = body;
  if (!Array.isArray(pageTexts) || pageTexts.length === 0) {
    return NextResponse.json(
      { error: "pageTexts 배열이 필요합니다. 클라이언트에서 PDF 텍스트를 추출한 후 전송하세요." },
      { status: 400 }
    );
  }
  if (pageTexts.length > MAX_PAGES) {
    return NextResponse.json(
      { error: `페이지 수가 너무 많습니다 (최대 ${MAX_PAGES}). 커리큘럼 페이지만 선별해 주세요.` },
      { status: 413 }
    );
  }

  const sanitized: PageEntry[] = pageTexts.map((p) => ({
    pageNum: typeof p.pageNum === "number" ? p.pageNum : 0,
    text:    serverSanitize(String(p.text ?? "")),
  }));

  if (Buffer.byteLength(JSON.stringify(sanitized), "utf8") > MAX_TEXT_BYTES) {
    return NextResponse.json(
      { error: "추출된 텍스트가 너무 큽니다 (1MB 초과). 커리큘럼 페이지만 선별하여 올려주세요." },
      { status: 413 }
    );
  }

  try {
    const extracted: ExtractedPdf = {
      pages:      sanitized.map((p) => ({ pageNum: p.pageNum, text: p.text })),
      totalPages: totalPages ?? sanitized.length,
      fullText:   sanitized.map((p) => p.text).join("\n"),
    };
    if (extracted.fullText.trim().length < 50) {
      return NextResponse.json(
        { error: "PDF에서 텍스트를 추출할 수 없습니다. 스캔된 이미지 PDF이거나 텍스트 레이어가 없는 파일입니다." },
        { status: 422 }
      );
    }
    const chunks       = chunkPdfByPages(extracted, 10);
    const topChunks    = retrieveRelevantChunks(chunks, CURRICULUM_QUERY, 5);
    const courses      = parseCurriculumTable(extracted.fullText);
    const validation: Record<string, { found: boolean; pageRange?: string; context?: string }> = {};
    for (const code of VALIDATE_CODES) validation[code] = findCourseInChunks(chunks, code);
    const curriculumText = buildCurriculumContext(topChunks, courses, universityId);

    // ── PDF Knowledge Refinement: Groq extracts structured JSON from curriculum ──
    const pdfKnowledge = await extractPdfKnowledge(curriculumText);
    if (pdfKnowledge) {
      console.info("[pdf] pdfKnowledge injected into response — ready for hybrid prompt merge");
    }

    return NextResponse.json({
      totalPages: extracted.totalPages, chunkCount: chunks.length,
      courseCount: courses.length, courses: courses.slice(0, 100),
      validation, curriculumText,
      // NEW: structured knowledge for hybrid prompt — stored as internalPdfKnowledge on client
      pdfKnowledge: pdfKnowledge ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "처리 오류";
    console.error("[pdf] processing error:", msg);
    return NextResponse.json(
      { error: `PDF 분석 중 오류가 발생했습니다: ${msg}. 텍스트를 직접 입력해 주세요.` },
      { status: 500 }
    );
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

/**
 * 학수번호 패턴 → 학년 매핑 (경성대 소프트웨어학과 기준)
 * EO203, EO209 는 2학년 전공기초 필수과목 — 확인 시 Confidence +0.45
 */
const KSU_YEAR2_CODES = ["EO203", "EO209", "EO204", "EO210", "EO211"];
const KSU_YEAR1_CODES = ["EO101", "EO102", "EO103", "EO104"];
const KSU_YEAR3_CODES = ["EO301", "EO302", "EO303", "EO304", "EO305"];

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
  "detectedType": "everytime | timetable | unknown",
  "gradeDetection": {
    "detectedYear": 학년_숫자_또는_null,
    "confidence": 0~1_사이_숫자 (1.0 = 완전_확신),
    "evidence": ["학년 판단 근거 목록 — 학수번호·학년표기·과목명 등 명시"]
  }
}

규칙:
- 보이는 모든 수업 블록을 빠짐없이 추출하라
- 요일은 반드시 한글 단일 문자로 통일 (월화수목금 중 해당하는 것)
- 시간은 시간표에 표시된 그대로 기입
- 과목명에 CJK/중국어가 섞여 있으면 제거하고 순수 한국어만 남겨라
- 확신할 수 없는 필드는 null로 남겨라
- [gradeDetection 판정 기준]
  * 이미지에 "1학년" "2학년" "3학년" "4학년" 텍스트가 명시된 경우 → confidence 1.0
  * 학수번호 앞자리/번호대로 학년 추정: EO2xx/EO20x → 2학년, EO3xx → 3학년, EO1xx → 1학년
  * 복수의 동일 학년 학수번호가 등장하면 confidence를 높여라
  * 근거가 없으면 detectedYear=null, confidence=0`;

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

    return NextResponse.json({ ...parsed, gradeDetection: gradeDetectionFinal });
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
    case "pdf":    return handlePdf(req);
    case "chat":   return handleChat(req);
    case "vision": return handleVision(req);
    default:
      return NextResponse.json(
        { error: `Unknown type: ${type ?? "(none)"}. Valid: plan, pdf, chat, vision` },
        { status: 404 }
      );
  }
}
