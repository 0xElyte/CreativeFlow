"use client"

import { useEffect } from "react"
import { useStore } from "@/lib/store"
import { hydrateFromDB, persistToDB } from "@/lib/db"

/**
 * Handles app-wide initialisation on mount:
 *  1. IndexedDB hydration — load tasks into store, purge >30-day entries
 *  2. Reduced-motion detection — sync prefers-reduced-motion to store
 *  3. beforeunload persistence — flush tasks to IndexedDB on tab close
 */
export default function StoreHydrationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const setReducedMotion = useStore((s) => s.setReducedMotion)
  const hydrateTasks = useStore((s) => s.hydrateTasks)
  const tasks = useStore((s) => s.tasks)
  const setToneProfile = useStore((s) => s.setToneProfile)

  // 1 + 2 + 3: run once on mount
  useEffect(() => {
    // 5.4: Restore persisted tone profile
    const savedTone = localStorage.getItem("cf_tone_profile")
    if (
      savedTone === "calm_mentor" ||
      savedTone === "hype_coach" ||
      savedTone === "gentle_guide"
    ) {
      setToneProfile(savedTone)
    }

    // IndexedDB hydration
    hydrateFromDB().then(hydrateTasks)

    // Reduced motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [hydrateTasks, setReducedMotion, setToneProfile])

  // 4: persist tasks on tab close
  useEffect(() => {
    const handleUnload = () => persistToDB(tasks)
    window.addEventListener("beforeunload", handleUnload)
    return () => window.removeEventListener("beforeunload", handleUnload)
  }, [tasks])

  return <>{children}</>
}
