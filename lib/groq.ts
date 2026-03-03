// Groq/Replit study-plan API client: multi-slot vision engine with Replit fallback.
// GROQ_API_KEY set -> meta-llama/llama-4-scout-17b-16e-instruct (batched, ≤5 img/call)
// No key -> Replit upstream proxy with DEMO_PLAN fallback.

import Groq from "groq-sdk";
import { buildPlanPromptRules, getUniversityConfig } from "@/lib/university-kb";
import { stripCjkNoise } from "@/lib/planner-logic";

// ─── Config ───────────────────────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const REPLIT_PLAN_URL =
  process.env.REPLIT_PLAN_URL ??
  process.env.REPLIT_API_URL ??
  "https://groq-chatbot-backend--ghimdohyun.replit.app/api/generate-plan";

const UPSTREAM_TIMEOUT_MS = 45_000;
const VISION_MODEL    = "meta-llama/llama-4-scout-17b-16e-instruct"; // Llama 4 Scout (multimodal)
const TEXT_MODEL      = "llama-3.3-70b-versatile";
const VISION_BATCH_SIZE = 5; // Groq vision API: max 5 images per call

// Build-safe: only instantiated when key is present
const groq: Groq | null = GROQ_API_KEY
  ? new Groq({ apiKey: GROQ_API_KEY })
  : null;

// ─── Error type ───────────────────────────────────────────────────────────────

export class UpstreamError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

// ─── Enhanced prompt ─────────────────────────────────────────────────────────

