// Groq/Replit study-plan API client: prompt builder, upstream caller, response parser.
// Exported from here so route handlers stay thin.

// ─── Config ───────────────────────────────────────────────────────────────────

const REPLIT_PLAN_URL =
  process.env.REPLIT_PLAN_URL ??
  process.env.REPLIT_API_URL ??
  "https://groq-chatbot-backend--ghimdohyun.replit.app/api/generate-plan";

const UPSTREAM_TIMEOUT_MS = 45_000;

// ─── Error type ───────────────────────────────────────────────────────────────

/** Thrown when upstream returns an unexpected non-2xx status. */
export class UpstreamError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildPrompt(
  studentInfo: string,
  timetableInfo: string
): string {
  return `[수강 계획표 AI 생성 요청]

## 학생 정보
${studentInfo}

## 시간표 / 지침서
${timetableInfo || "없음"}

## 지시 사항
1. 반드시 실제 교과목 편성표에 존재하는 과목만 추천하라. 과목코드 앞부분 기준:
   - COR (공통필수): 모든 학생이 이수해야 하는 필수 과목이므로 우선 배치하라.
   - LCS (공통선택): 학생의 관심 분야에 맞는 과목을 선별하라.
   - HFS (인문사회): 인문·사회 계열 교양 과목으로 학점 보충 시 활용하라.
   - 기타 코드(전공필수/전공선택)는 학생의 학과·학년 조건을 엄격히 확인하라.
2. Plan A~D는 각기 다른 전략을 가져야 한다 (예: 학점 극대화 / 진로 집중 / 균형 / 여유 전략).
3. yearPlan은 1학기(3~6월), 2학기(9~12월) 및 12개월 월별 목표를 모두 포함하라.
4. courses 배열 각 항목에 code, requirement, credits, target 필드를 채워라.
5. 응답은 아래 JSON 구조만 반환하라. 설명 텍스트, 마크다운 코드블록 없이 순수 JSON만.

{
  "planA": {
    "title": "전략명",
    "strategy": "전략 설명",
    "courses": [
      { "code": "COR-101", "name": "과목명", "credits": 3, "requirement": "공통필수", "target": "1학년", "day": "월수", "time": "09:00" }
    ],
    "totalCredits": 18
  },
  "planB": { "title": "", "strategy": "", "courses": [], "totalCredits": 0 },
  "planC": { "title": "", "strategy": "", "courses": [], "totalCredits": 0 },
  "planD": { "title": "", "strategy": "", "courses": [], "totalCredits": 0 },
  "yearPlan": {
    "semesters": [
      {
        "semester": "1학기 (3월~6월)",
        "goal": "학기 목표",
        "recommendedCourses": ["과목명1"],
        "weeklyRoutine": "주간 루틴 설명",
        "milestones": ["마일스톤1"],
        "monthlyGoals": [
          { "month": 3, "goal": "3월 목표", "tasks": ["할일1"] },
          { "month": 4, "goal": "4월 목표", "tasks": [] },
          { "month": 5, "goal": "5월 목표", "tasks": [] },
          { "month": 6, "goal": "6월 목표", "tasks": [] }
        ]
      },
      {
        "semester": "2학기 (9월~12월)",
        "goal": "",
        "recommendedCourses": [],
        "weeklyRoutine": "",
        "milestones": [],
        "monthlyGoals": [
          { "month": 9, "goal": "", "tasks": [] },
          { "month": 10, "goal": "", "tasks": [] },
          { "month": 11, "goal": "", "tasks": [] },
          { "month": 12, "goal": "", "tasks": [] }
        ]
      }
    ],
    "monthlyGoals": [
      { "month": 1, "goal": "1월 목표", "tasks": [] },
      { "month": 2, "goal": "2월 목표", "tasks": [] },
      { "month": 3, "goal": "", "tasks": [] },
      { "month": 4, "goal": "", "tasks": [] },
      { "month": 5, "goal": "", "tasks": [] },
      { "month": 6, "goal": "", "tasks": [] },
      { "month": 7, "goal": "7월 목표 (방학)", "tasks": [] },
      { "month": 8, "goal": "8월 목표 (방학)", "tasks": [] },
      { "month": 9, "goal": "", "tasks": [] },
      { "month": 10, "goal": "", "tasks": [] },
      { "month": 11, "goal": "", "tasks": [] },
      { "month": 12, "goal": "", "tasks": [] }
    ],
    "risks": ["리스크 예시"],
    "note": ""
  }
}`;
}

// ─── Demo fallback ────────────────────────────────────────────────────────────

