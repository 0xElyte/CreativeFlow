import type { ReactNode } from "react"

/**
 * Auth routes (sign-in, sign-up) use this layout instead of the root
 * AppShell so they render as full-page, nav-free screens.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full" style={{ background: "var(--cf-bg)" }}>
      {children}
    </div>
  )
}