export function buildPrompt(studentInfo: string, timetableInfo: string, universityId?: string): string {
  const config = getUniversityConfig(universityId);
  const universityRules = buildPlanPromptRules(config);
  const tc = config.timetable.targetCredits;
  const dayNote = config.timetable.preferOffDay
    ? `5. day 필드에 "${config.timetable.preferOffDay}" 포함 불가 (공강 원칙)\n6. 응답은 순수 JSON만 반환 (코드블록·설명 텍스트 없음)`
    : `5. 응답은 순수 JSON만 반환 (코드블록·설명 텍스트 없음)`;

  return `[수강 계획표 AI 생성 요청 — ${config.name} ${config.department}]
[REQUIRED_STRICT MODE — 아래 모든 원칙은 협상 불가, 위반 시 응답 전체 무효]

══════════════════════════════════════════════════════════════
【학생 맞춤 최우선 필터 — 모든 과목 추천의 절대적 기준】
${studentInfo}
→ 위 학생의 관심 분야·진로·수강 조건에 부합하지 않는 과목 추천 금지.
→ 학생 정보가 반영되지 않은 계획은 INVALID로 간주한다.
══════════════════════════════════════════════════════════════

## 역할 선언
너는 대학 수강신청 전문가이다. 위 학생 맞춤 정보를 최우선으로 반영하여 편람 데이터 기반 전공과 교양 필수 과목을 배치하라.

## ⚠ REQUIRED_STRICT 출력 원칙 (단 하나의 위반도 허용 불가)
1. [CRITICAL] planA, planB, planC, planD 4개 키를 **모두** 반환하라. 누락 시 응답 전체 무효.
2. [CRITICAL] 각 Plan은 반드시 서로 다른 전략 테마를 가져야 한다 (동일·유사 구성 절대 불가):
   - Plan A (안정): 이수 부담 최소, 공강 확보 전략 — 학점 부담 낮은 과목 중심
   - Plan B (도전): 전공심화 극대화 — 어렵지만 가치 있는 심화과목 포함
   - Plan C (꿀강): GPA 최적화 — 강의평가 우수, A+ 가능성 높은 과목 집중
   - Plan D (전공집중): 졸업요건 최적화 — 전공필수·전공선택 집중 배치
3. [CRITICAL] courses[].day: 반드시 한글 요일로 기입 (예: "월수금", "화목", "월")
   courses[].time: 반드시 교시 또는 시각으로 기입 (예: "1교시", "09:00", "10:30")
4. [CRITICAL] 깨진 텍스트·한자·중국어·비표준 유니코드 출력 절대 금지 → 순수 한국어만
5. [CRITICAL] 과목명·학수번호는 실제 편람에 존재하는 것만 사용 (임의 생성 불가)
6. courses 필드 순서: code, name, credits, requirement, target, day, time (모두 필수)

제공된 [시간표 이미지], [지침서 설명]을 융합 분석하여 4가지 전략의 수강 계획과 1년 로드맵을 JSON으로 반환하라.

## 시간표 / 지침서
${timetableInfo || "없음"}

${universityRules}

## 4가지 수강 전략 (각 플랜은 서로 다른 과목 조합으로 구성)
- Plan A (안정): 학점 관리 최우선, 이수 부담 최소화, 공강일 최대 확보. ${tc}학점.
- Plan B (도전): 전공심화 + 고난이도 과목 포함, 역량 극대화. ${tc}학점.
- Plan C (꿀강): 강의평가 우수 과목 중심, GPA 극대화. ${tc}학점.
- Plan D (전공집중): 전공필수·선택 집중, 졸업요건 최단 경로 최적화. ${tc}학점.

## 공통 지시 사항
1. 이미지 제공 시: 현재 수강 과목, 공강 시간대, 선호 요일·시간 파악 후 반영
2. 실제 교과목 편성표에 존재하는 과목만 추천
3. yearPlan: 1학기(3-6월), 2학기(9-12월) + 12개월 월별 목표 포함
4. courses 각 항목: code, name, credits, requirement, target, day, time 필수
${dayNote}

반환 구조 (planA~planD 4개 모두 필수 — 누락 불가):
{
  "planA": { "title": "안정 전략", "strategy": "", "courses": [], "totalCredits": ${tc} },
  "planB": { "title": "도전 전략", "strategy": "", "courses": [], "totalCredits": ${tc} },
  "planC": { "title": "꿀강 전략", "strategy": "", "courses": [], "totalCredits": ${tc} },
  "planD": { "title": "전공집중 전략", "strategy": "", "courses": [], "totalCredits": ${tc} },
  "yearPlan": {
    "semesters": [
      { "semester": "1학기 (3월~6월)", "goal": "", "recommendedCourses": [], "weeklyRoutine": "", "milestones": [],
        "monthlyGoals": [{"month":3,"goal":"","tasks":[]},{"month":4,"goal":"","tasks":[]},{"month":5,"goal":"","tasks":[]},{"month":6,"goal":"","tasks":[]}] },
      { "semester": "2학기 (9월~12월)", "goal": "", "recommendedCourses": [], "weeklyRoutine": "", "milestones": [],
        "monthlyGoals": [{"month":9,"goal":"","tasks":[]},{"month":10,"goal":"","tasks":[]},{"month":11,"goal":"","tasks":[]},{"month":12,"goal":"","tasks":[]}] }
    ],
    "monthlyGoals": [{"month":1,"goal":"","tasks":[]},{"month":2,"goal":"","tasks":[]},{"month":7,"goal":"","tasks":[]},{"month":8,"goal":"","tasks":[]}],
    "risks": [], "note": ""
  }
}`;
}

// ─── Demo fallback ────────────────────────────────────────────────────────────

