"use client"

import { useRef, useState } from "react"
import { z } from "zod"
import { useConversationClientTool } from "@elevenlabs/react"
import { useStore } from "@/lib/store"
import { DecomposeGoalSchema, UpdateStepsSchema } from "@/lib/schemas"
import type { TodoItem, TodoStep } from "@/lib/types"

/* ─── Return shape ───────────────────────────────────────── */

export interface UseClientToolsReturn {
  /** Non-null when a tool handler received an invalid payload */
  lastError: string | null
  clearError: () => void
  /**
   * True when the last error came from decompose_goal, meaning the caller
   * can retry by sending the last transcript via sendContextualUpdate.
   */
  canRetryDecompose: boolean
}

/* ─── Hook ───────────────────────────────────────────────── */

/**
 * Registers the `decompose_goal` and `update_steps` ElevenLabs client tools.
 * Must be called in a component rendered inside <ConversationProvider>.
 * Tools are automatically unregistered on unmount.
 */
export function useClientTools(): UseClientToolsReturn {
  const addTask = useStore((s) => s.addTask)
  const confirmTask = useStore((s) => s.confirmTask)
  const completeStep = useStore((s) => s.completeStep)
  const requestClarification = useStore((s) => s.requestClarification)
  const tasks = useStore((s) => s.tasks)
  const toneProfile = useStore((s) => s.audio.toneProfile)

  const [lastError, setLastError] = useState<string | null>(null)
  const [canRetryDecompose, setCanRetryDecompose] = useState(false)
  // Holds the taskId of the most recent draft so confirm_goal works
  // even when the agent omits the taskId from its payload.
  const pendingDraftId = useRef<string | null>(null)

  /* ── 4.1: decompose_goal ─────────────────────────────── */
  useConversationClientTool(
    "decompose_goal",
    async (payload: unknown): Promise<string> => {
      console.log("[decompose_goal] received payload:", JSON.stringify(payload, null, 2))

      const result = DecomposeGoalSchema.safeParse(payload)

      if (!result.success) {
        const msg = result.error.issues.map((i) => i.message).join("; ")
        console.error("[decompose_goal] validation failed:", msg, "raw payload:", payload)
        setLastError(`Goal decomposition failed: ${msg}`)
        setCanRetryDecompose(true)
        // Return "ok" anyway — returning an error string causes the agent to loop/retry
        return "ok"
      }

      setLastError(null)
      setCanRetryDecompose(false)

      const { goal, domain, steps } = result.data
      const now = Date.now()

      const task: TodoItem = {
        id: crypto.randomUUID(),
        goal,
        domain,
        steps: steps.map(
          (s): TodoStep => ({
            id: crypto.randomUUID(),
            text: s.text,
            domainTag: s.domainTag,
            estimatedMinutes: s.estimatedMinutes,
            status: "pending",
          })
        ),
        // Draft: not shown in dashboard until the user confirms the plan
        status: "draft",
        toneProfile,
        createdAt: now,
        updatedAt: now,
      }

      addTask(task)
      pendingDraftId.current = task.id
      console.log("[decompose_goal] draft task created:", task.id, "goal:", goal)
      // Return the taskId so the agent can reference it in confirm_goal
      return JSON.stringify({ taskId: task.id })
    }
  )

  /* ── 4.2: confirm_goal ──────────────────────────────── */
  useConversationClientTool(
    "confirm_goal",
    async (payload: unknown): Promise<string> => {
      console.log("[confirm_goal] received payload:", JSON.stringify(payload, null, 2))

      const parsed = z.object({ taskId: z.string().min(1) }).safeParse(payload)
      // Fall back to the ref if the agent omitted taskId (common LLM behaviour)
      const taskId = parsed.success ? parsed.data.taskId : pendingDraftId.current

      if (!taskId) {
        console.error("[confirm_goal] no taskId available — decompose_goal may not have run yet", payload)
        return "ok"
      }

      confirmTask(taskId)
      pendingDraftId.current = null
      console.log("[confirm_goal] task promoted to active:", taskId)
      return "ok"
    }
  )

  /* ── 4.3: update_steps ───────────────────────────────── */
  // highlight_step is NOT registered — step highlighting is handled
  // entirely by onAudioAlignment character-level timing (Task 3.5).
  useConversationClientTool(
    "update_steps",
    async (payload: unknown): Promise<string> => {
      console.log("[update_steps] received payload:", JSON.stringify(payload, null, 2))

      const result = UpdateStepsSchema.safeParse(payload)

      if (!result.success) {
        const msg = result.error.issues.map((i) => i.message).join("; ")
        console.error("[update_steps] validation failed:", msg, "raw payload:", payload)
        setLastError(`Step update failed: ${msg}`)
        return "ok"
      }

      setLastError(null)

      for (const item of result.data.results) {
        // Find the parent task that owns this step
        const ownerTask = tasks.find((t) =>
          t.steps.some((step) => step.id === item.stepId)
        )
        if (!ownerTask) continue

        if (item.status === "completed") {
          // completeStep enforces no-revert (see store.ts)
          completeStep(ownerTask.id, item.stepId)
        } else {
          requestClarification(
            ownerTask.id,
            item.stepId,
            item.query ?? "Needs clarification"
          )
        }
      }

      return "ok"
    }
  )

  return {
    lastError,
    clearError: () => {
      setLastError(null)
      setCanRetryDecompose(false)
    },
    canRetryDecompose,
  }
}
