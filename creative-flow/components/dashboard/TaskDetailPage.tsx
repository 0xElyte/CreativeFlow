"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useStore } from "@/lib/store"
import { TONE_CONFIGS, DOMAIN_LABELS } from "@/lib/constants"
import ActionTile from "./ActionTile"

function completionPercent(done: number, total: number): number {
  if (total === 0) return 0
  return Math.round((done / total) * 100)
}

interface TaskDetailPageProps {
  taskId: string
}

export default function TaskDetailPage({ taskId }: TaskDetailPageProps) {
  const router = useRouter()
  const todo = useStore((s) => s.tasks.find((t) => t.id === taskId))

  if (!todo) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4"
        style={{ color: "var(--cf-text-3)" }}
      >
        <p className="text-sm">Task not found.</p>
        <button
          onClick={() => router.back()}
          className="text-sm underline"
          style={{ color: "var(--cf-text-2)" }}
        >
          Go back
        </button>
      </div>
    )
  }

  const accent = `var(${TONE_CONFIGS[todo.toneProfile].accentVar})`
  const domainLabel = DOMAIN_LABELS[todo.domain] ?? todo.domain
  const doneCount = todo.steps.filter((s) => s.status === "completed").length
  const pct = completionPercent(doneCount, todo.steps.length)
  const isDraft = todo.status === "draft"

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ background: "var(--cf-surface)" }}
    >
      <div className="flex-1 min-w-0 overflow-y-auto px-8 py-10 max-w-2xl mx-auto w-full">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm mb-8 group"
          style={{ color: "var(--cf-text-3)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden
            className="group-hover:-translate-x-0.5 transition-transform"
          >
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        {/* Draft banner */}
        {isDraft && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 mb-6 text-sm"
            style={{
              background: "oklch(97% 0.01 278)",
              border: "1.5px dashed var(--cf-card-border)",
              color: "var(--cf-text-3)",
            }}
          >
            <span>⏳</span>
            <span>Awaiting your confirmation in the voice session before this task is active.</span>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          {/* Domain tag */}
          <span
            className="inline-block text-xs font-semibold uppercase tracking-widest mb-3 px-2.5 py-1 rounded-full"
            style={{
              background: `color-mix(in oklch, ${accent} 12%, transparent)`,
              color: accent,
              letterSpacing: "0.1em",
            }}
          >
            {domainLabel}
          </span>

          {/* Title */}
          <h1
            className="font-bold leading-tight mb-5"
            style={{
              fontFamily: "var(--font-manrope), var(--font-geist-sans), sans-serif",
              fontSize: "clamp(22px, 3.5vw, 32px)",
              color: "var(--cf-text-1)",
            }}
          >
            {todo.goal}
          </h1>

          {/* Progress bar + count */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--cf-text-3)" }}>
              <span>{doneCount} of {todo.steps.length} steps completed</span>
              <span className="font-semibold tabular-nums" style={{ color: "var(--cf-text-2)" }}>{pct}%</span>
            </div>
            <div
              className="h-1.5 w-full rounded-full overflow-hidden"
              style={{ background: `color-mix(in oklch, ${accent} 15%, transparent)` }}
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
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </div>
        </div>

        {/* Action tiles */}
        <div className="flex flex-col gap-3">
          {todo.steps.map((step, i) => (
            <ActionTile key={step.id} step={step} index={i} />
          ))}
        </div>

      </div>
    </div>
  )
}