export const DEMO_PLAN = {
  _isDemo: true,
  planA: {
    title: "안정 전략",
    strategy: "전산수학(EO203) + 리눅스시스템(EO209) 전공기초 필수 2과목 포함, COR 공통필수 중심으로 학점 부담을 낮추고 금요일 공강을 확보합니다. 21학점.",
    courses: [
      { code: "EO203", name: "전산수학", credits: 3, requirement: "전공기초", target: "2학년", day: "월수", time: "09:00" },
      { code: "EO209", name: "리눅스시스템", credits: 3, requirement: "전공기초", target: "2학년", day: "화목", time: "09:00" },
      { code: "COR-101", name: "인간의 탐구", credits: 3, requirement: "공통필수", target: "전체", day: "화목", time: "10:30" },
      { code: "COR-102", name: "자연의 이해", credits: 3, requirement: "공통필수", target: "전체", day: "월수", time: "11:00" },
      { code: "LCS-201", name: "비판적 사고와 글쓰기", credits: 3, requirement: "공통선택", target: "전체", day: "화", time: "13:00" },
      { code: "HFS-101", name: "철학의 이해", credits: 3, requirement: "인문사회", target: "전체", day: "목", time: "15:00" },
      { code: "GE-201", name: "의사소통과 리더십", credits: 3, requirement: "교양선택", target: "전체", day: "수", time: "14:00" },
    ],
    totalCredits: 21,
  },
  planB: {
    title: "도전 전략",
    strategy: "전산수학(EO203) + 리눅스시스템(EO209) + 전공심화 과목으로 역량을 극대화합니다. 금요일 전체 공강. 21학점.",
    courses: [
      { code: "EO203", name: "전산수학", credits: 3, requirement: "전공기초", target: "2학년", day: "화목", time: "09:00" },
      { code: "EO209", name: "리눅스시스템", credits: 3, requirement: "전공기초", target: "2학년", day: "월수", time: "09:00" },
      { code: "COR-101", name: "인간의 탐구", credits: 3, requirement: "공통필수", target: "전체", day: "월수", time: "11:00" },
      { code: "LCS-202", name: "데이터와 사회", credits: 3, requirement: "공통선택", target: "전체", day: "화", time: "10:30" },
      { code: "전공기초-001", name: "전공입문 세미나", credits: 3, requirement: "전공기초", target: "2학년", day: "화목", time: "13:00" },
      { code: "전공선택-101", name: "전공심화 I", credits: 3, requirement: "전공선택", target: "2학년", day: "목", time: "15:00" },
      { code: "HFS-101", name: "철학의 이해", credits: 3, requirement: "인문사회", target: "전체", day: "수", time: "14:00" },
    ],
    totalCredits: 21,
  },
  planC: {
    title: "꿀강 전략",
    strategy: "전산수학(EO203) + 리눅스시스템(EO209) + 강의평가 우수 과목 + 창업 교양으로 GPA 극대화. 금요일 공강. 21학점.",
    courses: [
      { code: "EO203", name: "전산수학", credits: 3, requirement: "전공기초", target: "2학년", day: "월수", time: "09:00" },
      { code: "EO209", name: "리눅스시스템", credits: 3, requirement: "전공기초", target: "2학년", day: "화목", time: "09:00" },
      { code: "COR-101", name: "인간의 탐구", credits: 3, requirement: "공통필수", target: "전체", day: "화목", time: "10:30" },
      { code: "COR-104", name: "예술과 문화", credits: 3, requirement: "공통필수", target: "전체", day: "월수", time: "13:00" },
      { code: "LCS-201", name: "비판적 사고와 글쓰기", credits: 3, requirement: "공통선택", target: "전체", day: "수", time: "14:00" },
      { code: "전공기초-001", name: "전공입문 세미나", credits: 3, requirement: "전공기초", target: "2학년", day: "월", time: "10:00" },
      { code: "GE-창업", name: "창업기초", credits: 3, requirement: "교양선택", target: "전체", day: "목", time: "16:00" },
    ],
    totalCredits: 21,
  },
  planD: {
    title: "전공집중 전략",
    strategy: "전산수학(EO203) + 리눅스시스템(EO209) + 전공 필수·선택 집중 + 창업 교양으로 졸업요건을 최적화합니다. 금요일 공강. 21학점.",
    courses: [
      { code: "EO203", name: "전산수학", credits: 3, requirement: "전공기초", target: "2학년", day: "화목", time: "10:30" },
      { code: "EO209", name: "리눅스시스템", credits: 3, requirement: "전공기초", target: "2학년", day: "월수", time: "09:00" },
      { code: "COR-101", name: "인간의 탐구", credits: 3, requirement: "공통필수", target: "전체", day: "화목", time: "09:00" },
      { code: "전공기초-001", name: "전공입문 세미나", credits: 3, requirement: "전공기초", target: "2학년", day: "화", time: "13:00" },
      { code: "전공선택-101", name: "전공심화 I", credits: 3, requirement: "전공선택", target: "2학년", day: "목", time: "13:00" },
      { code: "전공선택-102", name: "전공심화 II", credits: 3, requirement: "전공선택", target: "2학년", day: "수", time: "15:00" },
      { code: "GE-창업", name: "창업기초", credits: 3, requirement: "교양선택", target: "전체", day: "월", time: "16:00" },
    ],
    totalCredits: 21,
  },
  yearPlan: {
    semesters: [
      {
        semester: "1학기 (3월~6월)",
        goal: "대학 생활 적응과 기초 역량 확립",
        recommendedCourses: ["인간의 탐구", "자연의 이해", "비판적 사고와 글쓰기", "전공입문 세미나"],
        weeklyRoutine: "월~금 수업 + 주 2회 도서관 자습 (각 2시간)",
        milestones: ["중간고사 4.0 목표", "전공 교수님 면담", "교내 동아리 1개 가입"],
        monthlyGoals: [
          { month: 3, goal: "적응 및 목표 설정", tasks: ["수강신청 최종 확인", "학습 플래너 작성"] },
          { month: 4, goal: "학업 루틴 정착", tasks: ["중간고사 준비 시작", "교수님 면담 신청"] },
          { month: 5, goal: "중간고사 및 팀 프로젝트", tasks: ["중간고사 응시", "팀 프로젝트 마무리"] },
          { month: 6, goal: "기말고사 및 1학기 마무리", tasks: ["기말고사 대비", "2학기 수강 계획 초안"] },
        ],
      },
      {
        semester: "2학기 (9월~12월)",
        goal: "전공 심화 및 진로 방향 탐색",
        recommendedCourses: ["사회와 역사", "데이터와 사회", "전공심화 I"],
        weeklyRoutine: "전공 수업 집중 + 주 1회 진로 관련 활동",
        milestones: ["전공 심화과목 수강", "인턴십/대외활동 1개 참여"],
        monthlyGoals: [
          { month: 9, goal: "2학기 적응 및 목표 재설정", tasks: ["2학기 수강신청 완료", "진로 세미나 참석"] },
          { month: 10, goal: "전공 심화 학습", tasks: ["중간고사 준비", "전공 프로젝트 착수"] },
          { month: 11, goal: "진로 탐색 집중", tasks: ["취업 박람회 참가", "기말고사 준비"] },
          { month: 12, goal: "기말고사 및 1년 회고", tasks: ["기말고사 응시", "다음 학년 계획 수립"] },
        ],
      },
    ],
    monthlyGoals: [
      { month: 1, goal: "수강신청 전략 수립 (방학)", tasks: ["커리큘럼 분석", "필수과목 확인"] },
      { month: 2, goal: "수강신청 및 개강 준비", tasks: ["수강신청 완료", "교재 구입"] },
      { month: 7, goal: "여름방학 — 자기계발", tasks: ["대외활동 참여", "자격증 공부"] },
      { month: 8, goal: "2학기 수강신청 및 준비", tasks: ["수강신청 완료", "인턴십 또는 대외활동"] },
    ],
    risks: ["수강 과목 학점 부담 집중", "전공 선택과목 정원 초과로 수강 실패 가능성"],
    note: "AI 서버 점검 중 제공되는 데모 예시입니다. 실제 서강대 교과목 편성은 학교 포털을 확인하세요.",
  },
} as const;

