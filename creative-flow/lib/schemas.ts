import { z } from "zod"

/* ─── decompose_goal ─────────────────────────────────────── */

export const StepSchema = z.object({
  text: z.string().min(1),
  // Agent may omit or send empty domainTag — default to empty string
  domainTag: z.string().default(""),
  // Agent LLM may send floats (30.0) or strings ("30") — coerce + round
  estimatedMinutes: z.coerce.number().min(1).max(480).transform(Math.round),
})

export const DecomposeGoalSchema = z.object({
  goal: z.string().min(1),
  domain: z.string().default("general"),
  // Agent may produce 1 step for simple goals; allow up to 8
  steps: z.array(StepSchema).min(2).max(8),
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
