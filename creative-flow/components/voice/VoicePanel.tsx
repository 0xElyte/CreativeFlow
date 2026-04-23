"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import VoiceOrb from "./VoiceOrb"
import FeedbackButtons from "./FeedbackButtons"
import { useVoiceSession } from "@/hooks/useVoiceSession"
import { useClientTools } from "@/hooks/useClientTools"
import { useStore } from "@/lib/store"
import type { SessionContext } from "@/hooks/useVoiceSession"
import type { VoiceState } from "@/lib/types"

/* ─── Mic permission modal (8.5) ─────────────────────────── */
function MicPermissionModal({ onDismiss }: { onDismiss: () => void }) {
  // Detect browser for specific guidance
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua)
  const isFirefox = /Firefox/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)

  const steps = isChrome
    ? ["Click the lock icon in the address bar", 'Set "Microphone" to Allow', "Reload the page"]
    : isFirefox
    ? ["Click the lock icon in the address bar", 'Choose "Connection Secure"', 'Under "Permissions", allow Microphone', "Reload the page"]
    : isSafari
    ? ["Open Safari → Settings for This Website", 'Set "Microphone" to Allow', "Reload the page"]
    : ["Open your browser's site settings", "Allow microphone access", "Reload the page"]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "oklch(0% 0 0 / 0.6)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mic-modal-title"
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        transition={{ duration: 0.22 }}
        className="flex flex-col gap-5 rounded-2xl p-7 max-w-sm w-full"
        style={{
          background: "var(--cf-card)",
          border: "1.5px solid var(--cf-card-border)",
          boxShadow: "0 8px 40px oklch(0% 0 0 / 0.25)",
        }}
      >
        <div className="flex items-start gap-4">
          <span className="text-3xl" aria-hidden>🎙️</span>
          <div className="flex flex-col gap-1">
            <h2
              id="mic-modal-title"
              className="text-base font-semibold"
              style={{ color: "var(--cf-text-1)" }}
            >
              Microphone access denied
            </h2>
            <p className="text-sm" style={{ color: "var(--cf-text-3)" }}>
              CreativeFlow needs your mic to hear your goals. Here&apos;s how to enable it:
            </p>
          </div>
        </div>

        <ol className="flex flex-col gap-2 pl-0 list-none">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "var(--cf-amber)", color: "oklch(18% 0.01 55)" }}
              >
                {i + 1}
              </span>
              <span className="text-sm" style={{ color: "var(--cf-text-2)" }}>
                {step}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
            style={{ background: "var(--cf-amber)", color: "oklch(18% 0.01 55)" }}
          >
            Reload now
          </button>
          <button
            onClick={onDismiss}
            className="rounded-xl px-4 py-2.5 text-sm"
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
    </motion.div>
  )
}

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
  idle:       "Tap the orb to start talking",
  connecting: "Connecting to your assistant\u2026",
  listening:  "Listening\u2026 tap orb to end session",
  processing: "Thinking through your goal\u2026",
  speaking:   "Your assistant is responding \u2014 tap orb to end",
}

/* ─── Props (8.1) ────────────────────────────────────────── */
interface VoicePanelProps {
  /**
   * Which conversation context to open.
   * Defaults to "new_goal" (dashboard).
   * Pass "progress_update" from the Projects page.
   */
  context?: SessionContext
  /**
   * When context is "progress_update", the id of the active TodoItem
   * whose steps the agent should reference.
   */
  activeTodoId?: string
}

export default function VoicePanel({ context = "new_goal", activeTodoId }: VoicePanelProps) {
  const session = useVoiceSession()
  const voiceState = useStore((s) => s.session.voiceState)
  const transcript = useStore((s) => s.session.transcript)

  // 4.4: Register decompose_goal + update_steps client tools
  const { lastError, clearError, canRetryDecompose } = useClientTools(session.stop)

  // Mic permission denied state (8.5)
  const [micDenied, setMicDenied] = useState(false)

  // Fallback text input state
  const [fallbackText, setFallbackText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus fallback input when shown
  useEffect(() => {
    if (session.showFallback) inputRef.current?.focus()
  }, [session.showFallback])

  // 8.2 / 8.3: pass context + todoId to session.start
  const handlePress = async () => {
    // If a session is already active, pressing the orb ends it
    if (voiceState !== "idle") {
      session.stop()
      return
    }

    try {
      // Probe mic permission before starting (8.5)
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setMicDenied(true)
        return
      }
    }
    void session.start(context, activeTodoId)
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
    <>
      {/* 8.5: Mic permission denied modal */}
      <AnimatePresence>
        {micDenied && <MicPermissionModal onDismiss={() => setMicDenied(false)} />}
      </AnimatePresence>

      <aside
      className="flex flex-col items-center gap-8 rounded-2xl overflow-hidden w-full md:w-[300px]"
      style={{
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
    </>
  )
}

