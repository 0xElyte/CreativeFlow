/**
 * 9.2 — Unit tests for Zod schemas:
 *   DecomposeGoalSchema, UpdateStepsSchema
 *
 * Covers valid payloads, invalid payloads, and boundary cases (2 and 6 steps).
 */
import { describe, it, expect } from "vitest"
import { DecomposeGoalSchema, UpdateStepsSchema } from "@/lib/schemas"

/* ─── Helpers ────────────────────────────────────────────── */

function makeStep(overrides = {}) {
  return {
    text: "Buy a notebook",
    domainTag: "prep",
    estimatedMinutes: 10,
    ...overrides,
  }
}

function makeDecomposePayload(stepCount: number, overrides = {}) {
  return {
    goal: "Write a short story",
    domain: "writing",
    steps: Array.from({ length: stepCount }, (_, i) => makeStep({ text: `Step ${i + 1} text` })),
    ...overrides,
  }
}

/* ─── DecomposeGoalSchema ────────────────────────────────── */

describe("DecomposeGoalSchema", () => {
  describe("valid payloads", () => {
    it("accepts 2 steps (lower boundary)", () => {
      const result = DecomposeGoalSchema.safeParse(makeDecomposePayload(2))
      expect(result.success).toBe(true)
    })

    it("accepts 6 steps (upper boundary)", () => {
      const result = DecomposeGoalSchema.safeParse(makeDecomposePayload(6))
      expect(result.success).toBe(true)
    })

    it("accepts 8 steps (new upper boundary)", () => {
      const result = DecomposeGoalSchema.safeParse(makeDecomposePayload(8))
      expect(result.success).toBe(true)
    })

    it("accepts short goal (agent may be terse)", () => {
      const result = DecomposeGoalSchema.safeParse(makeDecomposePayload(2, { goal: "Run" }))
      expect(result.success).toBe(true)
    })

    it("defaults domain to 'general' when missing", () => {
      const payload = makeDecomposePayload(2)
      const { domain: _, ...withoutDomain } = payload
      const result = DecomposeGoalSchema.safeParse(withoutDomain)
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.domain).toBe("general")
    })

    it("coerces non-integer estimatedMinutes by rounding", () => {
      const result = DecomposeGoalSchema.safeParse(
        makeDecomposePayload(2, {
          steps: [makeStep({ estimatedMinutes: 5.5 }), makeStep()],
        })
      )
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.steps[0].estimatedMinutes).toBe(6)
    })

    it("accepts estimatedMinutes up to 480", () => {
      const result = DecomposeGoalSchema.safeParse(
        makeDecomposePayload(2, {
          steps: [makeStep({ estimatedMinutes: 480 }), makeStep()],
        })
      )
      expect(result.success).toBe(true)
    })

    it("accepts 4 steps (middle)", () => {
      const result = DecomposeGoalSchema.safeParse(makeDecomposePayload(4))
      expect(result.success).toBe(true)
    })

    it("accepts all valid step fields", () => {
      const result = DecomposeGoalSchema.safeParse({
        goal: "Launch a podcast",
        domain: "media",
        steps: [
          { text: "Record pilot episode", domainTag: "action", estimatedMinutes: 60 },
          { text: "Edit the audio file", domainTag: "action", estimatedMinutes: 30 },
        ],
      })
      expect(result.success).toBe(true)
    })
  })

  describe("invalid payloads", () => {
    it("rejects 1 step (below minimum)", () => {
      const result = DecomposeGoalSchema.safeParse(makeDecomposePayload(1))
      expect(result.success).toBe(false)
    })

    it("rejects 9 steps (above new maximum of 8)", () => {
      const result = DecomposeGoalSchema.safeParse(makeDecomposePayload(9))
      expect(result.success).toBe(false)
    })

    it("rejects empty goal", () => {
      const result = DecomposeGoalSchema.safeParse(makeDecomposePayload(2, { goal: "" }))
      expect(result.success).toBe(false)
    })

    it("rejects step with estimatedMinutes of 0", () => {
      const result = DecomposeGoalSchema.safeParse(
        makeDecomposePayload(2, {
          steps: [makeStep({ estimatedMinutes: 0 }), makeStep()],
        })
      )
      expect(result.success).toBe(false)
    })

    it("rejects step with estimatedMinutes above 480", () => {
      const result = DecomposeGoalSchema.safeParse(
        makeDecomposePayload(2, {
          steps: [makeStep({ estimatedMinutes: 481 }), makeStep()],
        })
      )
      expect(result.success).toBe(false)
    })

    it("rejects completely empty object", () => {
      const result = DecomposeGoalSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe("parsed output shape", () => {
    it("returns correctly typed data for a valid payload", () => {
      const result = DecomposeGoalSchema.safeParse({
        goal: "Write a short story",
        domain: "writing",
        steps: [
          { text: "Outline the plot", domainTag: "planning", estimatedMinutes: 20 },
          { text: "Write first draft", domainTag: "writing", estimatedMinutes: 60 },
        ],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.steps).toHaveLength(2)
        expect(result.data.steps[0].domainTag).toBe("planning")
      }
    })
  })
})

/* ─── UpdateStepsSchema ──────────────────────────────────── */

describe("UpdateStepsSchema", () => {
  describe("valid payloads", () => {
    it("accepts a single completed step", () => {
      const result = UpdateStepsSchema.safeParse({
        results: [{ stepId: "step-1", status: "completed" }],
      })
      expect(result.success).toBe(true)
    })

    it("accepts a clarification_needed step with query", () => {
      const result = UpdateStepsSchema.safeParse({
        results: [
          {
            stepId: "step-2",
            status: "clarification_needed",
            query: "Which gym should I go to?",
          },
        ],
      })
      expect(result.success).toBe(true)
    })

    it("accepts multiple results in one payload", () => {
      const result = UpdateStepsSchema.safeParse({
        results: [
          { stepId: "step-1", status: "completed" },
          { stepId: "step-2", status: "clarification_needed", query: "What format?" },
        ],
      })
      expect(result.success).toBe(true)
    })
  })

  describe("invalid payloads", () => {
    it("rejects empty results array", () => {
      const result = UpdateStepsSchema.safeParse({ results: [] })
      expect(result.success).toBe(false)
    })

    it("rejects unknown status value", () => {
      const result = UpdateStepsSchema.safeParse({
        results: [{ stepId: "step-1", status: "in_progress" }],
      })
      expect(result.success).toBe(false)
    })

    it("rejects missing stepId", () => {
      const result = UpdateStepsSchema.safeParse({
        results: [{ status: "completed" }],
      })
      expect(result.success).toBe(false)
    })

    it("rejects empty stepId", () => {
      const result = UpdateStepsSchema.safeParse({
        results: [{ stepId: "", status: "completed" }],
      })
      expect(result.success).toBe(false)
    })
  })
})
