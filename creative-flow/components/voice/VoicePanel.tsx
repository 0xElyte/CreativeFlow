"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import VoiceOrb from "./VoiceOrb"
import FeedbackButtons from "./FeedbackButtons"
import { useVoiceSession } from "@/hooks/useVoiceSession"
import { useClientTools } from "@/hooks/useClientTools"
import { useStore } from "@/lib/store"
import type { VoiceState } from "@/lib/types"

function MicIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
      style={{ color: "var(--cf-text-2)" }}
    >
      <rect x="10" y="2" width="8" height="14" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 14c0 5 4 9 9 9s9-4 9-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line x1="14" y1="23" x2="14" y2="27" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

const STATE_HINT: Record<VoiceState, string> = {
  idle:       "Hold the orb and speak your goal",
  connecting: "Connecting to your assistant\u2026",
  listening:  "Keep speaking — release when done",
  processing: "Thinking through your goal\u2026",
  speaking:   "Your assistant is responding",
}

export default function VoicePanel() {
  const session = useVoiceSession()
  const voiceState = useStore((s) => s.session.voiceState)
  const transcript = useStore((s) => s.session.transcript)

  // 4.4: Register decompose_goal + update_steps client tools
  const { lastError, clearError, canRetryDecompose } = useClientTools()

  // Fallback text input state
  const [fallbackText, setFallbackText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus fallback input when shown
  useEffect(() => {
    if (session.showFallback) inputRef.current?.focus()
  }, [session.showFallback])

  const handlePress = () => {
    void session.start("new_goal")
  }

  const handleRelease = () => {
    // Session ends after the agent finishes speaking; releasing mic just
    // signals end of user utterance — the SDK handles the rest.
  }

  // 4.5: Retry decompose_goal by resending last transcript
  const handleRetryDecompose = () => {
    clearError()
    if (transcript) {
      session.sendContextualUpdate(
        `Please try decomposing my goal again. My goal was: ${transcript}`
      )
    }
  }

  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fallbackText.trim()) return
    // TODO: wire to sendUserMessage in Task 8 (voice orchestration)
    setFallbackText("")
  }

  return (
    <aside
      className="flex flex-col items-center gap-8 rounded-2xl overflow-hidden"
      style={{
        width: 300,
        flexShrink: 0,
        background: "var(--cf-card)",
        border: "1.5px solid var(--cf-card-border)",
        boxShadow: "0 4px 24px oklch(0% 0 0 / 0.04), 0 1px 4px oklch(0% 0 0 / 0.05)",
        padding: "28px 24px 32px",
      }}
      aria-label="Voice interaction panel"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl"
          style={{ background: "var(--cf-surface)" }}
        >
          <MicIcon />
        </div>
        <h2 className="text-base font-semibold" style={{ color: "var(--cf-text-1)" }}>
          Voice Interaction
        </h2>
      </div>

      {/* Orb */}
      <VoiceOrb
        state={voiceState}
        onPress={handlePress}
        onRelease={handleRelease}
        disabled={session.status === "connecting"}
        getInputFrequency={session.getInputByteFrequencyData}
        getOutputFrequency={session.getOutputByteFrequencyData}
      />

      {/* Hint / transcript */}
      <AnimatePresence mode="wait">
        {transcript && voiceState !== "idle" ? (
          <motion.p
            key="transcript"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-center max-w-[220px] leading-relaxed italic"
            style={{ color: "var(--cf-text-2)" }}
          >
            &ldquo;{transcript}&rdquo;
          </motion.p>
        ) : (
          <motion.p
            key={voiceState}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="text-xs text-center max-w-[200px] leading-relaxed"
            style={{ color: "var(--cf-text-3)" }}
          >
            {STATE_HINT[voiceState]}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Session error banner (connection failures) */}
      <AnimatePresence>
        {session.error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full rounded-lg px-3 py-2 text-xs text-center"
            style={{
              background: "oklch(97% 0.03 30)",
              color: "oklch(40% 0.18 30)",
              border: "1px solid oklch(88% 0.07 30)",
            }}
          >
            {session.error.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool error toast with optional retry button (4.5) */}
      <AnimatePresence>
        {lastError && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full rounded-lg px-3 py-2.5 flex flex-col gap-2"
            style={{
              background: "oklch(15% 0.02 278)",
              border: "1.5px solid oklch(88% 0.07 30 / 0.4)",
            }}
          >
            <p className="text-xs" style={{ color: "oklch(80% 0.12 30)" }}>
              {lastError}
            </p>
            <div className="flex gap-2">
              {canRetryDecompose && (
                <button
                  onClick={handleRetryDecompose}
                  className="text-xs font-semibold rounded-md px-2.5 py-1"
                  style={{
                    background: "var(--cf-amber)",
                    color: "oklch(18% 0.01 55)",
                  }}
                >
                  Retry
                </button>
              )}
              <button
                onClick={clearError}
                className="text-xs rounded-md px-2.5 py-1"
                style={{
                  background: "var(--cf-surface)",
                  color: "var(--cf-text-3)",
                  border: "1px solid var(--cf-card-border)",
                }}
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-session feedback (4.7) */}
      <FeedbackButtons />

      {/* Fallback text input (shown after ≥2 connection failures) */}
      <AnimatePresence>
        {session.showFallback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col gap-2"
          >
            <p className="text-xs text-center" style={{ color: "var(--cf-text-3)" }}>
              Voice unavailable — type your goal
            </p>
            <form onSubmit={handleFallbackSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={fallbackText}
                onChange={(e) => setFallbackText(e.target.value)}
                placeholder="Describe your goal…"
                className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                style={{
                  background: "var(--cf-surface)",
                  border: "1.5px solid var(--cf-card-border)",
                  color: "var(--cf-text-1)",
                }}
                aria-label="Type your goal as a fallback"
              />
              <button
                type="submit"
                className="rounded-lg px-3 py-2 text-xs font-semibold"
                style={{
                  background: "var(--cf-amber)",
                  color: "oklch(18% 0.01 55)",
                }}
              >
                Go
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}

