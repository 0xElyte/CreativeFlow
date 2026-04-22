import { openDB, type IDBPDatabase } from "idb"
import type { TodoItem } from "./types"

const DB_NAME = "creative-flow"
const DB_VERSION = 1
const TASKS_STORE = "tasks"
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1_000

interface CreativeFlowSchema {
  tasks: {
    key: string
    value: TodoItem
  }
}

let dbPromise: Promise<IDBPDatabase<CreativeFlowSchema>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CreativeFlowSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(TASKS_STORE)) {
          db.createObjectStore(TASKS_STORE, { keyPath: "id" })
        }
      },
    })
  }
  return dbPromise
}

/**
 * Reads all tasks from IndexedDB, purges entries older than 30 days, and
 * returns the fresh set. Safe to call on mount — errors are swallowed so a
 * missing/blocked DB never crashes the app.
 */
export async function hydrateFromDB(): Promise<TodoItem[]> {
  try {
    const db = await getDB()
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
 * Writes the full task list to IndexedDB via a single transaction.
 * Uses requestIdleCallback when available to avoid blocking the main thread.
 */
export function persistToDB(tasks: TodoItem[]): void {
  const write = async () => {
    try {
      const db = await getDB()
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
