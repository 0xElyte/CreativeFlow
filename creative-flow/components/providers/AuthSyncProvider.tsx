"use client"

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useStore } from "@/lib/store"

/**
 * Syncs the Clerk user ID into the Zustand store so all
 * components and API calls have access to the real user identity.
 */
export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()
  const setUserId = useStore((s) => s.setUserId)

  useEffect(() => {
    if (!isLoaded) return
    setUserId(user?.id ?? "")
  }, [isLoaded, user?.id, setUserId])

  return <>{children}</>
}
