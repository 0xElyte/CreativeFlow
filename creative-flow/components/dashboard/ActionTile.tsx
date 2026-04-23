"use client"

import { motion } from "framer-motion"
import type { TodoStep } from "@/lib/types"

/* ─── Deterministic accent per tile ─────────────────────── */
// A palette of vivid border colors — picked by step index so they're
// consistent across renders but visually varied across tiles.
const TILE_ACCENTS = [
  "oklch(73% 0.17 55)",   // amber
  "oklch(54% 0.19 295)",  // violet
  "oklch(65% 0.22 30)",   // coral
  "oklch(62% 0.18 175)",  // teal
  "oklch(68% 0.2  230)",  // sky
  "oklch(60% 0.21 340)",  // rose
  "oklch(70% 0.16 140)",  // sage
  "oklch(58% 0.2  260)",  // indigo
]

function accentForIndex(i: number): string {
  return TILE_ACCENTS[i % TILE_ACCENTS.length]
}

interface ActionTileProps {
  step: TodoStep
  index: number
}

export default function ActionTile({ step, index }: ActionTileProps) {
  const accent = accentForIndex(index)
  const isDone = step.status === "completed"
  const isClarification = step.status === "clarification_needed"

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex gap-4 rounded-2xl p-5"
      style={{
        background: "var(--cf-card)",
        border: `1.5px solid ${accent}`,
        opacity: isDone ? 0.6 : 1,
      }}
    >
      {/* Number / checkmark */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
        style={{
          background: isDone ? accent : "transparent",
          border: `2px solid ${accent}`,
          color: isDone ? "oklch(100% 0 0)" : accent,
          transition: "background 0.3s, color 0.3s",
        }}
        aria-label={isDone ? "Completed" : `Step ${index + 1}`}
      >
        {isDone ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M2.5 7.5L5.5 10.5L11.5 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span>{index + 1}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        {/* Step text */}
        <p
          className="text-sm font-medium leading-snug"
          style={{
            color: "var(--cf-text-1)",
            textDecoration: isDone ? "line-through" : "none",
          }}
        >
          {step.text}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Domain tag */}
          {step.domainTag && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: `color-mix(in oklch, ${accent} 15%, transparent)`,
                color: accent,
              }}
            >
              {step.domainTag}
            </span>
          )}

          {/* Time estimate */}
          <span
            className="text-xs"
            style={{ color: "var(--cf-text-3)" }}
          >
            ~{step.estimatedMinutes} min
          </span>

          {/* Clarification badge */}
          {isClarification && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "oklch(93% 0.04 55)",
                color: "oklch(50% 0.15 55)",
              }}
            >
              Needs clarification
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
