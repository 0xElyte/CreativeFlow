"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/lib/store"
import { TONE_CONFIGS, DOMAIN_LABELS } from "@/lib/constants"
import ActionTile from "./ActionTile"
import VoicePanel from "@/components/voice/VoicePanel"

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
  const deleteTask = useStore((s) => s.deleteTask)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    deleteTask(taskId)
    // Best-effort server delete — StoreHydrationProvider will also sync,
    // but fire explicitly here for immediate consistency
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" }).catch(() => {})
    router.replace("/")
  }

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
      className="flex flex-col md:flex-row md:h-full md:overflow-hidden pb-16 md:pb-0"
      style={{ background: "var(--cf-surface)" }}
    >
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 px-4 py-6 md:overflow-y-auto md:px-8 md:py-10">
        <div className="max-w-2xl mx-auto w-full">

        {/* Back + Delete row */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm group"
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

          <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-1.5 text-sm rounded-lg px-3 py-1.5 transition-colors"
            style={{
              color: "oklch(55% 0.2 25)",
              background: "oklch(97% 0.01 25)",
              border: "1px solid oklch(88% 0.05 25)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M3.5 3.5l.667 7.5a.5.5 0 0 0 .5.5h4.667a.5.5 0 0 0 .5-.5L10.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete task
          </button>
        </div>

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

        </div>{/* end max-w-2xl */}
      </div>

      {/* ── Voice panel (edit/update mode) ── */}
      <div className="flex items-start justify-center py-6 px-4 md:py-10 md:px-6 md:flex-shrink-0 w-full md:w-[348px]">
        <VoicePanel context="progress_update" activeTodoId={taskId} />
      </div>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "oklch(0% 0 0 / 0.5)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5 rounded-2xl p-7 max-w-sm w-full"
              style={{
                background: "var(--cf-card)",
                border: "1.5px solid var(--cf-card-border)",
                boxShadow: "0 8px 40px oklch(0% 0 0 / 0.25)",
              }}
            >
              <div className="flex flex-col gap-1.5">
                <h2 className="text-base font-semibold" style={{ color: "var(--cf-text-1)" }}>
                  Delete this task?
                </h2>
                <p className="text-sm" style={{ color: "var(--cf-text-3)" }}>
                  &ldquo;{todo.goal}&rdquo; will be permanently removed and cannot be recovered.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-opacity"
                  style={{
                    background: "oklch(55% 0.2 25)",
                    color: "#fff",
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="rounded-xl px-4 py-2.5 text-sm"
                  style={{
                    background: "var(--cf-surface)",
                    color: "var(--cf-text-3)",
                    border: "1px solid var(--cf-card-border)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