/** Returned when the upstream is unavailable (timeout / 404 / 503). */
export const DEMO_PLAN = {
  _isDemo: true,
  planA: {
    title: "학점 극대화 전략",
    strategy:
      "COR 공통필수를 1학년에 집중 이수하고, LCS 선택과목으로 역량을 다집니다.",
    courses: [
      { code: "COR-101", name: "인간의 탐구", credits: 3, requirement: "공통필수", target: "전체", day: "월수", time: "09:00" },
      { code: "COR-102", name: "자연의 이해", credits: 3, requirement: "공통필수", target: "전체", day: "화목", time: "10:30" },
      { code: "COR-103", name: "사회와 역사", credits: 3, requirement: "공통필수", target: "전체", day: "월수", time: "14:00" },
      { code: "LCS-201", name: "비판적 사고와 글쓰기", credits: 3, requirement: "공통선택", target: "전체", day: "화", time: "13:00" },
      { code: "HFS-101", name: "철학의 이해", credits: 3, requirement: "인문사회", target: "전체", day: "목", time: "15:00" },
      { code: "전공기초-001", name: "전공입문 세미나", credits: 3, requirement: "전공필수", target: "1학년", day: "금", time: "10:00" },
    ],
    totalCredits: 18,
  },
  planB: {
    title: "진로 집중 전략",
    strategy:
      "진로 연계 LCS 선택과목과 전공 기초를 우선 배치하여 취업 역량을 강화합니다.",
    courses: [
      { code: "COR-101", name: "인간의 탐구", credits: 3, requirement: "공통필수", target: "전체", day: "화목", time: "09:00" },
      { code: "LCS-202", name: "데이터와 사회", credits: 3, requirement: "공통선택", target: "전체", day: "월수", time: "11:00" },
      { code: "LCS-203", name: "창의적 문제해결", credits: 3, requirement: "공통선택", target: "전체", day: "화", time: "14:00" },
      { code: "전공기초-001", name: "전공입문 세미나", credits: 3, requirement: "전공필수", target: "1학년", day: "월수", time: "09:00" },
      { code: "전공선택-101", name: "전공심화 I", credits: 3, requirement: "전공선택", target: "1학년", day: "목", time: "13:00" },
    ],
    totalCredits: 15,
  },
  planC: {
    title: "균형 전략",
    strategy: "필수·선택·교양을 균형 있게 배치하여 전인적 역량을 개발합니다.",
    courses: [
      { code: "COR-101", name: "인간의 탐구", credits: 3, requirement: "공통필수", target: "전체", day: "월수", time: "10:30" },
      { code: "COR-104", name: "예술과 문화", credits: 3, requirement: "공통필수", target: "전체", day: "화목", time: "13:00" },
      { code: "LCS-201", name: "비판적 사고와 글쓰기", credits: 3, requirement: "공통선택", target: "전체", day: "수", time: "14:00" },
      { code: "HFS-102", name: "사회학 입문", credits: 3, requirement: "인문사회", target: "전체", day: "화", time: "10:30" },
      { code: "전공기초-001", name: "전공입문 세미나", credits: 3, requirement: "전공필수", target: "1학년", day: "금", time: "09:00" },
    ],
    totalCredits: 15,
  },
  planD: {
    title: "여유 전략",
    strategy:
      "적정 학점(12학점)을 유지하며 대학 생활 적응과 자기계발에 집중합니다.",
    courses: [
      { code: "COR-101", name: "인간의 탐구", credits: 3, requirement: "공통필수", target: "전체", day: "화목", time: "10:30" },
      { code: "LCS-201", name: "비판적 사고와 글쓰기", credits: 3, requirement: "공통선택", target: "전체", day: "월", time: "14:00" },
      { code: "HFS-101", name: "철학의 이해", credits: 3, requirement: "인문사회", target: "전체", day: "수", time: "11:00" },
      { code: "전공기초-001", name: "전공입문 세미나", credits: 3, requirement: "전공필수", target: "1학년", day: "목", time: "15:00" },
    ],
    totalCredits: 12,
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
          { month: 3, goal: "대학 생활 적응 및 목표 설정", tasks: ["수강신청 최종 확인", "학습 플래너 작성", "도서관 이용 숙지"] },
          { month: 4, goal: "학업 루틴 정착", tasks: ["중간고사 준비 시작", "교수님 면담 신청"] },
          { month: 5, goal: "중간고사 및 팀 프로젝트", tasks: ["중간고사 응시", "팀 프로젝트 마무리"] },
          { month: 6, goal: "기말고사 및 1학기 마무리", tasks: ["기말고사 대비 집중 학습", "2학기 수강 계획 초안"] },
        ],
      },
      {
        semester: "2학기 (9월~12월)",
        goal: "전공 심화 및 진로 방향 탐색",
        recommendedCourses: ["사회와 역사", "데이터와 사회", "전공심화 I"],
        weeklyRoutine: "전공 수업 집중 + 주 1회 진로 관련 활동",
        milestones: ["전공 심화과목 수강", "인턴십/대외활동 1개 참여", "자격증 취득 계획 수립"],
        monthlyGoals: [
          { month: 9, goal: "2학기 적응 및 목표 재설정", tasks: ["2학기 수강신청 완료", "진로 세미나 참석"] },
          { month: 10, goal: "전공 심화 학습", tasks: ["중간고사 준비", "전공 관련 프로젝트 착수"] },
          { month: 11, goal: "진로 탐색 집중", tasks: ["취업 박람회 참가", "기말고사 준비 시작"] },
          { month: 12, goal: "기말고사 및 1년 회고", tasks: ["기말고사 응시", "1년 학습 회고", "다음 학년 계획 수립"] },
        ],
      },
    ],
    monthlyGoals: [
      { month: 1, goal: "수강신청 전략 수립 (방학)", tasks: ["커리큘럼 분석", "필수과목 확인", "시간표 초안"] },
      { month: 2, goal: "수강신청 및 개강 준비", tasks: ["수강신청 완료", "교재 구입", "학습 환경 정비"] },
      { month: 3, goal: "1학기 시작 — 적응", tasks: ["수업 참여 및 노트 정리", "교수님 면담"] },
      { month: 4, goal: "학업 루틴 안정화", tasks: ["중간고사 준비", "팀 활동 적극 참여"] },
      { month: 5, goal: "중간고사 및 전공 탐색", tasks: ["중간고사 응시", "전공 선배 멘토링"] },
      { month: 6, goal: "기말고사 및 1학기 결산", tasks: ["기말고사 응시", "학점 결과 확인", "2학기 계획"] },
      { month: 7, goal: "여름방학 — 자기계발 (방학)", tasks: ["대외활동 참여", "자격증 공부", "독서 2권"] },
      { month: 8, goal: "2학기 수강신청 및 준비 (방학)", tasks: ["수강신청 완료", "인턴십 또는 대외활동"] },
      { month: 9, goal: "2학기 시작 — 심화 학습", tasks: ["전공 집중 학습", "진로 세미나 참석"] },
      { month: 10, goal: "전공 프로젝트 진행", tasks: ["팀 프로젝트 착수", "중간고사 준비"] },
      { month: 11, goal: "취업·진로 탐색", tasks: ["취업 박람회 참가", "기말고사 준비"] },
      { month: 12, goal: "기말고사 및 1년 회고", tasks: ["기말고사", "성적 확인", "내년도 계획 수립"] },
    ],
    risks: [
      "수강 과목 학점 부담 집중",
      "전공 선택과목 정원 초과로 수강 실패 가능성",
      "방학 중 자기계발 소홀",
    ],
    note: "⚠️ AI 서버 점검 중 제공되는 데모 예시입니다. 실제 서강대 교과목 편성은 학교 포털을 확인하세요.",
  },
} as const;