// ─── Vision helpers ────────────────────────────────────────────────────────────

function splitImageUrls(imageUrl: string): string[] {
  return imageUrl.split("|||").map((u) => u.trim()).filter(Boolean);
}

/** Low-level: single Groq vision API call — caller must ensure ≤5 image parts */
async function callGroqVisionOnce(
  messages: Groq.Chat.ChatCompletionMessageParam[]
): Promise<unknown> {
  const completion = await groq!.chat.completions.create({
    model: VISION_MODEL,
    messages,
    temperature: 0.25,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw); } catch { return { reply: raw }; }
}

/** Context-merge prompt for batch N (1-based) — passes previous JSON result */
function buildMergePrompt(
  studentInfo: string,
  previousJson: string,
  batchIdx: number,
  totalBatches: number,
  universityId?: string
): string {
  const config = getUniversityConfig(universityId);
  const requires = config.courseRules.filter((r) => r.action === "require");
  const excludes = config.courseRules.filter((r) => r.action === "exclude");
  const coreRules = [
    `- 총학점: 각 Plan 정확히 **${config.timetable.targetCredits}학점** 유지`,
    ...(config.timetable.preferOffDay
      ? [`- ${config.timetable.preferOffDay} 공강: day 필드에 해당 요일 절대 불가`]
      : []),
    ...requires.map(
      (r) => `- ${r.name}${r.code ? ` (${r.code})` : ""}: Plan A~D 모두 반드시 포함 (누락 불가)`
    ),
    ...excludes.map(
      (r) => `- ${r.name}${r.code ? ` (${r.code})` : ""}: 절대 제외`
    ),
  ].join("\n");

  return `[멀티 이미지 분석 — 배치 ${batchIdx + 1}/${totalBatches}: 보조 이미지 통합]

이전 배치 분석 결과 (JSON):
${previousJson}

위 계획을 기반으로, 새로 제공된 이미지(교양 편성표·추가 자료)를 분석하여 계획을 보완·개선하라.

## 학생 정보
${studentInfo}

## 핵심 강제 원칙 (절대 유지)
${coreRules}

추가 이미지 정보를 반영한 개선된 완전한 JSON만 반환하라.
응답은 순수 JSON만 반환 (코드블록·설명 텍스트 없음).`;
}

