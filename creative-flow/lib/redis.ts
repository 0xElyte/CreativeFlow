/**
 * Shared Redis client singleton.
 * Extracted into its own module so API routes don't duplicate
 * initialization logic and test files can mock this module cleanly.
 */
import Redis from "ioredis"

let _client: Redis | null = null

export function getRedisClient(): Redis {
  if (!_client) {
    _client = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    })
  }
  return _client
}

/** Call in tests (or on server shutdown) to discard the cached client. */
export function resetRedisClient(): void {
  _client = null
}
