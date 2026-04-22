/**
 * 9.4 — Integration tests: store + SDK callback simulation
 *
 * Tests the full store → UI flow that the ElevenLabs SDK callbacks
 * produce, and verifies that client tool payloads correctly mutate state.
 * Components are not rendered; we test the integration at the store level,
 * which is exactly what all the SDK callbacks are wired to.
 */
import { describe, it, expect, beforeEach } from "vitest"
import { useStore } from "@/lib/store"
import { DecomposeGoalSchema, UpdateStepsSchema } from "@/lib/schemas"
import type { TodoItem } from "@/lib/types"

const INITIAL_STATE = {
  session: { active: false, voiceState: "idle" as const, transcript: "", userId: "" },
  tasks: [] as TodoItem[],
  audio: { playing: false, currentStepId: null, toneProfile: "calm_mentor" as const },
  sessionHistory: { summary: null, lastConversationId: null },
  ui: { reducedMotion: false, activeView: "dashboard" as const },
}

/* ─── Simulate onStatusChange → setVoiceState ───────────── */

describe("simulated onStatusChange → store.setVoiceState", () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE)
  })

  it("'listening' activates the session", () => {
    useStore.getState().setVoiceState("listening")
    expect(useStore.getState().session.active).toBe(true)
    expect(useStore.getState().session.voiceState).toBe("listening")
  })

  it("'speaking' marks session as active", () => {
    useStore.getState().setVoiceState("speaking")
    expect(useStore.getState().session.active).toBe(true)
  })

  it("'idle' deactivates the session", () => {
    useStore.getState().setVoiceState("listening")
    useStore.getState().setVoiceState("idle")
    expect(useStore.getState().session.active).toBe(false)
    expect(useStore.getState().session.voiceState).toBe("idle")
  })

  it("'connecting' marks session as active", () => {
    useStore.getState().setVoiceState("connecting")
    expect(useStore.getState().session.active).toBe(true)
  })

  it("state transitions: idle → connecting → listening → speaking → idle", () => {
    const states = ["connecting", "listening", "speaking", "idle"] as const
    for (const state of states) {
      useStore.getState().setVoiceState(state)
      expect(useStore.getState().session.voiceState).toBe(state)
    }
    expect(useStore.getState().session.active).toBe(false)
  })
})

/* ─── Simulate onUserTranscript → store.setTranscript ───── */

describe("simulated onMessage → store.setTranscript", () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE)
  })

  it("updates transcript in session slice", () => {
    useStore.getState().setTranscript("I want to run a 5K this month")
    expect(useStore.getState().session.transcript).toBe("I want to run a 5K this month")
  })

  it("overwrites previous transcript", () => {
    useStore.getState().setTranscript("First message")
    useStore.getState().setTranscript("Second message")
    expect(useStore.getState().session.transcript).toBe("Second message")
  })
})

/* ─── Simulate onAudioAlignment → setAudioPlaying ───────── */

describe("simulated onAudioAlignment → store.setAudioPlaying", () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE)
  })

  it("marks audio as playing with the matched stepId", () => {
    useStore.getState().setAudioPlaying(true, "step-3")
    expect(useStore.getState().audio.playing).toBe(true)
    expect(useStore.getState().audio.currentStepId).toBe("step-3")
  })

  it("clears currentStepId when audio stops", () => {
    useStore.getState().setAudioPlaying(true, "step-3")
    useStore.getState().setAudioPlaying(false)
    expect(useStore.getState().audio.playing).toBe(false)
    expect(useStore.getState().audio.currentStepId).toBeNull()
  })
})

/* ─── Simulate decompose_goal tool invocation ────────────── */

describe("simulated decompose_goal client tool invocation", () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE)
  })

  it("valid payload parses and addTask produces correct task shape", () => {
    const payload = {
      goal: "Write a short story",
      domain: "writing",
      steps: [
        { text: "Outline the plot", domainTag: "planning", estimatedMinutes: 20 },
        { text: "Write the first chapter", domainTag: "writing", estimatedMinutes: 60 },
        { text: "Edit and revise", domainTag: "editing", estimatedMinutes: 30 },
      ],
    }

    const parsed = DecomposeGoalSchema.safeParse(payload)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    // Simulate what the tool handler does
    const { goal, domain, steps } = parsed.data
    const task: TodoItem = {
      id: crypto.randomUUID(),
      goal,
      domain,
      steps: steps.map((s) => ({
        id: crypto.randomUUID(),
        text: s.text,
        domainTag: s.domainTag,
        estimatedMinutes: s.estimatedMinutes,
        status: "pending" as const,
      })),
      status: "active",
      toneProfile: "calm_mentor",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    useStore.getState().addTask(task)

    const saved = useStore.getState().tasks[0]
    expect(saved.goal).toBe("Write a short story")
    expect(saved.domain).toBe("writing")
    expect(saved.steps).toHaveLength(3)
    expect(saved.steps.every((s) => s.status === "pending")).toBe(true)
  })

  it("invalid payload (1 step) fails Zod validation without touching store", () => {
    const payload = {
      goal: "Write a short story",
      domain: "writing",
      steps: [{ text: "Just write it", domainTag: "action", estimatedMinutes: 120 }],
    }

    const parsed = DecomposeGoalSchema.safeParse(payload)
    expect(parsed.success).toBe(false)
    expect(useStore.getState().tasks).toHaveLength(0)
  })
})

/* ─── Simulate update_steps tool invocation ─────────────── */

describe("simulated update_steps client tool invocation", () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE)
    // Seed a task
    useStore.getState().addTask({
      id: "task-1",
      goal: "Build a habit",
      domain: "fitness",
      steps: [
        { id: "step-A", text: "Buy gear", domainTag: "prep", estimatedMinutes: 15, status: "pending" },
        { id: "step-B", text: "Train daily", domainTag: "action", estimatedMinutes: 30, status: "pending" },
      ],
      status: "active",
      toneProfile: "hype_coach",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })

  it("valid payload processes completeStep correctly", () => {
    const payload = { results: [{ stepId: "step-A", status: "completed" as const }] }
    const parsed = UpdateStepsSchema.safeParse(payload)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    // Simulate the tool handler logic
    for (const { stepId, status, query } of parsed.data.results) {
      // Find parent task
      const parentTask = useStore.getState().tasks.find((t) =>
        t.steps.some((s) => s.id === stepId)
      )
      if (!parentTask) continue
      if (status === "completed") {
        useStore.getState().completeStep(parentTask.id, stepId)
      } else if (status === "clarification_needed") {
        useStore.getState().requestClarification(parentTask.id, stepId, query ?? "")
      }
    }

    const stepA = useStore.getState().tasks[0].steps.find((s) => s.id === "step-A")!
    expect(stepA.status).toBe("completed")
    // step-B is unaffected
    expect(useStore.getState().tasks[0].steps.find((s) => s.id === "step-B")!.status).toBe("pending")
  })

  it("valid payload processes clarification_needed correctly", () => {
    const payload = {
      results: [{ stepId: "step-B", status: "clarification_needed" as const, query: "What time?" }],
    }
    const parsed = UpdateStepsSchema.safeParse(payload)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    for (const { stepId, status, query } of parsed.data.results) {
      const parentTask = useStore.getState().tasks.find((t) =>
        t.steps.some((s) => s.id === stepId)
      )
      if (!parentTask) continue
      if (status === "clarification_needed") {
        useStore.getState().requestClarification(parentTask.id, stepId, query ?? "")
      }
    }

    expect(useStore.getState().tasks[0].steps[1].status).toBe("clarification_needed")
  })
})
