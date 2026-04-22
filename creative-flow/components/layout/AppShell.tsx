"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { TONE_CONFIGS } from "@/lib/constants"
import type { ToneProfile } from "@/lib/types"

/* ─── Inline SVG icons ───────────────────────────────────── */
function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconFolder() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M1.5 4.5C1.5 3.67 2.17 3 3 3h4l2 2h6c.83 0 1.5.67 1.5 1.5v8c0 .83-.67 1.5-1.5 1.5H3c-.83 0-1.5-.67-1.5-1.5V4.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2 15c0-3.31 3.13-6 7-6s7 2.69 7 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconFlow() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M3 11c0-3 2-5 5-5h6c2 0 3 1 3 3s-1 3-3 3H8c-2 0-3 1-3 3s1 3 3 3h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="17" r="2" fill="currentColor" />
    </svg>
  )
}

/* ─── Nav config ─────────────────────────────────────────── */
const NAV_ITEMS = [
  { href: "/",         label: "Dashboard", icon: IconGrid   },
  { href: "/projects", label: "Projects",  icon: IconFolder },
  { href: "/search",   label: "Search",    icon: IconSearch },
  { href: "/profile",  label: "Profile",   icon: IconUser   },
]

// Mock: active tone profile (will come from store in Task 2)
const ACTIVE_TONE: ToneProfile = "calm_mentor"

/* ─── Component ──────────────────────────────────────────── */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--cf-bg)" }}>
      {/* ── Top bar ── */}
      <header
        className="flex items-center justify-between px-6 py-0 flex-shrink-0"
        style={{
          height: 56,
          background: "var(--cf-bg)",
          borderBottom: "1px solid var(--cf-bg-border)",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 select-none"
          aria-label="CreativeFlow home"
        >
          <span style={{ color: "var(--cf-text-inv)" }}>
            <IconFlow />
          </span>
          <span
            className="text-sm font-semibold tracking-[0.12em] uppercase"
            style={{ color: "var(--cf-text-inv)", letterSpacing: "0.14em" }}
          >
            Creative<span className="font-light">Flow</span>
          </span>
        </Link>

        {/* Profile pill */}
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--cf-text-inv-2)" }}
          >
            {TONE_CONFIGS[ACTIVE_TONE].label}
          </span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{
              background: "var(--cf-bg-raised)",
              color: "var(--cf-text-inv)",
              border: "1.5px solid var(--cf-bg-border)",
            }}
            aria-label="User profile"
          >
            A
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav
          className="flex flex-col gap-1 flex-shrink-0 py-6 px-3"
          style={{
            width: 220,
            background: "var(--cf-bg)",
          }}
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150"
                style={{
                  color: isActive ? "var(--cf-text-inv)" : "var(--cf-text-inv-2)",
                  background: isActive ? "var(--cf-bg-raised)" : "transparent",
                }}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Main content area */}
        <main
          className="flex-1 min-w-0 overflow-hidden rounded-tl-2xl"
          style={{ background: "var(--cf-surface)" }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
