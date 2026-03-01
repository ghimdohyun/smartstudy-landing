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
  imageUrl: z
    .string()
    .min(1, "시간표 이미지를 업로드하거나 URL을 입력해주세요.")
    .refine(
      (v) =>
        v.startsWith("data:image/") ||
        v.startsWith("http://") ||
        v.startsWith("https://"),
      "이미지 파일 또는 유효한 URL을 입력해주세요."
    ),
});

export type StudyPlanRequest = z.infer<typeof StudyPlanRequestSchema>;
