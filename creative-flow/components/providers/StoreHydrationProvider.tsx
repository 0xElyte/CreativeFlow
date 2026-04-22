"use client"

import { useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { useStore } from "@/lib/store"
import { hydrateFromDB, persistToDB } from "@/lib/db"

/**
 * Handles app-wide initialisation:
 *  1. IndexedDB hydration — per-user DB, loaded once userId is known
 *  2. Reduced-motion detection — sync prefers-reduced-motion to store
 *  3. beforeunload persistence — flush tasks to the user's IndexedDB on tab close
 *  4. Clears the task store when the user signs out
 */
export default function StoreHydrationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoaded } = useUser()
  const setReducedMotion = useStore((s) => s.setReducedMotion)
  const hydrateTasks = useStore((s) => s.hydrateTasks)
  const tasks = useStore((s) => s.tasks)
  const setToneProfile = useStore((s) => s.setToneProfile)

  // Track userId in a ref so the beforeunload handler always has the latest value
  const userIdRef = useRef<string | null>(null)
  userIdRef.current = user?.id ?? null

  // Hydrate per-user IndexedDB + tone profile once auth is ready
  useEffect(() => {
    if (!isLoaded) return

    if (!user?.id) {
      // User signed out — clear tasks from the store
      hydrateTasks([])
      return
    }

    const userId = user.id

    // Restore persisted tone profile
    const savedTone = localStorage.getItem("cf_tone_profile")
    if (
      savedTone === "calm_mentor" ||
      savedTone === "hype_coach" ||
      savedTone === "gentle_guide"
    ) {
      setToneProfile(savedTone)
    }

    // Load this user's tasks from their own IndexedDB
    hydrateFromDB(userId).then(hydrateTasks)

    // Reduced motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [isLoaded, user?.id, hydrateTasks, setReducedMotion, setToneProfile])

  // Persist tasks to the current user's DB on tab close
  useEffect(() => {
    const handleUnload = () => {
      if (userIdRef.current) {
        persistToDB(tasks, userIdRef.current)
      }
    }
    window.addEventListener("beforeunload", handleUnload)
    return () => window.removeEventListener("beforeunload", handleUnload)
  }, [tasks])

  return <>{children}</>
}
