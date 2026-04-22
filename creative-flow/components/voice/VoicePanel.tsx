"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import VoiceOrb from "./VoiceOrb"
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
      <line
        x1="14"
        y1="23"
        x2="14"
        y2="27"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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
  const [orbState, setOrbState] = useState<VoiceState>("idle")

  const handlePress = useCallback(() => {
    // Task 3 will wire this to the real ElevenLabs session
    setOrbState("listening")
  }, [])

  const handleRelease = useCallback(() => {
    if (orbState === "listening") {
      setOrbState("processing")
      // Simulate processing → speaking → idle (mock, will be replaced in Task 3)
      setTimeout(() => setOrbState("speaking"), 1200)
      setTimeout(() => setOrbState("idle"), 3200)
    }
  }, [orbState])

  return (
    <aside
      className="flex flex-col items-center gap-8 rounded-2xl overflow-hidden"
      style={{
        width: 300,
        flexShrink: 0,
        background: "var(--cf-card)",
        border: "1.5px solid var(--cf-card-border)",
        boxShadow:
          "0 4px 24px oklch(0% 0 0 / 0.04), 0 1px 4px oklch(0% 0 0 / 0.05)",
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
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--cf-text-1)" }}
        >
          Voice Interaction
        </h2>
      </div>

      {/* Orb */}
      <VoiceOrb
        state={orbState}
        onPress={handlePress}
        onRelease={handleRelease}
      />

      {/* Hint text */}
      <motion.p
        key={orbState}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="text-xs text-center max-w-[200px] leading-relaxed"
        style={{ color: "var(--cf-text-3)" }}
      >
        {STATE_HINT[orbState]}
      </motion.p>
    </aside>
  )
}
