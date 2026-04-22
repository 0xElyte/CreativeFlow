/**
 * 9.1 — Unit tests for Zustand store actions:
 *   addTask, completeStep, requestClarification, hydrateTasks
 */
import { describe, it, expect, beforeEach } from "vitest"
import { useStore } from "@/lib/store"
import type { TodoItem } from "@/lib/types"

/* ─── Helpers ────────────────────────────────────────────── */

function makeTask(overrides: Partial<TodoItem> = {}): TodoItem {
  const now = Date.now()
  return {
    id: "task-1",
    goal: "Build a morning routine",
    domain: "fitness",
    steps: [
      {
        id: "step-1",
        text: "Set an alarm for 6 AM",
        domainTag: "prep",
        estimatedMinutes: 2,
        status: "pending",
      },
      {
        id: "step-2",
        text: "Do 10 minutes of stretching",
        domainTag: "action",
        estimatedMinutes: 10,
        status: "pending",
      },
    ],
    status: "active",
    toneProfile: "calm_mentor",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const INITIAL_STATE = {
  session: { active: false, voiceState: "idle" as const, transcript: "", userId: "" },
  tasks: [] as TodoItem[],
  audio: { playing: false, currentStepId: null, toneProfile: "calm_mentor" as const },
  sessionHistory: { summary: null, lastConversationId: null },
  ui: { reducedMotion: false, activeView: "dashboard" as const },
}

/* ─── Tests ──────────────────────────────────────────────── */

describe("store › addTask", () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE)
  })

  it("adds a task to an empty list", () => {
    useStore.getState().addTask(makeTask())
    expect(useStore.getState().tasks).toHaveLength(1)
  })

  it("prepends to existing tasks (newest first)", () => {
    useStore.getState().addTask(makeTask({ id: "first" }))
    useStore.getState().addTask(makeTask({ id: "second" }))
    const ids = useStore.getState().tasks.map((t) => t.id)
    expect(ids).toEqual(["second", "first"])
  })

  it("stores the task with its original properties", () => {
    const task = makeTask({ goal: "Run a 5K" })
    useStore.getState().addTask(task)
    expect(useStore.getState().tasks[0].goal).toBe("Run a 5K")
  })
})

describe("store › completeStep", () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE)
    useStore.getState().addTask(makeTask())
  })

  it("sets step.status to 'completed'", () => {
    useStore.getState().completeStep("task-1", "step-1")
    const step = useStore.getState().tasks[0].steps.find((s) => s.id === "step-1")!
    expect(step.status).toBe("completed")
  })

  it("sets step.completedAt to a recent timestamp", () => {
    const before = Date.now()
    useStore.getState().completeStep("task-1", "step-1")
    const step = useStore.getState().tasks[0].steps.find((s) => s.id === "step-1")!
    expect(step.completedAt).toBeGreaterThanOrEqual(before)
  })

  it("does not change sibling steps", () => {
    useStore.getState().completeStep("task-1", "step-1")
    const step2 = useStore.getState().tasks[0].steps.find((s) => s.id === "step-2")!
    expect(step2.status).toBe("pending")
  })

  it("is idempotent — second call does not change completedAt", () => {
    useStore.getState().completeStep("task-1", "step-1")
    const first = useStore.getState().tasks[0].steps[0].completedAt
    useStore.getState().completeStep("task-1", "step-1")
    expect(useStore.getState().tasks[0].steps[0].completedAt).toBe(first)
  })

  it("updates task.updatedAt", () => {
    useStore.setState({ tasks: [makeTask({ updatedAt: 0 })] })
    useStore.getState().completeStep("task-1", "step-1")
    expect(useStore.getState().tasks[0].updatedAt).toBeGreaterThan(0)
  })

  it("is a no-op for an unknown todoId", () => {
    useStore.getState().completeStep("does-not-exist", "step-1")
    expect(useStore.getState().tasks[0].steps[0].status).toBe("pending")
  })

  it("is a no-op for an unknown stepId", () => {
    useStore.getState().completeStep("task-1", "does-not-exist")
    expect(useStore.getState().tasks[0].steps[0].status).toBe("pending")
  })
})

describe("store › requestClarification", () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE)
    useStore.getState().addTask(makeTask())
  })

  it("sets step.status to 'clarification_needed'", () => {
    useStore.getState().requestClarification("task-1", "step-1", "What equipment?")
    const step = useStore.getState().tasks[0].steps[0]
    expect(step.status).toBe("clarification_needed")
  })

  it("does not affect sibling steps", () => {
    useStore.getState().requestClarification("task-1", "step-1", "?")
    expect(useStore.getState().tasks[0].steps[1].status).toBe("pending")
  })
})

describe("store › hydrateTasks", () => {
  beforeEach(() => {
    useStore.setState(INITIAL_STATE)
  })

  it("replaces the tasks array entirely", () => {
    useStore.getState().addTask(makeTask({ id: "old" }))
    useStore.getState().hydrateTasks([makeTask({ id: "new" })])
    expect(useStore.getState().tasks).toHaveLength(1)
    expect(useStore.getState().tasks[0].id).toBe("new")
  })

  it("sets tasks to empty when called with []", () => {
    useStore.getState().addTask(makeTask())
    useStore.getState().hydrateTasks([])
    expect(useStore.getState().tasks).toHaveLength(0)
  })

  it("is idempotent — calling twice with the same data produces the same state", () => {
    const tasks = [makeTask({ id: "a" }), makeTask({ id: "b" })]
    useStore.getState().hydrateTasks(tasks)
    const stateAfterFirst = useStore.getState().tasks.map((t) => t.id)
    useStore.getState().hydrateTasks(tasks)
    expect(useStore.getState().tasks.map((t) => t.id)).toEqual(stateAfterFirst)
  })
})
