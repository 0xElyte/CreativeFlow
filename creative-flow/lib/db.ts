import { openDB, type IDBPDatabase } from "idb"
import type { TodoItem } from "./types"

const DB_VERSION = 1
const TASKS_STORE = "tasks"
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1_000

interface CreativeFlowSchema {
  tasks: {
    key: string
    value: TodoItem
  }
}

/** One cached DB connection per userId — avoids re-opening on every call. */
const dbCache = new Map<string, Promise<IDBPDatabase<CreativeFlowSchema>>>()

function getDB(userId: string) {
  if (!dbCache.has(userId)) {
    dbCache.set(
      userId,
      openDB<CreativeFlowSchema>(`creative-flow-${userId}`, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(TASKS_STORE)) {
            db.createObjectStore(TASKS_STORE, { keyPath: "id" })
          }
        },
      })
    )
  }
  return dbCache.get(userId)!
}

/**
 * Reads all tasks from the user's IndexedDB, purges entries older than 30 days,
 * and returns the fresh set. Safe to call on mount — errors are swallowed.
 */
export async function hydrateFromDB(userId: string): Promise<TodoItem[]> {
  try {
    const db = await getDB(userId)
    const all = await db.getAll(TASKS_STORE)
    const cutoff = Date.now() - THIRTY_DAYS
    const fresh = all.filter((t) => t.updatedAt > cutoff)
    const stale = all.filter((t) => t.updatedAt <= cutoff)
    if (stale.length > 0) {
      const tx = db.transaction(TASKS_STORE, "readwrite")
      await Promise.all(stale.map((t) => tx.store.delete(t.id)))
      await tx.done
    }
    return fresh
  } catch {
    return []
  }
}

/**
 * Writes the full task list to the user's IndexedDB via a single transaction.
 * Uses requestIdleCallback when available to avoid blocking the main thread.
 */
export function persistToDB(tasks: TodoItem[], userId: string): void {
  const write = async () => {
    try {
      const db = await getDB(userId)
      const tx = db.transaction(TASKS_STORE, "readwrite")
      await Promise.all(tasks.map((t) => tx.store.put(t)))
      await tx.done
    } catch {
      // Best-effort — IndexedDB may be unavailable in private browsing
    }
  }

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(() => { void write() })
  } else {
    void write()
  }
}
