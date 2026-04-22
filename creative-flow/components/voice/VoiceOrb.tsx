"use client"

import { useEffect, useRef } from "react"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import type { VoiceState } from "@/lib/types"

interface VoiceOrbProps {
  state: VoiceState
  onPress: () => void
  onRelease: () => void
  disabled?: boolean
  /** Frequency data for mic input — drives glow when listening */
  getInputFrequency?: () => Uint8Array
  /** Frequency data for speaker output — drives glow when speaking */
  getOutputFrequency?: () => Uint8Array
}

/* ─── Ring animation variants ───────────────────────────── */
const outerRingVariants: Variants = {
  idle: {
    scale: [1, 1.04, 1],
    opacity: [0.55, 0.75, 0.55],
    rotate: [0, 180, 360],
    transition: { duration: 4, repeat: Infinity, ease: "linear" },
  },
  connecting: {
    scale: [1, 1.08, 1],
    opacity: [0.5, 0.9, 0.5],
    rotate: [0, 360],
    transition: { duration: 1.6, repeat: Infinity, ease: "linear" },
  },
  listening: {
    scale: [1, 1.12, 1.06, 1.12, 1],
    opacity: [0.7, 1, 0.8, 1, 0.7],
    rotate: [0, 360],
    transition: { duration: 1.4, repeat: Infinity, ease: "linear" },
  },
  processing: {
    scale: [1, 1.06, 1],
    opacity: [0.6, 0.9, 0.6],
    rotate: [0, 360],
    transition: { duration: 0.9, repeat: Infinity, ease: "linear" },
  },
  speaking: {
    scale: [1, 1.1, 1.04, 1.1, 1],
    opacity: [0.8, 1, 0.75, 1, 0.8],
    rotate: [0, -360],
    transition: { duration: 1.2, repeat: Infinity, ease: "linear" },
  },
}

const innerRingVariants: Variants = {
  idle: {
    scale: [1, 1.02, 1],
    opacity: [0.3, 0.5, 0.3],
    rotate: [0, -120, -240, -360],
    transition: { duration: 6, repeat: Infinity, ease: "linear" },
  },
  connecting: {
    scale: [1, 1.05, 1],
    opacity: [0.4, 0.7, 0.4],
    rotate: [0, -360],
    transition: { duration: 2, repeat: Infinity, ease: "linear" },
  },
  listening: {
    scale: [1, 1.08, 1.02, 1.08, 1],
    opacity: [0.6, 0.9, 0.65, 0.9, 0.6],
    rotate: [0, -360],
    transition: { duration: 1.8, repeat: Infinity, ease: "linear" },
  },
  processing: {
    scale: [1, 1.04, 1],
    opacity: [0.5, 0.85, 0.5],
    rotate: [0, -360],
    transition: { duration: 1.2, repeat: Infinity, ease: "linear" },
  },
  speaking: {
    scale: [1, 1.06, 1.02, 1.06, 1],
    opacity: [0.7, 1, 0.6, 1, 0.7],
    rotate: [0, 360],
    transition: { duration: 1.5, repeat: Infinity, ease: "linear" },
  },
}

const coreVariants: Variants = {
  idle:       { scale: 1,    transition: { duration: 0.3 } },
  connecting: { scale: 0.96, transition: { duration: 0.3 } },
  listening:  { scale: 1.04, transition: { duration: 0.2 } },
  processing: { scale: 0.98, transition: { duration: 0.25 } },
  speaking:   { scale: 1.06, transition: { duration: 0.2 } },
}

const LABELS: Record<VoiceState, string> = {
  idle:       "Speak Your\nIntent",
  connecting: "Connecting\u2026",
  listening:  "Listening\u2026",
  processing: "Processing\u2026",
  speaking:   "Speaking\u2026",
}

