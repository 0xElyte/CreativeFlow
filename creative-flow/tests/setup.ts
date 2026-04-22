/**
 * Global test setup — runs before every test file.
 */

// Polyfill crypto.randomUUID for environments that don't provide it
if (typeof crypto === "undefined" || !crypto.randomUUID) {
  let counter = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).crypto = {
    ...globalThis.crypto,
    randomUUID: () =>
      `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`,
  }
}
