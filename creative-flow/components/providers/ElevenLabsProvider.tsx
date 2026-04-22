"use client"

import { ConversationProvider } from "@elevenlabs/react"
import type { AudioAlignmentEvent } from "@elevenlabs/client"
import { useStore } from "@/lib/store"
import { audioDuck } from "@/lib/audioDuck"

/**
 * Wraps the ElevenLabs ConversationProvider with app-level callbacks.
 * onMessage and onAudioAlignment are wired here so they are always active
 * regardless of which component starts a session.
 */
export default function ElevenLabsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const setTranscript = useStore((s) => s.setTranscript)
  const setAudioPlaying = useStore((s) => s.setAudioPlaying)
  const tasks = useStore((s) => s.tasks)

  return (
    <ConversationProvider
      onMessage={(msg) => {
        if (msg.role === "user") {
          // 10.1: first user transcript = STT first token
          if (!performance.getEntriesByName("cf:stt_first_token", "mark").length ||
            performance.getEntriesByName("cf:session_start", "mark").at(-1)!.startTime >
            (performance.getEntriesByName("cf:stt_first_token", "mark").at(-1)?.startTime ?? 0)) {
            performance.mark("cf:stt_first_token")
            performance.measure("cf:stt_latency", "cf:session_start", "cf:stt_first_token")
          }
          setTranscript(msg.message)
        } else if (msg.role === "agent") {
          // 10.1: first agent message = agent_response / tts_start
          performance.mark("cf:tts_start")
          if (performance.getEntriesByName("cf:stt_first_token", "mark").length) {
            performance.measure("cf:agent_response_latency", "cf:stt_first_token", "cf:tts_start")
          }
        }
      }}
      onModeChange={({ mode }) => {
        // 5.2: duck background audio when agent is speaking, restore otherwise
        if (mode === "speaking") {
          audioDuck.rampTo(0.3, 150)
        } else {
          // "listening" or any other mode → restore
          audioDuck.rampTo(1.0, 150)
        }
      }}
      onAudioAlignment={(alignment: AudioAlignmentEvent) => {
        const charText = alignment.chars.join("")
        // Need at least a word-length chunk to match meaningfully
        if (charText.trim().length < 6) return
        const activeTasks = tasks.filter((t) => t.status === "active")
        for (const task of activeTasks) {
          for (const step of task.steps) {
            if (
              step.status === "pending" &&
              step.text.toLowerCase().includes(charText.toLowerCase())
            ) {
              setAudioPlaying(true, step.id)
              return
            }
          }
        }
      }}
    >
      {children}
    </ConversationProvider>
  )
}
