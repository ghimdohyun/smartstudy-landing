// Extended domain types for course catalogue, plan variants, and 12-month year plan

// ─── Course catalogue ────────────────────────────────────────────────────────

/**
 * Course-code prefix visible in curriculum guides.
 * Known values: COR (공통필수), LCS (교양선택), HFS (인문사회).
 * The string fallback accommodates institution-specific codes.
 */
export type CourseCategoryCode = 'COR' | 'LCS' | 'HFS' | (string & {});

/** Classification of a course as required or elective */
export type CourseRequirement =
  | '공통필수'
  | '공통선택'
  | '전공필수'
  | '전공선택'
  | '교양';

/**
 * A single course entry drawn from the actual curriculum guide.
 * Extends the base Course with catalogue metadata.
 */
export interface CourseEntry {
  /** Catalogue code, e.g. "COR-101" or "LCS-202" */
  code?: CourseCategoryCode;
  name: string;
  credits: number;
  requirement?: CourseRequirement;
  /** Target student group, e.g. "1학년", "전체", "컴퓨터공학과 2학년" */
  target?: string;
  /** Semester availability */
  semester?: '1학기' | '2학기' | '연중';
  day?: string;
  time?: string;
  note?: string;
}

// ─── Plan A~D ────────────────────────────────────────────────────────────────

/**
 * One AI-generated plan variant (Plan A, B, C, or D).
 * Replaces the simpler StudyPlan when full catalogue data is available.
 */
export interface PlanItem {
  /** Display label: "Plan A" ~ "Plan D" */
  label: string;
  /** Short strategic title, e.g. "학점 극대화 전략" */
  title?: string;
  /** Detailed strategy description */
  strategy: string;
  courses: CourseEntry[];
  totalCredits?: number;
  note?: string;
}

// ─── 12-month Year Plan ───────────────────────────────────────────────────────

/** Goal and tasks for a specific calendar month */
export interface MonthlyGoal {
  /** Calendar month 1–12 */
  month: number;
  goal: string;
  tasks?: string[];
}

/** Semester detail that may include a monthly breakdown */
export interface SemesterDetail {
  /** e.g. "1학기 (3월~6월)" */
  semester: string;
  goal: string;
  recommendedCourses: string[];
  /** Optional per-month breakdown within this semester */
  monthlyGoals?: MonthlyGoal[];
  weeklyRoutine?: string;
  milestones?: string[];
}

/**
 * Full 12-month year study plan produced by the AI.
 * Provides both a semester-level view and an optional flat monthly view.
 */
export interface YearStudyPlan {
  year?: string;
  /** Two or more semester entries (1학기, 2학기, optional summer/winter) */
  semesters: SemesterDetail[];
  /** Flat 12-month view spanning both semesters */
  monthlyGoals?: MonthlyGoal[];
  risks?: string[];
  note?: string;
}
