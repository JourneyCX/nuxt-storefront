// Two tiny in-process helpers for public routes (one node process per storefront, so memory is enough; a restart only resets them).
// Pure: the clock is passed in so they can be tested.

export interface Window { count: number; resetAt: number }

/** Fixed-window limiter. Returns true when this call is over the limit. Old windows are dropped when the map grows. */
export function overLimit(store: Map<string, Window>, key: string, now: number, limit: number, windowMs: number): boolean {
  if (store.size > 5000) {
    for (const [k, w] of store) if (w.resetAt <= now) store.delete(k)
    if (store.size > 5000) store.clear()
  }
  const w = store.get(key)
  if (!w || w.resetAt <= now) { store.set(key, { count: 1, resetAt: now + windowMs }); return false }
  w.count++
  return w.count > limit
}

export interface Entry<T> { value: T; expiresAt: number }

/** Remember a value for ttlMs; returns undefined when absent or expired. */
export function cacheGet<T>(store: Map<string, Entry<T>>, key: string, now: number): T | undefined {
  const e = store.get(key)
  if (!e) return undefined
  if (e.expiresAt <= now) { store.delete(key); return undefined }
  return e.value
}

export function cacheSet<T>(store: Map<string, Entry<T>>, key: string, value: T, now: number, ttlMs: number): void {
  if (store.size > 500) store.clear()
  store.set(key, { value, expiresAt: now + ttlMs })
}
