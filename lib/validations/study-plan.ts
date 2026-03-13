// Zod v4 schemas for /api/study-plan request validation (Taxonomy validation pattern)
import { z } from "zod";

const BlockedTimeSlotSchema = z.object({
  day:        z.string(),           // "월", "화", "수", "목", "금"
  startMin:   z.number(),           // minutes since midnight
  endMin:     z.number(),
  source:     z.enum(["current_course", "preference"]),
  courseName: z.string().optional(),
});

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
  /**
   * 에브리타임 이미지에서 추출한 차단 시간 슬롯.
   * type=vision 응답의 blockedTimeSlots 필드를 그대로 전달.
   * 이 슬롯과 겹치는 과목은 추천에서 제외됨.
   */
  blockedSlots: z.array(BlockedTimeSlotSchema).optional().default([]),
  /** 공강 희망 요일 (예: "금") — vision API의 preferredOffDays[0] 전달 */
  preferOffDay: z.string().optional().default(""),
});

export type StudyPlanRequest = z.infer<typeof StudyPlanRequestSchema>;
