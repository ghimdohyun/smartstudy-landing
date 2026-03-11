/**
 * 경성대학교 소프트웨어학과 표준 커리큘럼 — Source of Truth (로컬 하드코딩)
 *
 * ★ CONFIRMED (공식 출처 확인된 과목):
 *   EO203 전산수학    — 2학년 전공기초 필수
 *   EO209 리눅스시스템 — 2학년 전공기초 필수
 *
 * ★ STANDARD (표준 SW학과 커리큘럼 기반 — PDF 파싱 불안정 시 대체 사용):
 *   나머지 과목은 경성대 소프트웨어학과 편람 구조에 맞춰 구성.
 *   실제 과목명·코드는 학교 포털 확인 권장.
 *
 * 사용 방법:
 *   getKsuSwCoursesForYear(year)           — 특정 학년 전체 과목
 *   getKsuSwCoursesForSemester(year, sem)  — 특정 학년·학기 과목
 *   getCoreCoursesForYear(year)            — 전공필수/전공기초만
 *   buildKsuSotBlock(year, semester?)      — AI 프롬프트 주입용 텍스트
 */

import type { Course } from "@/types";

// ─── Extended type (year/semester 메타 포함) ──────────────────────────────────

export interface KsuCourse extends Course {
  /** 권장 학년 1-4 */
  year: 1 | 2 | 3 | 4;
  /** 개설 학기 */
  semester: 1 | 2;
  /**
   * true = 전공필수/전공기초 (반드시 이수 필요)
   * false = 전공선택 (선택 이수)
   */
  isCore: boolean;
  /**
   * true  = 공식 편람/공식 출처에서 확인된 과목
   * false = 표준 SW학과 커리큘럼 기반 추정 과목
   */
  isConfirmed: boolean;
}

// ─── Curriculum Master Table ──────────────────────────────────────────────────

