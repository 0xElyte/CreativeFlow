"use client"

import { motion } from "framer-motion"
import TodoCard from "./TodoCard"
import type { TodoItem } from "@/lib/types"

interface RecentFlowsProps {
  flows: TodoItem[]
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

export default function RecentFlows({ flows }: RecentFlowsProps) {
  const draft = flows.filter((f) => f.status === "draft")
  const active = flows.filter((f) => f.status === "active")
  const visible = [...draft, ...active]

  return (
    <section aria-labelledby="recent-flows-heading">
      <h2
        id="recent-flows-heading"
        className="text-base font-semibold mb-5"
        style={{ color: "var(--cf-text-1)" }}
      >
        Recent Flows
      </h2>

      {visible.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl py-16 px-8 text-center"
          style={{
            background: "var(--cf-card)",
            border: "1.5px dashed var(--cf-card-border)",
          }}
        >
          <span className="text-3xl" aria-hidden>
            🎙
          </span>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--cf-text-2)" }}
          >
            No active flows yet
          </p>
          <p
            className="text-xs max-w-[220px]"
            style={{ color: "var(--cf-text-3)" }}
          >
            Hold the mic button and speak a goal to get started.
          </p>
        </div>
      ) : (
        <motion.ul
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          role="list"
        >
          {visible.map((flow) => (
            <li key={flow.id} role="listitem">
              <TodoCard todo={flow} />
            </li>
          ))}
        </motion.ul>
      )}
    </section>
  )
}
