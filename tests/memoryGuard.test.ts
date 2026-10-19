// node --experimental-strip-types --test tests/memoryGuard.test.ts   (Node 22+)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cacheGet, cacheSet, overLimit, type Entry, type Window } from '../server/utils/memoryGuard.ts'

test('the limiter allows the limit, refuses the next call, and starts a new window afterwards', () => {
  const s = new Map<string, Window>()
  for (let i = 0; i < 3; i++) assert.equal(overLimit(s, 'a', 1000, 3, 60_000), false, `call ${i + 1}`)
  assert.equal(overLimit(s, 'a', 2000, 3, 60_000), true)
  assert.equal(overLimit(s, 'b', 2000, 3, 60_000), false, 'another address has its own count')
  assert.equal(overLimit(s, 'a', 61_001, 3, 60_000), false, 'window over')
})

test('the limiter forgets expired windows instead of growing without bound', () => {
  const s = new Map<string, Window>()
  for (let i = 0; i < 5001; i++) overLimit(s, `k${i}`, 1, 5, 10)
  overLimit(s, 'new', 1000, 5, 10)
  assert.ok(s.size < 5000)
})

test('the cache serves a value until it expires and not after', () => {
  const s = new Map<string, Entry<string>>()
  assert.equal(cacheGet(s, 'x', 0), undefined)
  cacheSet(s, 'x', 'v', 0, 60_000)
  assert.equal(cacheGet(s, 'x', 59_999), 'v')
  assert.equal(cacheGet(s, 'x', 60_000), undefined)
})
