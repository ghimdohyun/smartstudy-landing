// Multi-university Knowledge Base — Universal Schema, pre-built configs, prompt builders
// Modular by design: add a new UniversityConfig → all prompts adapt automatically.

// ─── Universal Schema ─────────────────────────────────────────────────────────

export interface CourseRule {
  code?: string;
  name: string;
  action: "require" | "exclude";
  /** e.g. "2학년 1학기", "Plan C/D 교양 가중치" */
  semesterHint?: string;
}

export interface CategoryRequirement {
  name: string;        // "전공기초", "공통필수"
  code?: string;       // "EO1xx", "COR"
  minCredits: number;
}

export interface GraduationConfig {
  totalCredits: number;
  majorCredits: number;
  categories: CategoryRequirement[];
}

export interface TimetableConfig {
  targetCredits: number;   // per-semester target (e.g. 21)
  preferOffDay?: string;   // "금요일"
}

/** Universal university configuration schema */
export interface UniversityConfig {
  id: string;              // unique slug, e.g. "kyungsung-sw"
  name: string;            // 경성대학교
  department: string;      // 소프트웨어학과
  year?: number;           // curriculum year, e.g. 2025
  courseCodeSystem: string;
  courseRules: CourseRule[];
  graduation: GraduationConfig;
  timetable: TimetableConfig;
  notes?: string;
}

// ─── Pre-built Configs ────────────────────────────────────────────────────────

const KYUNGSUNG_SW: UniversityConfig = {
  id: "kyungsung-sw",
  name: "경성대학교",
  department: "소프트웨어학과",
  year: 2025,
  courseCodeSystem: "EO 코드 — EO1xx: 전공기초 / EO2xx~3xx: 전공선택 / GE: 교양",
  courseRules: [
    { code: "EO203", name: "전산수학", action: "require", semesterHint: "2학년 1학기" },
    { code: "EO209", name: "리눅스", action: "exclude" },
    { name: "창업기초", action: "require", semesterHint: "Plan C/D 교양 가중치" },
  ],
  graduation: {
    totalCredits: 130,
    majorCredits: 48,
    categories: [
      { name: "전공기초", code: "EO1xx", minCredits: 18 },
      { name: "전공선택", code: "EO2xx", minCredits: 30 },
      { name: "교양", code: "GE", minCredits: 20 },
    ],
  },
  timetable: { targetCredits: 21, preferOffDay: "금요일" },
  notes: "2학년 1학기 우선: EO1xx + EO2xx 과목 우선 배정",
};

const SOGANG_GENERAL: UniversityConfig = {
  id: "sogang-general",
  name: "서강대학교",
  department: "일반 (범학과 공통)",
  year: 2025,
  courseCodeSystem: "COR(공통필수) / LCS(공통선택) / HFS(인문사회) / 전공 코드",
  courseRules: [
    { code: "COR", name: "공통필수 과목", action: "require", semesterHint: "전 학년" },
    { code: "LCS", name: "비판적 사고와 글쓰기", action: "require", semesterHint: "1~2학년 이수 권장" },
  ],
  graduation: {
    totalCredits: 130,
    majorCredits: 48,
    categories: [
      { name: "COR 공통필수", code: "COR", minCredits: 18 },
      { name: "LCS 공통선택", code: "LCS", minCredits: 6 },
      { name: "HFS 인문사회", code: "HFS", minCredits: 6 },
      { name: "전공필수+선택", minCredits: 48 },
    ],
  },
  timetable: { targetCredits: 18 },
  notes: "예비수강신청 시 COR 과목 우선 선점 권장",
};

const GENERIC: UniversityConfig = {
  id: "generic",
  name: "기타 대학교",
  department: "범용",
  courseCodeSystem: "학교별 과목 코드 체계 (포털 또는 편람 확인)",
  courseRules: [],
  graduation: {
    totalCredits: 130,
    majorCredits: 45,
    categories: [
      { name: "전공필수", minCredits: 21 },
      { name: "전공선택", minCredits: 24 },
      { name: "교양", minCredits: 30 },
    ],
  },
  timetable: { targetCredits: 18 },
};

/** All pre-built university configurations */
export const UNIVERSITY_PRESETS: UniversityConfig[] = [
  KYUNGSUNG_SW,
  SOGANG_GENERAL,
  GENERIC,
];

const UNIVERSITY_MAP: Record<string, UniversityConfig> = Object.fromEntries(
  UNIVERSITY_PRESETS.map((u) => [u.id, u])
);

/** Returns a UniversityConfig by id, falling back to GENERIC */
export function getUniversityConfig(id?: string): UniversityConfig {
  if (!id) return GENERIC;
  return UNIVERSITY_MAP[id] ?? GENERIC;
}

// ─── Pattern Recognition: filename/metadata → university ID ──────────────────

/** Infers university ID from PDF filename or metadata string */
export function detectUniversityFromFilename(filename: string): string {
  const s = filename.toLowerCase();
  if (s.includes("경성") || s.includes("kyungsung") || s.includes("eo203")) return "kyungsung-sw";
  if (s.includes("서강") || s.includes("sogang") || s.includes("cor-")) return "sogang-general";
  return "generic";
}