export const KSU_SW_COURSES: KsuCourse[] = [

  // ════════════════════════════════════════════════════════
  // 1학년
  // ════════════════════════════════════════════════════════

  // 1-1
  {
    code: "EO101", name: "컴퓨팅사고와프로그래밍", credits: 3,
    requirement: "전공기초", target: "1학년",
    day: "월수", time: "09:00",
    year: 1, semester: 1, isCore: true, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO104", "EO210"],
  },
  {
    code: "EO102", name: "웹프로그래밍기초", credits: 3,
    requirement: "전공기초", target: "1학년",
    day: "화목", time: "09:00",
    year: 1, semester: 1, isCore: true, isConfirmed: false,
  },
  {
    code: "EO103", name: "이산수학", credits: 3,
    requirement: "전공기초", target: "1학년",
    day: "월수", time: "10:30",
    year: 1, semester: 1, isCore: true, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO203", "EO211"],
  },

  // 1-2
  {
    code: "EO104", name: "C프로그래밍언어", credits: 3,
    requirement: "전공기초", target: "1학년",
    day: "월수", time: "09:00",
    year: 1, semester: 2, isCore: true, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO204", "EO209"],
  },
  {
    code: "EO105", name: "컴퓨터구조의이해", credits: 3,
    requirement: "전공기초", target: "1학년",
    day: "화목", time: "09:00",
    year: 1, semester: 2, isCore: true, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO209", "EO213"],
  },
  {
    code: "EO106", name: "선형대수학", credits: 3,
    requirement: "전공기초", target: "1학년",
    day: "월수금", time: "10:30",
    year: 1, semester: 2, isCore: true, isConfirmed: false,
  },

  // ════════════════════════════════════════════════════════
  // 2학년  ★ EO203·EO209 = CONFIRMED (공식 출처)
  // ════════════════════════════════════════════════════════

  // 2-1
  {
    code: "EO203", name: "전산수학", credits: 3,
    requirement: "전공기초", target: "2학년",
    day: "월수", time: "09:00",
    year: 2, semester: 1, isCore: true, isConfirmed: true,    // ★ CONFIRMED
    isPrerequisite: true, prerequisiteFor: ["EO211", "EO303"],
  },
  {
    code: "EO209", name: "리눅스시스템", credits: 3,
    requirement: "전공기초", target: "2학년",
    day: "화목", time: "09:00",
    year: 2, semester: 1, isCore: true, isConfirmed: true,    // ★ CONFIRMED
    isPrerequisite: true, prerequisiteFor: ["EO213", "EO307"],
  },
  {
    code: "EO204", name: "자료구조", credits: 3,
    requirement: "전공필수", target: "2학년",
    day: "월수", time: "10:30",
    year: 2, semester: 1, isCore: true, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO211", "EO301"],
  },
  {
    code: "EO210", name: "객체지향프로그래밍", credits: 3,
    requirement: "전공필수", target: "2학년",
    day: "화목", time: "10:30",
    year: 2, semester: 1, isCore: true, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO302", "EO304"],
  },
  {
    code: "EO205", name: "확률및통계", credits: 3,
    requirement: "전공선택", target: "2학년",
    day: "수금", time: "13:30",
    year: 2, semester: 1, isCore: false, isConfirmed: false,
  },

  // 2-2
  {
    code: "EO211", name: "알고리즘", credits: 3,
    requirement: "전공필수", target: "2학년",
    day: "월수", time: "09:00",
    year: 2, semester: 2, isCore: true, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO301", "EO401"],
  },
  {
    code: "EO212", name: "데이터베이스설계", credits: 3,
    requirement: "전공필수", target: "2학년",
    day: "화목", time: "09:00",
    year: 2, semester: 2, isCore: true, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO308"],
  },
  {
    code: "EO213", name: "운영체제", credits: 3,
    requirement: "전공선택", target: "2학년",
    day: "월수", time: "10:30",
    year: 2, semester: 2, isCore: false, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO307"],
  },
  {
    code: "EO214", name: "컴퓨터네트워크", credits: 3,
    requirement: "전공선택", target: "2학년",
    day: "화목", time: "10:30",
    year: 2, semester: 2, isCore: false, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO306"],
  },

  // ════════════════════════════════════════════════════════
  // 3학년
  // ════════════════════════════════════════════════════════

  // 3-1
  {
    code: "EO301", name: "소프트웨어공학", credits: 3,
    requirement: "전공선택", target: "3학년",
    day: "월수", time: "09:00",
    year: 3, semester: 1, isCore: false, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO401"],
  },
  {
    code: "EO302", name: "모바일프로그래밍", credits: 3,
    requirement: "전공선택", target: "3학년",
    day: "화목", time: "09:00",
    year: 3, semester: 1, isCore: false, isConfirmed: false,
  },
  {
    code: "EO303", name: "인공지능개론", credits: 3,
    requirement: "전공선택", target: "3학년",
    day: "월수", time: "10:30",
    year: 3, semester: 1, isCore: false, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO402"],
  },
  {
    code: "EO304", name: "웹서비스개발", credits: 3,
    requirement: "전공선택", target: "3학년",
    day: "화목", time: "10:30",
    year: 3, semester: 1, isCore: false, isConfirmed: false,
  },
  {
    code: "EO305", name: "임베디드시스템", credits: 3,
    requirement: "전공선택", target: "3학년",
    day: "수금", time: "13:30",
    year: 3, semester: 1, isCore: false, isConfirmed: false,
  },

  // 3-2
  {
    code: "EO311", name: "캡스톤디자인I", credits: 3,
    requirement: "전공선택", target: "3학년",
    day: "월수", time: "09:00",
    year: 3, semester: 2, isCore: false, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO401"],
  },
  {
    code: "EO306", name: "정보보안", credits: 3,
    requirement: "전공선택", target: "3학년",
    day: "화목", time: "09:00",
    year: 3, semester: 2, isCore: false, isConfirmed: false,
  },
  {
    code: "EO307", name: "클라우드컴퓨팅", credits: 3,
    requirement: "전공선택", target: "3학년",
    day: "월수", time: "10:30",
    year: 3, semester: 2, isCore: false, isConfirmed: false,
  },
  {
    code: "EO308", name: "빅데이터분석", credits: 3,
    requirement: "전공선택", target: "3학년",
    day: "화목", time: "10:30",
    year: 3, semester: 2, isCore: false, isConfirmed: false,
  },
  {
    code: "EO309", name: "UI/UX디자인", credits: 3,
    requirement: "전공선택", target: "3학년",
    day: "화", time: "13:30",
    year: 3, semester: 2, isCore: false, isConfirmed: false,
  },

  // ════════════════════════════════════════════════════════
  // 4학년
  // ════════════════════════════════════════════════════════

  // 4-1
  {
    code: "EO401", name: "캡스톤디자인II", credits: 3,
    requirement: "전공필수", target: "4학년",
    day: "월수", time: "09:00",
    year: 4, semester: 1, isCore: true, isConfirmed: false,
    isPrerequisite: true, prerequisiteFor: ["EO404"],
  },
  {
    code: "EO402", name: "머신러닝", credits: 3,
    requirement: "전공선택", target: "4학년",
    day: "화목", time: "09:00",
    year: 4, semester: 1, isCore: false, isConfirmed: false,
  },
  {
    code: "EO403", name: "시스템프로그래밍", credits: 3,
    requirement: "전공선택", target: "4학년",
    day: "월수", time: "10:30",
    year: 4, semester: 1, isCore: false, isConfirmed: false,
  },
  {
    code: "EO404", name: "스타트업과창업", credits: 3,
    requirement: "전공선택", target: "4학년",
    day: "화목", time: "10:30",
    year: 4, semester: 1, isCore: false, isConfirmed: false,
  },

  // 4-2
  {
    code: "EO411", name: "졸업프로젝트", credits: 3,
    requirement: "전공필수", target: "4학년",
    day: "화목", time: "09:00",
    year: 4, semester: 2, isCore: true, isConfirmed: false,
  },
  {
    code: "EO412", name: "취업특강및포트폴리오", credits: 3,
    requirement: "전공선택", target: "4학년",
    day: "월", time: "13:30",
    year: 4, semester: 2, isCore: false, isConfirmed: false,
  },
  {
    code: "EO413", name: "특수과제연구", credits: 3,
    requirement: "전공선택", target: "4학년",
    day: "수", time: "13:30",
    year: 4, semester: 2, isCore: false, isConfirmed: false,
  },
  {
    code: "EO414", name: "딥러닝응용", credits: 3,
    requirement: "전공선택", target: "4학년",
    day: "화목", time: "10:30",
    year: 4, semester: 2, isCore: false, isConfirmed: false,
  },
];