/* ─── Colour config per state ────────────────────────────── */
const RING_COLORS: Record<VoiceState, { outer: string; inner: string }> = {
  idle:       { outer: "oklch(73% 0.17 55)",  inner: "oklch(54% 0.19 295)" },
  connecting: { outer: "oklch(73% 0.17 55)",  inner: "oklch(54% 0.19 295)" },
  listening:  { outer: "oklch(65% 0.22 30)",  inner: "oklch(73% 0.17 55)"  },
  processing: { outer: "oklch(54% 0.19 295)", inner: "oklch(73% 0.17 55)"  },
  speaking:   { outer: "oklch(73% 0.17 55)",  inner: "oklch(65% 0.22 30)"  },
}

export default function VoiceOrb({
  state,
  onPress,
  onRelease,
  disabled = false,
  getInputFrequency,
  getOutputFrequency,
}: VoiceOrbProps) {
  const prefersReduced = useReducedMotion()
  const colors = RING_COLORS[state]
  const label = LABELS[state]

  /* ── Frequency-driven glow (4.6) ────────────────────────── */
  const glowRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const isActive = state === "speaking" || state === "listening"

    if (!isActive || prefersReduced) {
      cancelAnimationFrame(rafRef.current)
      if (glowRef.current) {
        glowRef.current.style.transform = "scale(1)"
        glowRef.current.style.boxShadow = "none"
      }
      return
    }

    const tick = () => {
      const data =
        state === "speaking"
          ? getOutputFrequency?.()
          : getInputFrequency?.()

      if (data && data.length > 0) {
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        const avg = sum / data.length
        const normalized = avg / 255 // 0–1
        const scale = 1 + normalized * 0.22 // 1.0–1.22
        const blur = normalized * 18 // 0–18px
        const spread = normalized * 6 // 0–6px
        const color =
          state === "speaking"
            ? `oklch(73% 0.17 55 / ${0.45 + normalized * 0.55})`
            : `oklch(65% 0.22 30 / ${0.4 + normalized * 0.6})`

        if (glowRef.current) {
          glowRef.current.style.transform = `scale(${scale.toFixed(3)})`
          glowRef.current.style.boxShadow = `0 0 ${blur.toFixed(1)}px ${spread.toFixed(1)}px ${color}`
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [state, getInputFrequency, getOutputFrequency, prefersReduced])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); onPress() }
  }
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") onRelease()
  }

  // Reduced motion: skip ring animations
  const outerAnimate = prefersReduced ? { opacity: 0.6 } : state
  const innerAnimate = prefersReduced ? { opacity: 0.4 } : state

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 200, height: 200 }}
      aria-label={`Voice orb — ${state}`}
    >
      {/* Frequency glow layer — imperative scale + box-shadow via RAF */}
      <div
        ref={glowRef}
        className="absolute rounded-full pointer-events-none"
        style={{ width: 140, height: 140 }}
      />

      {/* Outer ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 196,
          height: 196,
          border: `3px solid ${colors.outer}`,
          background: "transparent",
        }}
        variants={outerRingVariants}
        animate={outerAnimate}
      />

      {/* Inner ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 168,
          height: 168,
          border: `2px solid ${colors.inner}`,
          background: "transparent",
        }}
        variants={innerRingVariants}
        animate={innerAnimate}
      />

      {/* Core button */}
      <motion.button
        className="relative z-10 flex flex-col items-center justify-center rounded-full text-center focus-visible:outline-none"
        style={{
          width: 140,
          height: 140,
          background: "var(--cf-bg)",
          color: "var(--cf-text-inv)",
          cursor: disabled ? "not-allowed" : "pointer",
          userSelect: "none",
          WebkitUserSelect: "none",
          border: "2px solid var(--cf-bg-border)",
        }}
        variants={coreVariants}
        animate={prefersReduced ? "idle" : state}
        onPointerDown={() => !disabled && onPress()}
        onPointerUp={() => !disabled && onRelease()}
        onPointerLeave={() => state === "listening" && onRelease()}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        disabled={disabled}
        aria-label={`Voice control — ${state}. Hold to speak.`}
        aria-pressed={state === "listening"}
      >
        <span
          className="text-xs font-semibold text-center whitespace-pre-line leading-tight"
          style={{
            color: "var(--cf-text-inv)",
            fontSize: 11,
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
      </motion.button>
    </div>
  )
}
