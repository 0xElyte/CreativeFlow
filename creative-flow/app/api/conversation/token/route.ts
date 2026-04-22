import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { getRedisClient } from "@/lib/redis"
import { TONE_CONFIGS } from "@/lib/constants"
import type { ToneProfile, UserSessionRecord } from "@/lib/types"

/* ─── Validation ─────────────────────────────────────────── */
const QuerySchema = z.object({
  context: z.enum(["new_goal", "progress_update"]),
  profile: z.enum(["calm_mentor", "hype_coach", "gentle_guide"]),
  todoId: z.string().optional(),
  goal: z.string().optional(),
  steps: z.string().optional(),
})

/* ─── Route handler ──────────────────────────────────────── */
export async function GET(req: NextRequest) {
  /* Auth gate */
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  /* 3.1: Validate params */
  const raw = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = QuerySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { context, profile, todoId, goal, steps } = parsed.data
  const toneConfig = TONE_CONFIGS[profile as ToneProfile]

  /* 3.1: Fetch WebRTC token from ElevenLabs */
  const agentId = process.env.ELEVENLABS_AGENT_ID
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!agentId || !apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: ElevenLabs credentials missing" },
      { status: 500 }
    )
  }

  let conversationToken: string
  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey }, cache: "no-store" }
    )
    if (!elRes.ok) {
      const body = await elRes.text()
      console.error("[token] ElevenLabs error", elRes.status, body)
      return NextResponse.json(
        { error: "Failed to obtain conversation token" },
        { status: 502 }
      )
    }
    const data = (await elRes.json()) as { token: string }
    conversationToken = data.token
  } catch (err) {
    console.error("[token] ElevenLabs fetch failed", err)
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 503 })
  }

  /* 3.9: Fetch previous session summary from Redis */
  let previousSessionsSummary: string | undefined
  try {
    const kv = getRedisClient()
    const record = await kv.get(`session:${userId}:latest`)
    if (record) {
      const parsed = JSON.parse(record) as UserSessionRecord
      if (parsed.transcript_summary) {
        previousSessionsSummary = parsed.transcript_summary
      }
    }
  } catch {
    // Non-fatal — agent starts without memory context
  }

  /* 3.1: Build dynamicVariables */
  const dynamicVariables: Record<string, string> = {
    tone_profile: profile,
    voice_id: toneConfig.voiceId || profile,
    context,
  }
  if (previousSessionsSummary) {
    dynamicVariables.previous_sessions_summary = previousSessionsSummary
  }
  if (goal) {
    dynamicVariables.goal = goal
  }
  if (steps) {
    dynamicVariables.steps = steps
  }
  // For progress_update, todoId carries the task context
  if (context === "progress_update" && todoId) {
    dynamicVariables.todo_id = todoId
  }

  /* 3.2: Security headers */
  const response = NextResponse.json({ conversationToken, dynamicVariables })
  response.headers.set("Cache-Control", "no-store")
  response.headers.set("X-Content-Type-Options", "nosniff")
  return response
}
