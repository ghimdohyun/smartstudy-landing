// Domain types for SmartStudy AI study planner

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
}

// ─── Re-export extended catalogue / plan types ────────────────────────────────
export type {
  CourseCategoryCode,
  CourseRequirement,
  CourseEntry,
  PlanItem,
  MonthlyGoal,
  SemesterDetail,
  YearStudyPlan,
} from './study-plan';

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ─── Course (base — kept for backward compat with existing components) ─────────

export interface Course {
  /** Catalogue code from the curriculum guide, e.g. "COR-101" */
  code?: string;
  name: string;
  credits?: number;
  /** Requirement classification: 공통필수, 공통선택, 전공필수, 전공선택, 교양 */
  requirement?: string;
  /** Target student group, e.g. "1학년", "전체" */
  target?: string;
  day?: string;
  time?: string;
  note?: string;
}

export interface StudyPlan {
  label: string;
  strategy?: string;
  courses?: Course[];
  totalCredits?: number;
  note?: string;
}

export interface SemesterPlan {
  semester?: string;
  goal?: string;
  recommendedCourses?: string[];
  weeklyRoutine?: string;
  milestones?: string[];
}

export interface YearPlan {
  year?: string;
  semesters?: SemesterPlan[];
  weeklyRoutine?: Record<string, string>;
  risks?: string[];
  note?: string;
}

export interface StudyPlanResult {
  plans?: StudyPlan[];
  yearPlan?: YearPlan;
  raw?: string;
  /** True when the response is a local demo fallback (upstream unavailable) */
  isDemo?: boolean;
}

export interface StudyPlanInput {
  studentInfo: string;
  timetableInfo: string;
  imageUrl?: string;
  mode: 'plans' | 'year';
  /** University preset ID — determines which KB rules to apply */
  universityId?: string;
  /** True when a PDF was uploaded; skips imageUrl validation and uses text-mode LLM */
  pdfMode?: boolean;
}
