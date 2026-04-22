"use client"

import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { useStore } from "@/lib/store"
import { TONE_CONFIGS } from "@/lib/constants"
import type { TodoItem, TodoStep } from "@/lib/types"
import { useVoiceSession } from "@/hooks/useVoiceSession"

interface StepListProps {
  todo: TodoItem
}

/* ─── Icons ──────────────────────────────────────────────── */
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.5 7L5.5 10L11.5 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 3.5V6L7.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Step row ───────────────────────────────────────────── */
interface StepRowProps {
  step: TodoStep
  index: number
  accent: string
  track: string
  isAudioActive: boolean
  onTap: (stepId: string) => void
}

function StepRow({ step, index, accent, track, isAudioActive, onTap }: StepRowProps) {
  const prefersReduced = useReducedMotion()
  const isDone = step.status === "completed"
  const isClarification = step.status === "clarification_needed"

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: prefersReduced ? 0 : 0.22,
        delay: prefersReduced ? 0 : index * 0.05,
      }}
      className="flex items-start gap-3 group"
    >
      {/* Step number / check button */}
      <motion.button
        onClick={() => !isDone && onTap(step.id)}
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 focus-visible:outline-none focus-visible:ring-2 transition-colors duration-150"
        style={{
          background: isDone ? accent : track,
          color: isDone ? "oklch(14% 0.008 278)" : "var(--cf-text-3)",
          border: isAudioActive && !isDone ? `2px solid ${accent}` : "2px solid transparent",
          cursor: isDone ? "default" : "pointer",
        }}
        aria-label={isDone ? `Step ${index + 1} completed` : `Mark step ${index + 1} complete`}
        disabled={isDone}
        whileHover={isDone || prefersReduced ? {} : { scale: 1.1 }}
        whileTap={isDone || prefersReduced ? {} : { scale: 0.9 }}
      >
        {isDone ? <CheckIcon /> : <span>{index + 1}</span>}
      </motion.button>

      {/* Step content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Text with strikethrough when done */}
        <span
          className="text-sm leading-snug"
          style={{
            color: isDone
              ? "var(--cf-text-3)"
              : isClarification
              ? "oklch(65% 0.15 30)"
              : isAudioActive
              ? "var(--cf-text-1)"
              : "var(--cf-text-2)",
            textDecoration: isDone ? "line-through" : "none",
            fontWeight: isAudioActive && !isDone ? 600 : 400,
          }}
        >
          {step.text}
        </span>

        {/* Time estimate + clarification note */}
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: "var(--cf-text-3)" }}
          >
            <ClockIcon />
            {step.estimatedMinutes}m
          </span>

          {isClarification && (
            <AnimatePresence>
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={
                  prefersReduced
                    ? { opacity: 1 }
                    : {
                        opacity: [1, 0.5, 1],
                        transition: { duration: 1.8, repeat: Infinity },
                      }
                }
                className="text-xs font-medium rounded-full px-2 py-0.5"
                style={{
                  background: "oklch(97% 0.03 30)",
                  color: "oklch(45% 0.15 30)",
                  border: "1px solid oklch(88% 0.07 30)",
                }}
              >
                Needs clarification
              </motion.span>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Audio-active highlight bar */}
      <AnimatePresence>
        {isAudioActive && !isDone && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            className="absolute left-0 w-0.5 rounded-full"
            style={{
              height: 28,
              background: accent,
              transformOrigin: "center",
            }}
          />
        )}
      </AnimatePresence>
    </motion.li>
  )
}

/* ─── StepList ───────────────────────────────────────────── */
export default function StepList({ todo }: StepListProps) {
  const currentStepId = useStore((s) => s.audio.currentStepId)
  const voiceState = useStore((s) => s.session.voiceState)
  const completeStep = useStore((s) => s.completeStep)
  const { sendContextualUpdate, status } = useVoiceSession()

  const cfg = TONE_CONFIGS[todo.toneProfile]
  const accent = `var(${cfg.accentVar})`
  const trackMap: Record<string, string> = {
    "--cf-amber": "var(--cf-amber-track)",
    "--cf-violet": "var(--cf-violet-track)",
    "--cf-coral": "var(--cf-coral-track)",
  }
  const track = trackMap[cfg.accentVar] ?? "var(--cf-card-border)"

  const sessionActive = status === "connected"

  const handleStepTap = (stepId: string) => {
    completeStep(todo.id, stepId)
    // 8.4: if a session is active, notify the agent
    if (sessionActive) {
      const step = todo.steps.find((s) => s.id === stepId)
      if (step) {
        sendContextualUpdate(
          `User manually marked step "${step.text}" as complete via UI tap.`
        )
      }
    }
  }

  return (
    <ul className="relative flex flex-col gap-4 pl-0" role="list" aria-label={`Steps for ${todo.goal}`}>
      {todo.steps.map((step, i) => (
        <StepRow
          key={step.id}
          step={step}
          index={i}
          accent={accent}
          track={track}
          isAudioActive={
            voiceState === "speaking" && currentStepId === step.id
          }
          onTap={handleStepTap}
        />
      ))}
    </ul>
  )
}
