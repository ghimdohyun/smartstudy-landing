// Zod v4 schemas for /api/study-plan request validation (Taxonomy validation pattern)
import { z } from "zod";

export const StudyPlanRequestSchema = z.object({
  studentInfo: z
    .string()
    .min(1, "studentInfo 필드가 필요합니다.")
    .max(5000, "학생 정보가 너무 깁니다. (최대 5000자)"),
  timetableInfo: z
    .string()
    .max(10000, "시간표 정보가 너무 깁니다. (최대 10000자)")
    .optional()
    .default(""),
  universityId: z.string().optional(),
  pdfMode: z.boolean().optional(),
  /** Structured PDF knowledge — injected as "학교 공식 규정" in the prompt */
  pdfKnowledge: z.string().max(20000).optional().default(""),
  imageUrl: z
    .string()
    .refine(
      (v) =>
        !v ||
        v.startsWith("data:image/") ||
        v.startsWith("http://") ||
        v.startsWith("https://"),
      "이미지 파일 또는 유효한 URL을 입력해주세요."
    )
    .optional()
    .default(""),
});

export type StudyPlanRequest = z.infer<typeof StudyPlanRequestSchema>;
