"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/lib/store"
import { MOCK_FLOWS } from "@/lib/mock-data"
import { TONE_CONFIGS, DOMAIN_LABELS } from "@/lib/constants"
import TodoCard from "@/components/dashboard/TodoCard"
import StepList from "@/components/dashboard/StepList"
import VoicePanel from "@/components/voice/VoicePanel"
import type { TodoItem } from "@/lib/types"

/* ─── Section header ─────────────────────────────────────── */
function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2
        className="text-base font-semibold"
        style={{ color: "var(--cf-text-1)" }}
      >
        {title}
      </h2>
      <span
        className="text-xs font-medium rounded-full px-2.5 py-0.5"
        style={{
          background: "var(--cf-card)",
          border: "1px solid var(--cf-card-border)",
          color: "var(--cf-text-3)",
        }}
      >
        {count}
      </span>
    </div>
  )
}

/* ─── Flow detail panel ──────────────────────────────────── */
function FlowDetail({
  todo,
  onClose,
}: {
  todo: TodoItem
  onClose: () => void
}) {
  const cfg = TONE_CONFIGS[todo.toneProfile]
  const domainLabel = DOMAIN_LABELS[todo.domain] ?? todo.domain

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col gap-6 rounded-2xl p-7"
      style={{
        background: "var(--cf-card)",
        border: "1.5px solid var(--cf-card-border)",
        boxShadow: "0 4px 24px oklch(0% 0 0 / 0.05)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: `var(${cfg.accentVar})`, letterSpacing: "0.09em" }}
            >
              {domainLabel}
            </span>
            <span style={{ color: "var(--cf-card-border)" }}>·</span>
            <span className="text-xs" style={{ color: "var(--cf-text-3)" }}>
              {cfg.label}
            </span>
          </div>
          <h2
            className="text-xl font-bold leading-tight"
            style={{ color: "var(--cf-text-1)" }}
          >
            {todo.goal}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm focus-visible:outline-none focus-visible:ring-2 transition-colors duration-150"
          style={{
            background: "var(--cf-surface)",
            color: "var(--cf-text-3)",
            border: "1px solid var(--cf-card-border)",
          }}
          aria-label="Close detail panel"
        >
          ✕
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--cf-card-border)" }} />

      {/* Step list */}
      <StepList todo={todo} />
    </motion.div>
  )
}

/* ─── Projects page ──────────────────────────────────────── */
export default function ProjectsPage() {
  const storeTasks = useStore((s) => s.tasks)
  const flows = storeTasks.length > 0 ? storeTasks : MOCK_FLOWS

  const active = flows.filter((f) => f.status === "active")
  const completed = flows.filter((f) => f.status === "completed")

  const [selected, setSelected] = useState<TodoItem | null>(null)

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
  }
  const cardVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--cf-surface)" }}>
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 overflow-y-auto px-10 py-10">
        <header className="mb-10">
          <h1
            className="font-bold leading-tight tracking-tight mb-2"
            style={{
              fontFamily: "var(--font-manrope), var(--font-geist-sans), sans-serif",
              fontSize: "clamp(24px, 3vw, 36px)",
              color: "var(--cf-text-1)",
            }}
          >
            Your Projects
          </h1>
          <p className="text-sm" style={{ color: "var(--cf-text-3)", maxWidth: "44ch" }}>
            Track every creative goal — from first spark to final step.
          </p>
        </header>

        {/* Active flows */}
        {active.length > 0 && (
          <section className="mb-12">
            <SectionHeader title="Active Flows" count={active.length} />
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="list-none p-0 m-0 grid gap-5"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
            >
              {active.map((flow) => (
                <motion.li key={flow.id} variants={cardVariants} className="list-none">
                  <TodoCard
                    todo={flow}
                    onClick={(id) => {
                      const t = flows.find((f) => f.id === id) ?? null
                      setSelected((prev) => (prev?.id === id ? null : t))
                    }}
                  />
                </motion.li>
              ))}
            </motion.ul>
          </section>
        )}

        {/* Selected flow detail */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.section key={selected.id} className="mb-12">
              <FlowDetail todo={selected} onClose={() => setSelected(null)} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Completed flows */}
        {completed.length > 0 && (
          <section>
            <SectionHeader title="Completed Flows" count={completed.length} />
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="list-none p-0 m-0 grid gap-5"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                opacity: 0.75,
              }}
            >
              {completed.map((flow) => (
                <motion.li key={flow.id} variants={cardVariants} className="list-none">
                  <TodoCard todo={flow} />
                </motion.li>
              ))}
            </motion.ul>
          </section>
        )}

        {/* Empty state */}
        {flows.length === 0 && (
          <div
            className="flex flex-col items-center justify-center gap-4 py-24"
            style={{ color: "var(--cf-text-3)" }}
          >
            <span className="text-4xl" aria-hidden>🎯</span>
            <p className="text-sm text-center max-w-[32ch]">
              No projects yet. Hold the orb on the dashboard and speak your first goal.
            </p>
          </div>
        )}
      </div>

      {/* ── Voice panel — progress_update context (8.3) ── */}
      <div
        className="flex items-start justify-center py-10 px-6 flex-shrink-0"
        style={{ width: 348 }}
      >
        <VoicePanel
          context="progress_update"
          activeTodoId={selected?.id}
        />
      </div>
    </div>
  )
}
