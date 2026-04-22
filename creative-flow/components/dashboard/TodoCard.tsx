"use client"

import { motion } from "framer-motion"
import type { TodoItem } from "@/lib/types"
import { TONE_CONFIGS, DOMAIN_LABELS } from "@/lib/constants"

interface TodoCardProps {
  todo: TodoItem
  onClick?: (id: string) => void
}

function completionPercent(todo: TodoItem): number {
  if (todo.steps.length === 0) return 0
  const done = todo.steps.filter((s) => s.status === "completed").length
  return Math.round((done / todo.steps.length) * 100)
}

function activeStepText(todo: TodoItem): string {
  const active = todo.steps.find((s) => s.status === "pending")
  return active?.text ?? todo.steps[todo.steps.length - 1]?.text ?? ""
}

function accentColorForTone(todo: TodoItem): string {
  return `var(${TONE_CONFIGS[todo.toneProfile].accentVar})`
}

function trackColorForTone(todo: TodoItem): string {
  const map: Record<string, string> = {
    "--cf-amber": "var(--cf-amber-track)",
    "--cf-violet": "var(--cf-violet-track)",
    "--cf-coral": "var(--cf-coral-track)",
  }
  return map[TONE_CONFIGS[todo.toneProfile].accentVar] ?? "var(--cf-card-border)"
}

export default function TodoCard({ todo, onClick }: TodoCardProps) {
  const pct = completionPercent(todo)
  const currentStep = activeStepText(todo)
  const accent = accentColorForTone(todo)
  const track = trackColorForTone(todo)
  const domainLabel = DOMAIN_LABELS[todo.domain] ?? todo.domain
  const isComplete = todo.status === "completed"

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={() => onClick?.(todo.id)}
      className="relative flex flex-col gap-5 rounded-2xl p-6 cursor-pointer select-none"
      style={{
        background: "var(--cf-card)",
        border: "1.5px solid var(--cf-card-border)",
        boxShadow: "0 2px 8px oklch(0% 0 0 / 0.04), 0 1px 2px oklch(0% 0 0 / 0.06)",
      }}
      whileHover={{
        y: -2,
        boxShadow:
          "0 8px 24px oklch(0% 0 0 / 0.08), 0 2px 6px oklch(0% 0 0 / 0.06)",
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.985 }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${todo.goal}`}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(todo.id)}
    >
      {/* Completed trophy badge */}
      {isComplete && (
        <span
          className="absolute top-4 right-4 text-base"
          aria-label="Completed"
          title="All steps done"
        >
          🏆
        </span>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h3
          className="text-lg font-semibold leading-snug"
          style={{ color: "var(--cf-text-1)" }}
        >
          {todo.goal}
        </h3>
        <p
          className="text-sm leading-snug line-clamp-1"
          style={{ color: "var(--cf-text-2)" }}
        >
          {currentStep}
        </p>
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: "var(--cf-text-3)", letterSpacing: "0.08em" }}
          >
            {domainLabel}
          </span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: "var(--cf-text-2)" }}
          >
            {pct}%
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="h-1.5 w-full rounded-full overflow-hidden"
          style={{ background: track }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: accent }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
          />
        </div>

        {/* Step count */}
        <p
          className="text-xs"
          style={{ color: "var(--cf-text-3)" }}
        >
          {todo.steps.filter((s) => s.status === "completed").length} of {todo.steps.length} steps
        </p>
      </div>
    </motion.article>
  )
}
