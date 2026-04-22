"use client"

import { useState, useDeferredValue } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/lib/store"
import { TONE_CONFIGS, DOMAIN_LABELS } from "@/lib/constants"
import type { TodoItem } from "@/lib/types"

/* ─── Helpers ────────────────────────────────────────────── */
function matchesQuery(task: TodoItem, q: string): boolean {
  const needle = q.toLowerCase()
  if (task.goal.toLowerCase().includes(needle)) return true
  if (task.domain.toLowerCase().includes(needle)) return true
  if ((DOMAIN_LABELS[task.domain] ?? "").toLowerCase().includes(needle)) return true
  return task.steps.some((s) => s.text.toLowerCase().includes(needle))
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: "var(--cf-amber-track)",
          color: "var(--cf-amber)",
          borderRadius: 3,
          padding: "0 2px",
        }}
      >
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

/* ─── Result card ────────────────────────────────────────── */
function ResultCard({ task, query }: { task: TodoItem; query: string }) {
  const cfg = TONE_CONFIGS[task.toneProfile]
  const domainLabel = DOMAIN_LABELS[task.domain] ?? task.domain
  const completedSteps = task.steps.filter((s) => s.status === "completed").length
  const matchingSteps = query
    ? task.steps.filter((s) => s.text.toLowerCase().includes(query.toLowerCase()))
    : []

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: "var(--cf-card)",
        border: "1.5px solid var(--cf-card-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: `var(${cfg.accentVar})` }}
            >
              {domainLabel}
            </span>
            <span style={{ color: "var(--cf-card-border)" }}>·</span>
            <span className="text-xs" style={{ color: "var(--cf-text-3)" }}>
              {task.status === "completed" ? "Completed" : "Active"}
            </span>
          </div>
          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--cf-text-1)" }}>
            {highlight(task.goal, query)}
          </p>
        </div>
        <span
          className="text-xs font-medium rounded-full px-2.5 py-0.5 flex-shrink-0"
          style={{
            background: "var(--cf-surface)",
            border: "1px solid var(--cf-card-border)",
            color: "var(--cf-text-3)",
          }}
        >
          {completedSteps}/{task.steps.length}
        </span>
      </div>

      {/* Matching steps */}
      {matchingSteps.length > 0 && (
        <ul className="flex flex-col gap-1.5 pl-3 border-l-2" style={{ borderColor: `var(${cfg.accentVar})` }}>
          {matchingSteps.map((s) => (
            <li key={s.id} className="text-xs" style={{ color: "var(--cf-text-2)" }}>
              {highlight(s.text, query)}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}

/* ─── Search page ────────────────────────────────────────── */
export default function SearchPage() {
  const tasks = useStore((s) => s.tasks)
  const [query, setQuery] = useState("")
  const deferred = useDeferredValue(query)

  const results = deferred.trim()
    ? tasks.filter((t) => matchesQuery(t, deferred.trim()))
    : []

  return (
    <div
      className="h-full overflow-y-auto px-10 py-10"
      style={{ background: "var(--cf-surface)" }}
    >
      <header className="mb-8">
        <h1
          className="font-bold leading-tight tracking-tight mb-2"
          style={{
            fontFamily: "var(--font-manrope), var(--font-geist-sans), sans-serif",
            fontSize: "clamp(24px, 3vw, 36px)",
            color: "var(--cf-text-1)",
          }}
        >
          Search
        </h1>
        <p className="text-sm" style={{ color: "var(--cf-text-3)", maxWidth: "44ch" }}>
          Find any goal, domain, or step across all your flows.
        </p>
      </header>

      {/* Search input */}
      <div className="relative mb-8" style={{ maxWidth: 560 }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--cf-text-3)" }}
        >
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search goals, domains, steps…"
          autoFocus
          className="w-full rounded-2xl text-sm pl-10 pr-4 py-3 outline-none transition-colors duration-150"
          style={{
            background: "var(--cf-card)",
            border: "1.5px solid var(--cf-card-border)",
            color: "var(--cf-text-1)",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--cf-amber)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--cf-card-border)")
          }
        />
      </div>

      {/* Results */}
      <AnimatePresence mode="popLayout">
        {tasks.length === 0 ? (
          <motion.div
            key="no-tasks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 py-20 text-center"
            style={{ color: "var(--cf-text-3)" }}
          >
            <span className="text-3xl" aria-hidden>🎙</span>
            <p className="text-sm max-w-[28ch]">
              No flows yet. Start a voice session to create your first goal.
            </p>
          </motion.div>
        ) : deferred.trim() === "" ? (
          <motion.div
            key="prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 py-20 text-center"
            style={{ color: "var(--cf-text-3)" }}
          >
            <span className="text-3xl" aria-hidden>🔍</span>
            <p className="text-sm max-w-[28ch]">
              Type above to search across {tasks.length} flow{tasks.length !== 1 ? "s" : ""}.
            </p>
          </motion.div>
        ) : results.length === 0 ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 py-20 text-center"
            style={{ color: "var(--cf-text-3)" }}
          >
            <span className="text-3xl" aria-hidden>😶</span>
            <p className="text-sm">No flows match &ldquo;{deferred}&rdquo;</p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            className="grid gap-4"
            style={{ maxWidth: 560 }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--cf-text-3)" }}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
            {results.map((task) => (
              <ResultCard key={task.id} task={task} query={deferred.trim()} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