// ─── Upstream payload builder ─────────────────────────────────────────────────

function buildUpstreamPayload(
  studentInfo: string,
  timetableInfo: string,
  imageUrl?: string
): Record<string, unknown> {
  const isLegacy = REPLIT_PLAN_URL.endsWith("/api/chat");
  if (isLegacy) {
    return { message: buildPrompt(studentInfo, timetableInfo) };
  }
  return {
    studentInfo,
    timetableInfo,
    ...(imageUrl?.trim() ? { imageUrl: imageUrl.trim() } : {}),
  };
}

// ─── Response parser ──────────────────────────────────────────────────────────

/**
 * Parses the upstream response text.
 * Handles the wrapped { reply: "..." } format Replit sometimes returns.
 */
function parseUpstreamText(raw: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { reply: raw };
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    "reply" in (parsed as object)
  ) {
    const replyStr = (parsed as { reply: string }).reply;
    const cleaned = replyStr
      .replace(/^```json\s*/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return { reply: replyStr };
    }
  }

  return parsed;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface StudyPlanCallParams {
  studentInfo: string;
  timetableInfo: string;
  imageUrl?: string;
}

/**
 * Calls the Groq/Replit study-plan backend.
 * - Returns DEMO_PLAN on timeout, 404, or 503 (upstream sleeping).
 * - Throws UpstreamError on other non-2xx responses.
 * - Throws on network errors unrelated to timeouts.
 */
export async function callStudyPlanApi(
  params: StudyPlanCallParams
): Promise<unknown> {
  const { studentInfo, timetableInfo, imageUrl } = params;
  const payload = buildUpstreamPayload(studentInfo, timetableInfo, imageUrl);

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
    if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
      return DEMO_PLAN; // timeout → demo fallback
    }
    throw fetchErr; // network error — propagate
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    if (upstream.status === 404 || upstream.status === 503) {
      return DEMO_PLAN; // sleeping backend → demo fallback
    }
    const errText = await upstream.text();
    throw new UpstreamError(
      upstream.status,
      `업스트림 오류 (${upstream.status}): ${errText.slice(0, 200)}`
    );
  }

  const raw = await upstream.text();
  return parseUpstreamText(raw);
}
