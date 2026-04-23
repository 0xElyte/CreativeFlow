"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  useConversationControls,
  useConversationStatus,
  useConversationMode,
} from "@elevenlabs/react"
import { useStore } from "@/lib/store"
import type { ConversationTokenResponse } from "@/lib/types"

export type SessionContext = "new_goal" | "progress_update"

export interface UseVoiceSessionReturn {
  /** Start a voice session. Fetches a token, then opens WebRTC. */
  start: (context: SessionContext, todoId?: string) => Promise<void>
  /** Gracefully end the active session. */
  stop: () => void
  /**
   * Silently notifies the agent of a UI action (e.g. user taps a step to
   * mark it complete while a session is active).
   */
  sendContextualUpdate: (message: string) => void
  /** SDK connection status */
  status: "disconnected" | "connecting" | "connected" | "error"
  isSpeaking: boolean
  isListening: boolean
  /** Non-null when the last start attempt failed */
  error: Error | null
  /** True after ≥2 consecutive connection failures — show text fallback */
  showFallback: boolean
  dismissFallback: () => void
  getInputByteFrequencyData: () => Uint8Array
  getOutputByteFrequencyData: () => Uint8Array
}

export function useVoiceSession(): UseVoiceSessionReturn {
  const {
    startSession,
    endSession,
    sendContextualUpdate,
    getInputByteFrequencyData,
    getOutputByteFrequencyData,
  } = useConversationControls()
  const { status } = useConversationStatus()
  const { isSpeaking, isListening } = useConversationMode()

  const failCountRef = useRef(0)
  const [showFallback, setShowFallback] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /* ── Sync SDK state → Zustand store ── */
  const setVoiceState = useStore((s) => s.setVoiceState)
  const setAudioPlaying = useStore((s) => s.setAudioPlaying)
  const userId = useStore((s) => s.session.userId)
  const toneProfile = useStore((s) => s.audio.toneProfile)
  const tasks = useStore((s) => s.tasks)

  useEffect(() => {
    if (status === "disconnected" || status === "error") {
      setVoiceState("idle")
      setAudioPlaying(false)
    } else if (status === "connecting") {
      setVoiceState("connecting")
    } else if (status === "connected") {
      setVoiceState(isSpeaking ? "speaking" : "listening")
    }
  }, [status, isSpeaking, isListening, setVoiceState, setAudioPlaying])

  /* ── Start session ── */
  const start = useCallback(
    async (context: SessionContext, todoId?: string) => {
      // Guard: never start a new session while one is already connecting or connected
      if (status === "connecting" || status === "connected") {
        console.warn("[useVoiceSession] start() called while session is", status, "— ignoring")
        return
      }

      setError(null)

      // Build token request URL (userId comes from Clerk auth server-side)
      const params = new URLSearchParams({ context, profile: toneProfile })
      if (todoId) {
        params.set("todoId", todoId)
        // For progress_update, pass goal + serialised steps so the agent has full context
        const todo = tasks.find((t) => t.id === todoId)
        if (todo) {
          params.set("goal", todo.goal)
          // Format: "1. [stepId] Step text (status: pending, ~15min)"
          const stepsStr = todo.steps
            .map(
              (s, i) =>
                `${i + 1}. [${s.id}] ${s.text} (status: ${s.status}, ~${s.estimatedMinutes}min)`
            )
            .join("\n")
          params.set("steps", stepsStr)
        }
      }

      let tokenData: ConversationTokenResponse
      try {
        const res = await fetch(`/api/conversation/token?${params.toString()}`)
        if (!res.ok) {
          throw new Error(`Token request failed: HTTP ${res.status}`)
        }
        tokenData = (await res.json()) as ConversationTokenResponse
      } catch (e) {
        failCountRef.current += 1
        if (failCountRef.current >= 2) setShowFallback(true)
        const err = e instanceof Error ? e : new Error("Token fetch failed")
        setError(err)
        return
      }

      const { conversationToken, dynamicVariables } = tokenData

      // 10.1: mark session start for performance measurement
      performance.mark("cf:session_start")

      startSession({
        conversationToken,
        dynamicVariables,
        userId,
        onConnect: () => {
          failCountRef.current = 0
        },
        onDisconnect: () => {
          setAudioPlaying(false)
          performance.mark("cf:session_end")
          performance.measure("cf:session_duration", "cf:session_start", "cf:session_end")
        },
        onError: (msg) => {
          failCountRef.current += 1
          if (failCountRef.current >= 2) setShowFallback(true)
          setError(new Error(msg))
        },
      })
    },
    [startSession, toneProfile, userId, tasks, setAudioPlaying]
  )

  /* ── Stop session ── */
  const stop = useCallback(() => {
    endSession()
  }, [endSession])

  return {
    start,
    stop,
    sendContextualUpdate,
    status,
    isSpeaking,
    isListening,
    error,
    showFallback,
    dismissFallback: () => setShowFallback(false),
    getInputByteFrequencyData,
    getOutputByteFrequencyData,
  }
}
