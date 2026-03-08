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

// ─── Structural sanity check (triple-filter) ─────────────────────────────────
// Gate 1: plans array exists and is non-empty, OR yearPlan is present
// Gate 2: every plan has a non-empty label
// Gate 3: every plan that has courses must have ≥1 course with a non-empty name
// Any gate failure → caller retries immediately.

export function isUsableResult(data: ValidatedPlanResult): boolean {
  // yearPlan-only mode (mode=year) — accept if yearPlan object is non-empty
  const hasYearPlan =
    data.yearPlan != null &&
    typeof data.yearPlan === "object" &&
    Object.keys(data.yearPlan).length > 0;

  const plans = data.plans;

  // Gate 1: must have plans or yearPlan
  if ((!Array.isArray(plans) || plans.length === 0) && !hasYearPlan) return false;

  if (Array.isArray(plans) && plans.length > 0) {
    for (const plan of plans) {
      // Gate 2: each plan must have a non-empty label
      if (!plan.label || plan.label.trim() === "") return false;

      // Gate 3: if courses are present, each course must have a non-empty name
      if (Array.isArray(plan.courses)) {
        for (const course of plan.courses) {
          if (!course.name || course.name.trim() === "") return false;
        }
      }
    }
  }

  return true;
}
