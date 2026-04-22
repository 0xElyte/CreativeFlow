import { z } from "zod"

/* ─── decompose_goal ─────────────────────────────────────── */

export const StepSchema = z.object({
  text: z.string().min(3),
  domainTag: z.string().min(1),
  estimatedMinutes: z.number().int().min(1).max(240),
})

export const DecomposeGoalSchema = z.object({
  goal: z.string().min(5),
  domain: z.string().min(1),
  steps: z.array(StepSchema).min(2).max(6),
})

/* ─── update_steps ───────────────────────────────────────── */

export const UpdateStepItemSchema = z.object({
  stepId: z.string().min(1),
  status: z.enum(["completed", "clarification_needed"]),
  query: z.string().optional(),
})

export const UpdateStepsSchema = z.object({
  results: z.array(UpdateStepItemSchema).min(1),
})

export type DecomposeGoalInput = z.infer<typeof DecomposeGoalSchema>
export type UpdateStepsInput = z.infer<typeof UpdateStepsSchema>