// ─── Query helpers ────────────────────────────────────────────────────────────

/** 특정 학년의 전체 과목 (학기 무관) */
export function getKsuSwCoursesForYear(year: number): KsuCourse[] {
  return KSU_SW_COURSES.filter((c) => c.year === year);
}

/** 특정 학년·학기의 과목 */
export function getKsuSwCoursesForSemester(year: number, semester: 1 | 2): KsuCourse[] {
  return KSU_SW_COURSES.filter((c) => c.year === year && c.semester === semester);
}

/**
 * 특정 학년의 핵심 과목 (전공필수 + 전공기초).
 * 이 과목들이 모든 플랜에 반드시 포함되어야 한다.
 */
export function getCoreCoursesForYear(year: number, semester?: 1 | 2): KsuCourse[] {
  return KSU_SW_COURSES.filter(
    (c) => c.year === year && c.isCore && (semester == null || c.semester === semester),
  );
}

/**
 * 선택 과목 (전공선택) — isCore=false.
 * 학점 채우기 용도의 보조 과목.
 */
export function getElectiveCoursesForYear(year: number, semester?: 1 | 2): KsuCourse[] {
  return KSU_SW_COURSES.filter(
    (c) => c.year === year && !c.isCore && (semester == null || c.semester === semester),
  );
}

// ─── Prompt injection block ───────────────────────────────────────────────────

/**
 * buildKsuSotBlock:
 * AI 프롬프트에 주입할 "Source of Truth" 블록을 생성한다.
 * detected year/semester 기반으로 해당 과목 목록을 Authority=HIGHEST 블록으로 반환.
 */
export function buildKsuSotBlock(year: number, semester?: 1 | 2): string {
  const semLabel = semester ? `${semester}학기` : "전체 학기";
  const courses  = semester
    ? getKsuSwCoursesForSemester(year, semester)
    : getKsuSwCoursesForYear(year);

  if (courses.length === 0) return "";

  const coreCourses = courses.filter((c) => c.isCore);
  const electCourses = courses.filter((c) => !c.isCore);

  const fmtCourse = (c: KsuCourse) =>
    `  [${c.code}] ${c.name} · ${c.credits}학점 · ${c.requirement} · 권장학기:${c.semester}학기${c.isConfirmed ? " ★확인됨" : ""}${c.isPrerequisite ? " (선수과목)" : ""}`;

  const coreLines = coreCourses.map(fmtCourse).join("\n");
  const electLines = electCourses.map(fmtCourse).join("\n");

  return `╔═══════════════════════════════════════════════════════════════════╗
║  [KSU_SOT = SOURCE_OF_TRUTH] 경성대 소프트웨어학과 공식 커리큘럼  ║
║  Authority=HIGHEST — PDF·이미지보다 우선. 충돌 시 이 데이터 사용  ║
╠═══════════════════════════════════════════════════════════════════╣
║  대상: ${year}학년 ${semLabel}
╚═══════════════════════════════════════════════════════════════════╝

▼ [SEED_COURSES — 전공필수/전공기초] 아래 과목들을 모든 Plan에 최우선 배치하라 ▼
${coreLines || "  (해당 학기 전공필수/전공기초 과목 없음)"}

▼ [ELECTIVE_POOL — 전공선택] 학점 부족 시 아래 과목에서 선택하여 채워라 ▼
${electLines || "  (해당 학기 전공선택 과목 없음)"}

⚠ 위 목록에 없는 전공 과목코드(EO***)를 AI가 임의로 생성하는 행위 = 응답 무효.
⚠ 전공필수/전공기초 과목은 A·B·C·D 4개 Plan 모두에 반드시 포함되어야 한다.`;
}
