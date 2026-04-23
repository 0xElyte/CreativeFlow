"use client"

import { useUser } from "@clerk/nextjs"
import RecentFlows from "./RecentFlows"
import VoicePanel from "@/components/voice/VoicePanel"
import { useStore } from "@/lib/store"

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export default function DashboardPage() {
  const flows = useStore((s) => s.tasks)
  const { user } = useUser()

  return (
    <div
      className="flex flex-col md:flex-row md:h-full md:overflow-hidden pb-16 md:pb-0"
      style={{ background: "var(--cf-surface)" }}
    >
      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 px-4 py-6 md:overflow-y-auto md:px-10 md:py-10">
        {/* Greeting */}
        <header className="mb-10">
          <h1
            className="font-bold leading-tight tracking-tight mb-2"
            style={{
              fontFamily: "var(--font-manrope), var(--font-geist-sans), sans-serif",
              fontSize: "clamp(28px, 4vw, 42px)",
              color: "var(--cf-text-1)",
            }}
          >
            {greeting()}, {user?.firstName ?? "there"}.
            <br />
            Ready to create?
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--cf-text-3)", maxWidth: "42ch" }}
          >
            Here&apos;s your workspace. Speak a goal or pick up where you left off.
          </p>
        </header>

        <RecentFlows flows={flows} />
      </div>

      {/* ── Voice panel ── */}
      <div className="flex items-start justify-center py-6 px-4 md:py-10 md:px-6 md:flex-shrink-0 w-full md:w-[348px]">
        <VoicePanel />
      </div>
    </div>
  )
}
