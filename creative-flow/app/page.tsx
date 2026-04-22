import RecentFlows from "@/components/dashboard/RecentFlows"
import VoicePanel from "@/components/voice/VoicePanel"
import { MOCK_FLOWS } from "@/lib/mock-data"

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export default function DashboardPage() {
  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ background: "var(--cf-surface)" }}
    >
      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 overflow-y-auto px-10 py-10">
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
            {greeting()}, Alex.
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

        {/* Recent flows */}
        <RecentFlows flows={MOCK_FLOWS} />
      </div>

      {/* ── Voice panel ── */}
      <div
        className="flex items-start justify-center py-10 px-6 flex-shrink-0"
        style={{ width: 348 }}
      >
        <VoicePanel />
      </div>
    </div>
  )
}

