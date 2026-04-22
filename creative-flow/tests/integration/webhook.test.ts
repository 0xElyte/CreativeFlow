// @vitest-environment node
/**
 * 9.6 — Integration tests for POST /api/webhooks/elevenlabs
 *
 * Mocks @/lib/redis (local module — reliably intercepted by Vitest)
 * rather than ioredis (third-party package — tricky to mock in Node env).
 */

// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createHmac } from "crypto"
import { NextRequest } from "next/server"

/* ─── Shared Redis mock state ────────────────────────────── */
const redisMockState = {
  setCalls: [] as unknown[][],
  setError: null as Error | null,
}

vi.mock("@/lib/redis", () => ({
  getRedisClient: () => ({
    set: async (...args: unknown[]) => {
      redisMockState.setCalls.push(args)
      if (redisMockState.setError) throw redisMockState.setError
      return "OK"
    },
  }),
  resetRedisClient: vi.fn(),
}))

import { POST } from "@/app/api/webhooks/elevenlabs/route"

/* ─── Helpers ────────────────────────────────────────────── */
const TEST_SECRET = "super-secret-webhook-key"

function buildSignature(body: string, secret: string, tsOverride?: number): string {
  const ts = tsOverride ?? Math.floor(Date.now() / 1000)
  const payload = `${ts}.${body}`
  const sig = createHmac("sha256", secret).update(payload).digest("hex")
  return `t=${ts},v1=${sig}`
}

function makeValidBody(overrides: Partial<{ type: string; user_id: string; conversation_id: string; transcript_summary: string; call_successful: boolean }> = {}) {
  const { type = "post_call_transcription", user_id = "user-abc", conversation_id = "conv-xyz", transcript_summary = "Great session!", call_successful = true } = overrides
  return JSON.stringify({ type, data: { user_id, conversation_id, analysis: { transcript_summary, call_successful } } })
}

function makeReq(body: string, sig: string) {
  return new NextRequest("http://localhost/api/webhooks/elevenlabs", { method: "POST", body, headers: { "ElevenLabs-Signature": sig, "Content-Type": "application/json" } })
}

/* ─── Setup ──────────────────────────────────────────────── */
beforeEach(() => {
  redisMockState.setCalls = []
  redisMockState.setError = null
  process.env.ELEVENLABS_WEBHOOK_SECRET = TEST_SECRET
  process.env.REDIS_URL = "redis://localhost:6379"
})

afterEach(() => {
  delete process.env.ELEVENLABS_WEBHOOK_SECRET
  delete process.env.REDIS_URL
})

/* ─── Tests ──────────────────────────────────────────────── */
describe("POST /api/webhooks/elevenlabs", () => {
  describe("HMAC signature validation", () => {
    it("accepts a valid signature and processes the event", async () => {
      const body = makeValidBody()
      const res = await POST(makeReq(body, buildSignature(body, TEST_SECRET)))
      expect(res.status).toBe(200)
    })

    it("rejects an invalid signature with 401", async () => {
      const body = makeValidBody()
      const res = await POST(makeReq(body, buildSignature(body, "wrong-secret")))
      expect(res.status).toBe(401)
    })

    it("rejects a tampered body with 401", async () => {
      const body = makeValidBody()
      const sig = buildSignature(body, TEST_SECRET)
      const res = await POST(makeReq(body.replace("Great session!", "Hacked!"), sig))
      expect(res.status).toBe(401)
    })

    it("rejects a missing signature header with 401", async () => {
      const body = makeValidBody()
      const req = new NextRequest("http://localhost/api/webhooks/elevenlabs", { method: "POST", body })
      expect((await POST(req)).status).toBe(401)
    })

    it("rejects a replayed event (timestamp older than 5 minutes) with 401", async () => {
      const body = makeValidBody()
      const oldTs = Math.floor(Date.now() / 1000) - 400
      expect((await POST(makeReq(body, buildSignature(body, TEST_SECRET, oldTs)))).status).toBe(401)
    })

    it("rejects a future timestamp (>5 min ahead) with 401", async () => {
      const body = makeValidBody()
      const futureTs = Math.floor(Date.now() / 1000) + 400
      expect((await POST(makeReq(body, buildSignature(body, TEST_SECRET, futureTs)))).status).toBe(401)
    })
  })

  describe("valid post_call_transcription event", () => {
    it("writes UserSessionRecord to Redis with correct key", async () => {
      const body = makeValidBody({ user_id: "user-123", conversation_id: "conv-456" })
      await POST(makeReq(body, buildSignature(body, TEST_SECRET)))
      expect(redisMockState.setCalls).toHaveLength(1)
      expect(redisMockState.setCalls[0][0]).toBe("session:user-123:latest")
    })

    it("writes record with 90-day TTL", async () => {
      const body = makeValidBody()
      await POST(makeReq(body, buildSignature(body, TEST_SECRET)))
      const [, , expFlag, ttl] = redisMockState.setCalls[0] as [string, string, string, number]
      expect(expFlag).toBe("EX")
      expect(ttl).toBe(90 * 24 * 60 * 60)
    })

    it("stores transcript_summary in the record", async () => {
      const body = makeValidBody({ transcript_summary: "User ran 3km today." })
      await POST(makeReq(body, buildSignature(body, TEST_SECRET)))
      const record = JSON.parse(redisMockState.setCalls[0][1] as string)
      expect(record.transcript_summary).toBe("User ran 3km today.")
    })

    it("stores call_successful flag in the record", async () => {
      const body = makeValidBody({ call_successful: false })
      await POST(makeReq(body, buildSignature(body, TEST_SECRET)))
      const record = JSON.parse(redisMockState.setCalls[0][1] as string)
      expect(record.call_successful).toBe(false)
    })

    it("returns 200 on success", async () => {
      const body = makeValidBody()
      expect((await POST(makeReq(body, buildSignature(body, TEST_SECRET)))).status).toBe(200)
    })
  })

  describe("unknown event type", () => {
    it("returns 200 and does NOT write to Redis", async () => {
      const body = makeValidBody({ type: "conversation_started" })
      const res = await POST(makeReq(body, buildSignature(body, TEST_SECRET)))
      expect(res.status).toBe(200)
      expect(redisMockState.setCalls).toHaveLength(0)
    })
  })

  describe("Redis failure", () => {
    it("returns 500 when Redis set throws", async () => {
      redisMockState.setError = new Error("Redis ECONNREFUSED")
      const body = makeValidBody()
      expect((await POST(makeReq(body, buildSignature(body, TEST_SECRET)))).status).toBe(500)
    })
  })

  describe("missing configuration", () => {
    it("returns 500 when ELEVENLABS_WEBHOOK_SECRET is not set", async () => {
      delete process.env.ELEVENLABS_WEBHOOK_SECRET
      const body = makeValidBody()
      expect((await POST(makeReq(body, buildSignature(body, TEST_SECRET)))).status).toBe(500)
    })
  })

  describe("malformed body", () => {
    it("returns 400 when body is not valid JSON", async () => {
      const body = "not json {"
      expect((await POST(makeReq(body, buildSignature(body, TEST_SECRET)))).status).toBe(400)
    })

    it("returns 400 when event data is missing user_id", async () => {
      const body = JSON.stringify({ type: "post_call_transcription", data: { conversation_id: "conv-1" } })
      expect((await POST(makeReq(body, buildSignature(body, TEST_SECRET)))).status).toBe(400)
    })
  })
})