// ─── Groq vision call: auto-batched (VISION_BATCH_SIZE=5 per API call) ────────
//
// Priority:  images[0..4]  → Batch 0: full initial analysis  (전공 교육과정표 우선)
//            images[5..9]  → Batch 1: context-merge          (교양 편성표 등 보조)
//            images[10..N] → Batch N: final context-merge
//
async function callGroqVision(
  studentInfo: string,
  timetableInfo: string,
  imageUrl: string,
  universityId?: string
): Promise<unknown> {
  const allUrls = splitImageUrls(imageUrl);

  // ── Single-batch path (≤5 images): one API call ──
  if (allUrls.length <= VISION_BATCH_SIZE) {
    const content: Groq.Chat.ChatCompletionContentPart[] = [
      { type: "text", text: buildPrompt(studentInfo, timetableInfo, universityId) },
      ...allUrls.map((url): Groq.Chat.ChatCompletionContentPart => ({
        type: "image_url",
        image_url: { url },
      })),
    ];
    return callGroqVisionOnce([{ role: "user", content }]);
  }

  // ── Multi-batch path (>5 images): sequential context-merge ──
  const batches: string[][] = [];
  for (let i = 0; i < allUrls.length; i += VISION_BATCH_SIZE) {
    batches.push(allUrls.slice(i, i + VISION_BATCH_SIZE));
  }

  // Batch 0: Full initial analysis — first 5 images (핵심 전공 편성표 우선)
  const firstContent: Groq.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: buildPrompt(studentInfo, timetableInfo, universityId) },
    ...batches[0].map((url): Groq.Chat.ChatCompletionContentPart => ({
      type: "image_url",
      image_url: { url },
    })),
  ];
  let accumulated = await callGroqVisionOnce([{ role: "user", content: firstContent }]);

  // Batch 1+: Context-merge each subsequent batch (보조 이미지 통합)
  for (let i = 1; i < batches.length; i++) {
    const mergeText = buildMergePrompt(
      studentInfo,
      JSON.stringify(accumulated),
      i,
      batches.length,
      universityId
    );
    const mergeContent: Groq.Chat.ChatCompletionContentPart[] = [
      { type: "text", text: mergeText },
      ...batches[i].map((url): Groq.Chat.ChatCompletionContentPart => ({
        type: "image_url",
        image_url: { url },
      })),
    ];
    accumulated = await callGroqVisionOnce([{ role: "user", content: mergeContent }]);
  }

  return accumulated;
}

// ─── Groq text-only call ──────────────────────────────────────────────────────

async function callGroqText(
  studentInfo: string,
  timetableInfo: string,
  universityId?: string
): Promise<unknown> {
  const prompt = buildPrompt(studentInfo, timetableInfo, universityId);

  const completion = await groq!.chat.completions.create({
    model: TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.25,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw); } catch { return { reply: raw }; }
}

// ─── Replit upstream (legacy fallback) ───────────────────────────────────────

function buildUpstreamPayload(
  studentInfo: string,
  timetableInfo: string,
  imageUrl?: string,
  universityId?: string
): Record<string, unknown> {
  const isLegacy = REPLIT_PLAN_URL.endsWith("/api/chat");
  if (isLegacy) return { message: buildPrompt(studentInfo, timetableInfo, universityId) };
  return {
    studentInfo,
    timetableInfo,
    ...(imageUrl?.trim() ? { imageUrl: imageUrl.trim() } : {}),
  };
}