// ─── Graduation Requirement Extractor (modular pattern) ──────────────────────

/** Extracts a structured graduation requirement summary from any UniversityConfig */
export function extractGraduationSummary(config: UniversityConfig): string {
  const { graduation: g, timetable: t } = config;
  const lines = [
    `졸업 최소 학점: ${g.totalCredits}학점`,
    `전공 이수: ${g.majorCredits}학점 이상`,
    ...g.categories.map(
      (c) => `  - ${c.name}${c.code ? ` (${c.code})` : ""}: ${c.minCredits}학점 이상`
    ),
    `학기당 권장 학점: ${t.targetCredits}학점`,
  ];
  if (t.preferOffDay) lines.push(`공강 목표 요일: ${t.preferOffDay}`);
  return lines.join("\n");
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────

/**
 * Builds the chat system prompt for a given university.
 * Replaces any hardcoded university-specific text.
 */
export function buildChatSystemPrompt(config: UniversityConfig): string {
  const requireRules = config.courseRules.filter((r) => r.action === "require");
  const excludeRules = config.courseRules.filter((r) => r.action === "exclude");

  const requireSection =
    requireRules.length > 0
      ? requireRules
          .map(
            (r) =>
              `- ${r.name}${r.code ? ` (${r.code})` : ""}: 필수 이수${r.semesterHint ? ` — ${r.semesterHint}` : ""}`
          )
          .join("\n")
      : "- 학교 학칙에 따른 전공 필수 과목 이수";

  const excludeSection =
    excludeRules.length > 0
      ? `\n### 제외 과목\n${excludeRules
          .map((r) => `- ${r.name}${r.code ? ` (${r.code})` : ""}: 수강 금지`)
          .join("\n")}`
      : "";

  return `당신은 ${config.name} ${config.department} 전문 수강신청 상담 AI입니다.
학생들의 수강 계획, 학점 관리, 졸업 요건, 전공/교양 선택에 대한 질문에 친절하고 전문적으로 답변하세요.
답변은 반드시 한국어로, 핵심만 250자 이내로 간결하게 작성하세요.
필요한 경우 AI 수강 계획표 생성 기능 이용을 안내하세요.

## ${config.name} ${config.department} 전용 지식

### 교과목 코드 체계
${config.courseCodeSystem}

### 이수 필수 규칙
${requireSection}${excludeSection}

### 졸업 요건
${extractGraduationSummary(config)}${config.notes ? `\n\n### 추가 안내\n${config.notes}` : ""}

## 일반 수강신청 FAQ

### 수강신청 일정
- 예비수강신청 → 본수강신청 → 수강정정 (포털 공지 확인)
- 수강취소: 학기 중반 이전, W 처리로 평점 영향 없음

### 평점 계산 (4.5 만점)
- A+ = 4.5, A0 = 4.0, B+ = 3.5, B0 = 3.0
- C+ = 2.5, C0 = 2.0, D+ = 1.5, D0 = 1.0, F = 0.0
- 평점 = (학점 × 등급 점수 합계) ÷ 전체 이수 학점

### 재수강 제도
- 동일 과목 재이수 시 기존 성적 삭제 후 새 성적으로 교체
- 최대 3회까지 재수강 가능 (학칙 확인)

### 복수전공 / 부전공
- 복수전공: 해당 학과 전공 42학점 이상
- 부전공: 해당 학과 전공 21학점 이상`;
}

/**
 * Builds university-specific constraints section for the study plan prompt.
 * Injects into buildPrompt() to make it multi-university aware.
 */
export function buildPlanPromptRules(config: UniversityConfig): string {
  const requireRules = config.courseRules.filter((r) => r.action === "require");
  const excludeRules = config.courseRules.filter((r) => r.action === "exclude");

  const lines: string[] = [
    `## ${config.name} ${config.department} 전용 강제 지침 (최우선 적용)`,
    `1. 총 이수 학점: Plan A~D 각각 정확히 **${config.timetable.targetCredits}학점** (엄격히 준수)`,
  ];

  if (config.timetable.preferOffDay) {
    lines.push(
      `2. ${config.timetable.preferOffDay} 전체 공강: 모든 Plan에서 해당 요일 배정 **절대 금지** — courses의 day 필드에 해당 요일 불가`
    );
  }

  requireRules.forEach((r, i) => {
    lines.push(
      `${i + 3}. ${r.name}${r.code ? ` (${r.code})` : ""}: **모든 Plan에 반드시 포함**${r.semesterHint ? ` — ${r.semesterHint}` : ""}`
    );
  });

  if (excludeRules.length > 0) {
    lines.push("");
    lines.push("### 제외 과목 (모든 Plan에서 절대 배제)");
    excludeRules.forEach((r) => {
      lines.push(`- ${r.name}${r.code ? ` (${r.code})` : ""}: 수강 금지`);
    });
  }

  lines.push("");
  lines.push("### 이수 구분 코드");
  lines.push(config.courseCodeSystem);

  if (config.notes) {
    lines.push("");
    lines.push("### 학과 안내");
    lines.push(config.notes);
  }

  lines.push("");
  lines.push("### 졸업 요건 (참고)");
  lines.push(extractGraduationSummary(config));

  return lines.join("\n");
}
