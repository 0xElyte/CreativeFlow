"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { useUser } from "@clerk/nextjs"
import ToneProfileSelector from "@/components/profile/ToneProfileSelector"
import { useStore } from "@/lib/store"

/* ─── Section wrapper ────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2
        className="text-base font-semibold"
        style={{ color: "var(--cf-text-1)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

/* ─── Notification row placeholder ──────────────────────── */
function NotifRow({ label, description }: { label: string; description: string }) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl px-4 py-3.5"
      style={{
        background: "var(--cf-card)",
        border: "1.5px solid var(--cf-card-border)",
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium" style={{ color: "var(--cf-text-1)" }}>
          {label}
        </span>
        <span className="text-xs" style={{ color: "var(--cf-text-3)" }}>
          {description}
        </span>
      </div>

      {/* Toggle placeholder */}
      <div
        className="w-10 h-5.5 rounded-full flex items-center px-0.5"
        style={{
          background: "var(--cf-card-border)",
          opacity: 0.6,
          cursor: "not-allowed",
          minWidth: 40,
          minHeight: 22,
        }}
        aria-disabled="true"
        title="Coming soon"
      >
        <div
          className="w-4 h-4 rounded-full"
          style={{ background: "var(--cf-text-3)" }}
        />
      </div>
    </div>
  )
}

/* ─── Profile page ───────────────────────────────────────── */
export default function ProfilePage() {
  const { user } = useUser()
  const userId = useStore((s) => s.session.userId)

  const displayName = user?.fullName ?? user?.firstName ?? "You"
  const initials = (user?.firstName?.[0] ?? "?") + (user?.lastName?.[0] ?? "")
  const email = user?.primaryEmailAddress?.emailAddress

  return (
    <div
      className="h-full overflow-y-auto px-10 py-10"
      style={{ background: "var(--cf-surface)" }}
    >
      {/* Header */}
      <header className="mb-10 flex items-center gap-5">
        {user?.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={displayName}
            width={64}
            height={64}
            className="rounded-2xl flex-shrink-0"
            style={{ border: "1.5px solid var(--cf-card-border)" }}
          />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{
              background: "var(--cf-card)",
              border: "1.5px solid var(--cf-card-border)",
              color: "var(--cf-text-1)",
            }}
            aria-hidden
          >
            {initials}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h1
            className="font-bold leading-tight"
            style={{
              fontFamily: "var(--font-manrope), var(--font-geist-sans), sans-serif",
              fontSize: "clamp(22px, 3vw, 32px)",
              color: "var(--cf-text-1)",
            }}
          >
            {displayName}
          </h1>
          {email && (
            <p className="text-xs" style={{ color: "var(--cf-text-3)" }}>
              {email}
            </p>
          )}
          {userId && (
            <p className="text-xs font-mono" style={{ color: "var(--cf-text-3)" }}>
              ID: {userId.slice(0, 8)}&hellip;
            </p>
          )}
        </div>
      </header>

      <motion.div
        className="flex flex-col gap-10 max-w-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Tone profile */}
        <Section title="Assistant Tone">
          <p className="text-sm -mt-2" style={{ color: "var(--cf-text-3)", maxWidth: "42ch" }}>
            Choose how your AI coach sounds and feels. This affects every voice session.
          </p>
          <ToneProfileSelector />
        </Section>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--cf-card-border)" }} />

        {/* Notifications (placeholder) */}
        <Section title="Notifications">
          <p className="text-sm -mt-2" style={{ color: "var(--cf-text-3)", maxWidth: "42ch" }}>
            Notification preferences — coming in a future update.
          </p>
          <div className="flex flex-col gap-3 opacity-60 pointer-events-none">
            <NotifRow
              label="Session reminders"
              description="Daily nudge to continue active flows"
            />
            <NotifRow
              label="Progress milestones"
              description="Celebrate when you complete a step"
            />
            <NotifRow
              label="Weekly summary"
              description="Digest of your creative output"
            />
          </div>
        </Section>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--cf-card-border)" }} />

        {/* App info */}
        <Section title="About">
          <div
            className="rounded-xl px-4 py-4 flex flex-col gap-2"
            style={{
              background: "var(--cf-card)",
              border: "1.5px solid var(--cf-card-border)",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--cf-text-1)" }}>
              CreativeFlow
            </p>
            <p className="text-xs" style={{ color: "var(--cf-text-3)" }}>
              Voice-first creative goal tracker powered by ElevenLabs AI.
            </p>
            <p className="text-xs" style={{ color: "var(--cf-text-3)" }}>
              Version 0.1.0 · MVP
            </p>
          </div>
        </Section>
      </motion.div>
    </div>
  )
}
