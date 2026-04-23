import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { getRedisClient } from "@/lib/redis"

const TASKS_TTL = 30 * 24 * 60 * 60 // 30 days in seconds

/* ─── Validation ─────────────────────────────────────────── */
const StepSchema = z.object({
  id: z.string(),
  text: z.string(),
  domainTag: z.string(),
  estimatedMinutes: z.number(),
  status: z.enum(["pending", "completed", "clarification_needed", "unmatched"]),
  completedAt: z.number().optional(),
})

const TaskSchema = z.object({
  id: z.string(),
  goal: z.string(),
  domain: z.string(),
  steps: z.array(StepSchema),
  status: z.enum(["active", "completed", "archived"]), // drafts are never persisted
  toneProfile: z.enum(["calm_mentor", "hype_coach", "gentle_guide"]),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().optional(),
})

/* ─── GET /api/tasks ─────────────────────────────────────── */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const redis = getRedisClient()
    const raw = await redis.hgetall(`tasks:${userId}`)
    const tasks = Object.values(raw ?? {}).map((v) => JSON.parse(v as string))
    return NextResponse.json({ tasks })
  } catch {
    return NextResponse.json({ tasks: [] })
  }
}

/* ─── POST /api/tasks — upsert a single task ─────────────── */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = TaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid task payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const redis = getRedisClient()
    await redis.hset(`tasks:${userId}`, parsed.data.id, JSON.stringify(parsed.data))
    await redis.expire(`tasks:${userId}`, TASKS_TTL)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to save task" }, { status: 500 })
  }
}
