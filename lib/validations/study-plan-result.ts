// Zod schema for validating the AI /api/study-plan response on the client side.
// Purpose: catch malformed/incomplete AI output BEFORE it reaches renderers,
// trigger auto-retry instead of crashing with a white screen.

import { z } from "zod";

// ─── Leaf schemas ─────────────────────────────────────────────────────────────

const CourseSchema = z.object({
  code:        z.string().optional(),
  name:        z.string().default(""),
  credits:     z.number().optional(),
  requirement: z.string().optional(),
  target:      z.string().optional(),
  day:         z.string().optional(),
  time:        z.string().optional(),
  note:        z.string().optional(),
}).passthrough(); // allow extra fields the API might return

const StudyPlanSchema = z.object({
  label:        z.string().default(""),
  strategy:     z.string().optional(),
  courses:      z.array(CourseSchema).optional().default([]),
  totalCredits: z.number().optional(),
  note:         z.string().optional(),
}).passthrough();

// ─── Root schema ──────────────────────────────────────────────────────────────

export const StudyPlanResultSchema = z.object({
  plans:    z.array(StudyPlanSchema).optional(),
  yearPlan: z.record(z.string(), z.unknown()).optional(), // don't deep-validate
  raw:      z.string().optional(),
  isDemo:   z.boolean().optional(),
}).passthrough();

export type ValidatedPlanResult = z.infer<typeof StudyPlanResultSchema>;

// ─── Structural sanity check ──────────────────────────────────────────────────
// True only when the response has at least one non-empty plan OR a yearPlan.

export function isUsableResult(data: ValidatedPlanResult): boolean {
  const hasPlans    = Array.isArray(data.plans) && data.plans.length > 0;
  const hasYearPlan = Boolean(data.yearPlan && typeof data.yearPlan === "object");
  return hasPlans || hasYearPlan;
}
