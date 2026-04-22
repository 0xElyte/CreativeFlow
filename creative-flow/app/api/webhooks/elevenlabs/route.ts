import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import Redis from "ioredis"
import type { UserSessionRecord } from "@/lib/types"

/* ─── Redis singleton ────────────────────────────────────── */
let redis: Redis | null = null
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    })
  }
  return redis
}

/* ─── Signature validation ───────────────────────────────── */
/**
 * Validates the ElevenLabs-Signature HMAC header.
 * Header format: t=<unix_seconds>,v1=<hex_signature>
 * Signed payload: "<timestamp>.<raw_body>"
 * Rejects events older than 5 minutes to prevent replay attacks.
 */
function validateSignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): boolean {
  try {
    const parts: Record<string, string> = {}
    for (const part of sigHeader.split(",")) {
      const idx = part.indexOf("=")
      if (idx !== -1) parts[part.slice(0, idx)] = part.slice(idx + 1)
    }
    const { t: timestamp, v1: signature } = parts
    if (!timestamp || !signature) return false

    // Replay protection: reject if event is older than 5 min
    const ts = parseInt(timestamp, 10)
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
      return false
    }

    const payload = `${timestamp}.${rawBody}`
    const expected = createHmac("sha256", secret).update(payload).digest("hex")

    // Constant-time comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature, "hex")
    const expBuf = Buffer.from(expected, "hex")
    if (sigBuf.length !== expBuf.length) return false
    return timingSafeEqual(sigBuf, expBuf)
  } catch {
    return false
  }
}

/* ─── Webhook event shape ────────────────────────────────── */
interface PostCallEvent {
  type: "post_call_transcription"
  data: {
    user_id: string
    conversation_id: string
    analysis?: {
      transcript_summary?: string
      call_successful?: boolean
    }
  }
}

/* ─── Route handler ──────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET
  if (!secret) {
    console.error("[webhook] ELEVENLABS_WEBHOOK_SECRET not set")
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }

  // Read raw body (needed for signature validation)
  const rawBody = await req.text()
  const sigHeader = req.headers.get("ElevenLabs-Signature") ?? ""

  // 3.8: Validate HMAC
  if (!validateSignature(rawBody, sigHeader, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: PostCallEvent
  try {
    event = JSON.parse(rawBody) as PostCallEvent
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Only handle post_call_transcription events
  if (event.type !== "post_call_transcription") {
    return NextResponse.json({ ok: true })
  }

  const { user_id, conversation_id, analysis } = event.data
  if (!user_id || !conversation_id) {
    return NextResponse.json({ error: "Missing required event fields" }, { status: 400 })
  }

  // 3.8: Write UserSessionRecord to Redis with 90-day TTL
  const record: UserSessionRecord = {
    transcript_summary: analysis?.transcript_summary ?? "",
    call_successful: analysis?.call_successful ?? false,
    conversation_id,
    timestamp: Date.now(),
  }

  try {
    const kv = getRedis()
    const TTL_SECONDS = 90 * 24 * 60 * 60
    await kv.set(
      `session:${user_id}:latest`,
      JSON.stringify(record),
      "EX",
      TTL_SECONDS
    )
  } catch (err) {
    console.error("[webhook] Redis write failed", err)
    return NextResponse.json({ error: "Storage error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
