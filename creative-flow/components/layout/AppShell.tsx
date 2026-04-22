"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import StoreHydrationProvider from "@/components/providers/StoreHydrationProvider"
import ElevenLabsProvider from "@/components/providers/ElevenLabsProvider"
import { AuthSyncProvider } from "@/components/providers/AuthSyncProvider"

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

function LogOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M5 12H2.5A1.5 1.5 0 011 10.5v-7A1.5 1.5 0 012.5 2H5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M9.5 10L13 7l-3.5-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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

/* ─── Shell inner (uses hooks, must be inside providers) ─── */
function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()

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
          <Image
            src="/flow-logo.svg"
            alt="CreativeFlow logo"
            width={24}
            height={34}
            priority
          />
          <span
            className="text-sm font-semibold tracking-[0.12em] uppercase"
            style={{ color: "var(--cf-text-inv)", letterSpacing: "0.14em" }}
          >
            Creative<span className="font-light">Flow</span>
          </span>
        </Link>

        {/* Top-right: user name + logout */}
        <div className="flex items-center gap-3">
          {user?.firstName && (
            <span
              className="text-sm font-medium hidden sm:block"
              style={{ color: "var(--cf-text-inv-2)" }}
            >
              {user.firstName}
            </span>
          )}
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer"
            style={{
              color: "var(--cf-text-inv-2)",
              background: "transparent",
              border: "1px solid var(--cf-bg-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--cf-text-inv)"
              e.currentTarget.style.borderColor = "var(--cf-text-inv-2)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--cf-text-inv-2)"
              e.currentTarget.style.borderColor = "var(--cf-bg-border)"
            }}
          >
            <LogOutIcon />
            Log out
          </button>
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

/* ─── Public export: wraps providers around ShellInner ───── */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ElevenLabsProvider>
      <StoreHydrationProvider>
        <AuthSyncProvider>
          <ShellInner>{children}</ShellInner>
        </AuthSyncProvider>
      </StoreHydrationProvider>
    </ElevenLabsProvider>
  )
}
