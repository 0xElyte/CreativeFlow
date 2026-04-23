"use client"

import { useEffect, useRef, useState } from "react"
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
 * Registers the `decompose_goal`, `confirm_goal` and `update_steps` ElevenLabs client tools.
 * Must be called in a component rendered inside <ConversationProvider>.
 * Tools are automatically unregistered on unmount.
 *
 * NOTE: callbacks passed to useConversationClientTool are registered once on
 * mount and never re-executed with updated closure values. All mutable state
 * is therefore read via useStore.getState() (always fresh) or a synced ref.
 */
export function useClientTools(onComplete?: () => void): UseClientToolsReturn {
  const [lastError, setLastError] = useState<string | null>(null)
  const [canRetryDecompose, setCanRetryDecompose] = useState(false)

  // Keep onComplete in a ref so the stale callback closure always calls the latest version
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

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
        return "ok"
      }

      setLastError(null)
      setCanRetryDecompose(false)

      const { goal, domain, steps } = result.data
      const now = Date.now()
      // Read fresh store state — closure is stale
      const { addTask, discardDraft, setPendingDraftId, session, audio } = useStore.getState()

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
        status: "draft",
        toneProfile: audio.toneProfile,
        createdAt: now,
        updatedAt: now,
      }

      // Discard any existing draft if the user revised the plan
      if (session.pendingDraftId) {
        discardDraft(session.pendingDraftId)
      }
      addTask(task)
      setPendingDraftId(task.id)
      console.log("[decompose_goal] draft task created:", task.id, "goal:", goal)
      return "ok"
    }
  )

  /* ── 4.2: confirm_goal ──────────────────────────────── */
  useConversationClientTool(
    "confirm_goal",
    async (_payload: unknown): Promise<string> => {
      console.log("[confirm_goal] called")

      const { confirmTask, setPendingDraftId, session } = useStore.getState()
      const taskId = session.pendingDraftId

      if (!taskId) {
        console.error("[confirm_goal] no pending draft — decompose_goal may not have run yet")
        return "ok"
      }

      confirmTask(taskId)
      setPendingDraftId(null)
      console.log("[confirm_goal] task promoted to active:", taskId)

      // End the voice session — goal is confirmed, nothing more to do
      onCompleteRef.current?.()

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

      // Read fresh tasks — closure is stale
      const { tasks, completeStep, requestClarification } = useStore.getState()

      const notFound: string[] = []

      for (const item of result.data.results) {
        // Normalize stepId: agent may wrap the UUID in brackets e.g. "[uuid]"
        const cleanStepId = item.stepId.replace(/^\[|\]$/g, "").trim()

        const ownerTask = tasks.find((t) =>
          t.steps.some((step) => step.id === cleanStepId)
        )

        if (!ownerTask) {
          console.warn(
            "[update_steps] no task found for stepId:",
            item.stepId,
            "→ cleaned:",
            cleanStepId,
            "| available step IDs:",
            tasks.flatMap((t) => t.steps.map((s) => s.id))
          )
          notFound.push(cleanStepId)
          continue
        }

        if (item.status === "completed") {
          completeStep(ownerTask.id, cleanStepId)
        } else {
          requestClarification(ownerTask.id, cleanStepId, item.query ?? "Needs clarification")
        }
      }

      if (notFound.length > 0) {
        return `Error: could not find steps with IDs: ${notFound.join(", ")}. Please check the step IDs from the steps list and try again.`
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
