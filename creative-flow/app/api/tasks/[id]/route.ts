import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getRedisClient } from "@/lib/redis"

interface Props {
  params: Promise<{ id: string }>
}

/* ─── DELETE /api/tasks/[id] ─────────────────────────────── */
export async function DELETE(_req: Request, { params }: Props) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const redis = getRedisClient()
    await redis.hdel(`tasks:${userId}`, id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
