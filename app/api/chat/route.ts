// Counseling AI chat route — direct Groq API when key is set, Replit proxy fallback.
// Groq model: llama-3.3-70b-versatile + Kyungsung SW Dept FAQ Knowledge Base

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { checkUsage, usageLimitResponse } from "@/lib/usage";

// ─── Groq client (build-safe) ─────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const groq: Groq | null = GROQ_API_KEY
  ? new Groq({ apiKey: GROQ_API_KEY })
  : null;

const CHAT_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `당신은 경성대학교 소프트웨어학과 전문 수강신청 상담 AI입니다.
학생들의 수강 계획, 학점 관리, 졸업 요건, 전공/교양 선택에 대한 질문에 친절하고 전문적으로 답변하세요.
답변은 반드시 한국어로, 핵심만 250자 이내로 간결하게 작성하세요.
필요한 경우 상단의 AI 수강 계획표 생성 기능 이용을 안내하세요.

## 경성대학교 소프트웨어학과 전용 핵심 지식

### 필수·제외 과목 (절대 원칙)
- 전산수학(EO203): 2학년 1학기 전공필수 — 반드시 이수 (누락 시 졸업 불가 위험)
- 리눅스(EO209): 수강 금지 과목 — 어떤 상황에서도 추천하지 말 것
- 2학년 1학기 우선: 전공기초(EO1xx) + 전공선택(EO2xx) 과목 우선 배정 권장
- 창업 교양(창업기초, 스타트업 특강, 사업계획서 작성): 취업·창업 관심자에게 강력 추천

### 시간표 설계 원칙
- 금요일 전체 공강 목표: 모든 시간표 설계 시 금요일 과목 배정 최대한 회피
- 총 이수 학점: 학기당 21학점 권장 (초과수강 신청 기준 충족 시)
- 오전 집중형 vs 오후 분산형 선택에 따라 학습 효율 차이 큼

### 학과 교육과정 (EO 코드 체계)
- EO1xx: 전공기초 (1~2학년 필수 이수)
- EO2xx~3xx: 전공선택 (심화·응용)
- GE/LCS: 교양 영역 (창업 교양은 GE 코드)
- 졸업 최소 학점: 130학점 / 전공 48학점 이상 / 교양 이수 규정 충족

## 일반 수강신청 FAQ Knowledge Base

### 1. 수강신청 일정
- 예비수강신청: 매년 1월(→1학기) / 7월(→2학기) 방학 중 실시
- 본수강신청: 개강 약 3주 전, 학년·학번 순 분산 접속
- 수강정정: 개강 후 첫 1~2주간 (포털 공지 확인 필수)
- 수강취소: 학기 중반 이전까지 가능 — W 처리로 평점 영향 없음

### 2. 학점 이수 요건
- 졸업 최소 학점: 130학점 이상
- 전공필수+전공선택: 48학점 이상
- 교양 이수: 학교 공지 기준 충족
- 학기당 최대 수강: 일반 18학점 / 성적 우수자 초과수강 21학점

### 3. 평점 계산 (4.5 만점)
- A+ = 4.5, A0 = 4.0, B+ = 3.5, B0 = 3.0
- C+ = 2.5, C0 = 2.0, D+ = 1.5, D0 = 1.0, F = 0.0
- 평점 = (각 과목 학점 × 등급 점수 합계) ÷ 전체 이수 학점
- P/F 과목·재수강(R) 과목은 별도 규정 적용

### 4. 재수강 제도
- 동일 과목 재이수 시 기존 성적 삭제 후 새 성적으로 교체
- 최대 3회까지 재수강 가능, 성적표에 R 표시
- 재수강 총 학점 한도 있음 (학칙 확인 권장)

### 5. 복수전공 / 부전공
- 복수전공: 해당 학과 전공 42학점 이상 이수
- 부전공: 해당 학과 전공 21학점 이상 이수
- 신청: 2학년 진급 후 학사지원팀 신청

### 6. 수강신청 꿀팁
- 선후수 관계(선이수 요건) 사전 확인 필수 — EO203은 별도 선이수 없음
- 인기 강좌(전산수학 등)는 예비수강신청 시 선점
- 수강정정 기간 적극 활용해 시간표 최적화
- 에브리타임 강의평가 참고해 교수 강의력 확인

### 7. 기타
- 계절학기(하계/동계): 별도 수강신청, 최대 6학점
- 성적 이의신청: 성적 발표 후 1주일 이내 포털에서 신청
- 학사지원팀 문의: 경성대 포털 → 학사안내`;

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