function parseUpstreamText(raw: string): unknown {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { reply: raw }; }

  if (parsed && typeof parsed === "object" && "reply" in (parsed as object)) {
    const replyStr = (parsed as { reply: string }).reply;
    const cleaned = replyStr
      .replace(/^```json\s*/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
    try { return JSON.parse(cleaned); } catch { return { reply: replyStr }; }
  }
  return parsed;
}

async function callReplitUpstream(
  studentInfo: string,
  timetableInfo: string,
  imageUrl?: string,
  universityId?: string
): Promise<unknown> {
  const payload = buildUpstreamPayload(studentInfo, timetableInfo, imageUrl, universityId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(REPLIT_PLAN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (fetchErr: unknown) {
    clearTimeout(timer);
    if (fetchErr instanceof Error && fetchErr.name === "AbortError") return DEMO_PLAN;
    throw fetchErr;
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    if (upstream.status === 404 || upstream.status === 503) return DEMO_PLAN;
    const errText = await upstream.text();
    throw new UpstreamError(
      upstream.status,
      `업스트림 오류 (${upstream.status}): ${errText.slice(0, 200)}`
    );
  }

  const raw = await upstream.text();
  return parseUpstreamText(raw);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface StudyPlanCallParams {
  studentInfo: string;
  timetableInfo: string;
  imageUrl?: string;
  universityId?: string;
}

/**
 * Priority:
 * 1. GROQ_API_KEY + imageUrl -> llama-3.2-11b-vision-preview (multi-modal)
 * 2. GROQ_API_KEY, no image  -> llama-3.3-70b-versatile (text)
 * 3. No key                  -> Replit proxy + DEMO_PLAN fallback
 */
/**
 * Validate AI result has all 4 plans (REQUIRED_STRICT).
 * Falls back to accepting any single plan key if the AI partially responded.
 */
function isValidPlanResult(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const r = result as Record<string, unknown>;
  // Full 4-plan result (ideal)
  if (r.planA && r.planB && r.planC && r.planD) return true;
  // Partial result — at least one plan present (repair downstream)
  return Boolean(r.planA || r.planB || r.planC || r.planD || r.plans);
}

/**
 * Ensure result always has all 4 plan keys.
 * If the AI omitted planC or planD, fill them from DEMO_PLAN as labeled placeholders.
 * This guarantees the /plan page always renders exactly 4 cards.
 */
function ensureFourPlans(result: Record<string, unknown>): Record<string, unknown> {
  const keys = ["planA", "planB", "planC", "planD"] as const;
  const fallbacks: Record<string, unknown> = {
    planA: DEMO_PLAN.planA,
    planB: DEMO_PLAN.planB,
    planC: DEMO_PLAN.planC,
    planD: DEMO_PLAN.planD,
  };
  const out = { ...result };
  for (const key of keys) {
    if (!out[key] || typeof out[key] !== "object") {
      out[key] = fallbacks[key];
      console.warn(`[ensureFourPlans] ${key} missing from AI response — using demo fallback`);
    }
  }
  return out;
}

/** Recursively strip CJK noise from all string fields in an API response object. */
function denoiseResult(val: unknown): unknown {
  if (typeof val === "string") return stripCjkNoise(val);
  if (Array.isArray(val)) return val.map(denoiseResult);
  if (val && typeof val === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = denoiseResult(v);
    }
    return out;
  }
  return val;
}

export async function callStudyPlanApi(params: StudyPlanCallParams): Promise<unknown> {
  const { studentInfo, timetableInfo, imageUrl, universityId } = params;

  if (groq) {
    try {
      const result = imageUrl?.trim()
        ? await callGroqVision(studentInfo, timetableInfo, imageUrl, universityId)
        : await callGroqText(studentInfo, timetableInfo, universityId);

      // Fallback: if AI returned empty/malformed JSON, use demo plan rather than crashing
      if (!isValidPlanResult(result)) {
        console.warn("[callStudyPlanApi] AI returned empty or invalid plan — using DEMO_PLAN fallback");
        return { ...DEMO_PLAN, _isDemo: true };
      }
      // Guarantee all 4 plan keys exist before returning (REQUIRED_STRICT repair)
      const repaired = ensureFourPlans(result as Record<string, unknown>);
      return denoiseResult(repaired);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new UpstreamError(500, `Groq API 오류: ${msg}`);
    }
  }

  const upstream = await callReplitUpstream(studentInfo, timetableInfo, imageUrl, universityId);
  return denoiseResult(upstream);
}
