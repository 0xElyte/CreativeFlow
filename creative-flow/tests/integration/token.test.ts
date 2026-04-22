// @vitest-environment node
/**
 * 9.5 — Integration tests for GET /api/conversation/token
 *
 * Mocks @/lib/redis (local module — reliably intercepted by Vitest)
 * rather than ioredis (third-party package — tricky to mock in Node env).
 */

// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

/* ─── Shared Redis mock state ────────────────────────────── */
const redisMockState = {
  getReturn: null as string | null | Error,
}

vi.mock("@/lib/redis", () => ({
  getRedisClient: () => ({
    get: async (_key: string) => {
      if (redisMockState.getReturn instanceof Error) throw redisMockState.getReturn
      return redisMockState.getReturn
    },
  }),
  resetRedisClient: vi.fn(),
}))

import { GET } from "@/app/api/conversation/token/route"

/* ─── Helpers ────────────────────────────────────────────── */
const VALID_USER_ID = "550e8400-e29b-41d4-a716-446655440000"

function makeUrl(params: Record<string, string>) {
  const url = new URL("http://localhost/api/conversation/token")
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}
function makeReq(params: Record<string, string>) {
  return new NextRequest(makeUrl(params))
}

/* ─── Setup ──────────────────────────────────────────────── */
beforeEach(() => {
  redisMockState.getReturn = null
  process.env.ELEVENLABS_API_KEY = "test-api-key"
  process.env.ELEVENLABS_AGENT_ID = "test-agent-id"
  process.env.REDIS_URL = "redis://localhost:6379"
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: "test-conversation-token" }), { status: 200 })
    )
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.ELEVENLABS_API_KEY
  delete process.env.ELEVENLABS_AGENT_ID
  delete process.env.REDIS_URL
})

/* ─── Tests ──────────────────────────────────────────────── */
describe("GET /api/conversation/token", () => {
  describe("valid request — new_goal context", () => {
    it("returns 200 with conversationToken and dynamicVariables", async () => {
      const res = await GET(makeReq({ context: "new_goal", profile: "calm_mentor", userId: VALID_USER_ID }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.conversationToken).toBe("test-conversation-token")
      expect(body.dynamicVariables.context).toBe("new_goal")
      expect(body.dynamicVariables.tone_profile).toBe("calm_mentor")
      expect(body.dynamicVariables.voice_id).toBeDefined()
    })

    it("sets Cache-Control: no-store header", async () => {
      const res = await GET(makeReq({ context: "new_goal", profile: "calm_mentor", userId: VALID_USER_ID }))
      expect(res.headers.get("Cache-Control")).toBe("no-store")
    })

    it("sets X-Content-Type-Options: nosniff header", async () => {
      const res = await GET(makeReq({ context: "new_goal", profile: "hype_coach", userId: VALID_USER_ID }))
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
    })
  })

  describe("valid request — progress_update context", () => {
    it("includes todo_id in dynamicVariables when provided", async () => {
      const res = await GET(makeReq({ context: "progress_update", profile: "gentle_guide", userId: VALID_USER_ID, todoId: "todo-abc-123" }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.dynamicVariables.context).toBe("progress_update")
      expect(body.dynamicVariables.todo_id).toBe("todo-abc-123")
    })

    it("omits todo_id when not provided", async () => {
      const res = await GET(makeReq({ context: "progress_update", profile: "calm_mentor", userId: VALID_USER_ID }))
      const body = await res.json()
      expect(body.dynamicVariables.todo_id).toBeUndefined()
    })
  })

  describe("previous_sessions_summary injection", () => {
    it("injects summary when Redis returns a session record", async () => {
      redisMockState.getReturn = JSON.stringify({
        transcript_summary: "Last session: user completed 2 steps of a fitness goal.",
        call_successful: true,
        conversation_id: "conv-123",
        timestamp: Date.now(),
      })
      const res = await GET(makeReq({ context: "new_goal", profile: "calm_mentor", userId: VALID_USER_ID }))
      const body = await res.json()
      expect(body.dynamicVariables.previous_sessions_summary).toBe(
        "Last session: user completed 2 steps of a fitness goal."
      )
    })

    it("omits previous_sessions_summary when Redis returns null", async () => {
      redisMockState.getReturn = null
      const res = await GET(makeReq({ context: "new_goal", profile: "calm_mentor", userId: VALID_USER_ID }))
      const body = await res.json()
      expect(body.dynamicVariables.previous_sessions_summary).toBeUndefined()
    })

    it("omits summary when Redis record has empty transcript_summary", async () => {
      redisMockState.getReturn = JSON.stringify({ transcript_summary: "", call_successful: false, conversation_id: "c1", timestamp: 0 })
      const res = await GET(makeReq({ context: "new_goal", profile: "calm_mentor", userId: VALID_USER_ID }))
      const body = await res.json()
      expect(body.dynamicVariables.previous_sessions_summary).toBeUndefined()
    })

    it("omits summary gracefully when Redis throws", async () => {
      redisMockState.getReturn = new Error("Redis connection refused")
      const res = await GET(makeReq({ context: "new_goal", profile: "calm_mentor", userId: VALID_USER_ID }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.dynamicVariables.previous_sessions_summary).toBeUndefined()
    })
  })

  describe("invalid requests — 400 responses", () => {
    it("rejects unknown context value", async () => {
      const res = await GET(makeReq({ context: "unknown_ctx", profile: "calm_mentor", userId: VALID_USER_ID }))
      expect(res.status).toBe(400)
    })

    it("rejects unknown profile value", async () => {
      const res = await GET(makeReq({ context: "new_goal", profile: "robot_voice", userId: VALID_USER_ID }))
      expect(res.status).toBe(400)
    })

    it("rejects non-UUID userId", async () => {
      const res = await GET(makeReq({ context: "new_goal", profile: "calm_mentor", userId: "not-a-uuid" }))
      expect(res.status).toBe(400)
    })

    it("rejects missing required params", async () => {
      const res = await GET(new NextRequest("http://localhost/api/conversation/token"))
      expect(res.status).toBe(400)
    })
  })

  describe("server misconfiguration", () => {
    it("returns 500 when ELEVENLABS_API_KEY is missing", async () => {
      delete process.env.ELEVENLABS_API_KEY
      const res = await GET(makeReq({ context: "new_goal", profile: "calm_mentor", userId: VALID_USER_ID }))
      expect(res.status).toBe(500)
    })

    it("returns 502 when ElevenLabs API returns non-200", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })))
      const res = await GET(makeReq({ context: "new_goal", profile: "calm_mentor", userId: VALID_USER_ID }))
      expect(res.status).toBe(502)
    })

    it("returns 503 when ElevenLabs fetch throws a network error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")))
      const res = await GET(makeReq({ context: "new_goal", profile: "calm_mentor", userId: VALID_USER_ID }))
      expect(res.status).toBe(503)
    })
  })
})
