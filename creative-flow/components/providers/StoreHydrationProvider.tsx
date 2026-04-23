"use client"

import { useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { useStore } from "@/lib/store"
import type { TodoItem } from "@/lib/types"

/**
 * Handles app-wide initialisation:
 *  1. Server (Redis) hydration — per-user tasks loaded once userId is known
 *  2. Reduced-motion detection — sync prefers-reduced-motion to store
 *  3. Server sync — upserts changed/new non-draft tasks and deletes removed tasks
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

  // True once server hydration has completed — prevents syncing before the
  // initial load overwrites what we just fetched.
  const hydratedRef = useRef(false)
  // Snapshot of the last-synced task list for diffing
  const prevTasksRef = useRef<TodoItem[]>([])

  // Hydrate from Redis + restore tone profile once auth is ready
  useEffect(() => {
    if (!isLoaded) return

    if (!user?.id) {
      hydratedRef.current = false
      hydrateTasks([])
      return
    }

    // Restore persisted tone profile
    const savedTone = localStorage.getItem("cf_tone_profile")
    if (
      savedTone === "calm_mentor" ||
      savedTone === "hype_coach" ||
      savedTone === "gentle_guide"
    ) {
      setToneProfile(savedTone)
    }

    // Fetch tasks from the server and hydrate the store.
    // Keep any in-memory drafts (created this session) alongside server tasks.
    fetch("/api/tasks")
      .then((r) => r.json())
      .then(({ tasks: serverTasks }: { tasks: TodoItem[] }) => {
        const drafts = useStore.getState().tasks.filter((t) => t.status === "draft")
        hydrateTasks([...serverTasks, ...drafts])
        prevTasksRef.current = serverTasks
        hydratedRef.current = true
      })
      .catch(() => {
        hydratedRef.current = true // allow sync to proceed even if initial load fails
      })

    // Reduced motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [isLoaded, user?.id, hydrateTasks, setReducedMotion, setToneProfile])

  // Sync non-draft task changes to the server whenever the task list updates
  useEffect(() => {
    if (!hydratedRef.current || !user?.id) return

    const prev = prevTasksRef.current
    const current = tasks

    // Tasks that were added or updated (non-draft only)
    const toUpsert = current.filter((task) => {
      if (task.status === "draft") return false
      const old = prev.find((t) => t.id === task.id)
      return !old || old.updatedAt !== task.updatedAt || old.status !== task.status
    })

    // Tasks that were removed from the store
    const toDelete = prev.filter((p) => !current.find((c) => c.id === p.id))

    // Update snapshot before firing requests
    prevTasksRef.current = current.filter((t) => t.status !== "draft")

    for (const task of toUpsert) {
      void fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      })
    }

    for (const task of toDelete) {
      void fetch(`/api/tasks/${task.id}`, { method: "DELETE" })
    }
  }, [tasks, user?.id])

  return <>{children}</>
}
