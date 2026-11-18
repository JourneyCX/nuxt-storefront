// node --experimental-strip-types --test tests/cookieSecure.test.ts   (Node 22+)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isHttpsRequest, setRawCookie, deleteRawCookie } from '../server/utils/http-compat.ts'

function fakeEvent(headers: Record<string, string | string[]> = {}, encrypted = false) {
  const out: Record<string, unknown> = {}
  const res = {
    getHeader: (k: string) => out[k],
    setHeader: (k: string, v: unknown) => { out[k] = v },
  }
  const event = { node: { req: { headers, socket: { encrypted } }, res } } as never
  return { event, setCookies: () => (out['Set-Cookie'] as string[]) ?? [] }
}

test('behind the proxy (X-Forwarded-Proto: https) a cookie is marked Secure', () => {
  const { event, setCookies } = fakeEvent({ 'x-forwarded-proto': 'https' })
  setRawCookie(event, 'stratum-account-69', 'v', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 })
  assert.equal(setCookies()[0], 'stratum-account-69=v; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=60')
})

test('plain http (local development, internal localhost calls) is left as it was', () => {
  const { event, setCookies } = fakeEvent({})
  setRawCookie(event, 'a', 'v', { httpOnly: true, sameSite: 'lax', path: '/' })
  assert.ok(!setCookies()[0].includes('Secure'))
  const h = fakeEvent({ 'x-forwarded-proto': 'http' })
  setRawCookie(h.event, 'a', 'v', { path: '/' })
  assert.ok(!h.setCookies()[0].includes('Secure'))
})

test('a deleted (cleared) cookie is Secure too, so the browser matches and removes it', () => {
  const { event, setCookies } = fakeEvent({ 'x-forwarded-proto': 'https' })
  deleteRawCookie(event, 'stratum-account-69', { path: '/' })
  assert.equal(setCookies()[0], 'stratum-account-69=; Path=/; Secure; Max-Age=0')
})

test('an explicit secure option wins in both directions', () => {
  const a = fakeEvent({ 'x-forwarded-proto': 'https' })
  setRawCookie(a.event, 'a', 'v', { secure: false })
  assert.ok(!a.setCookies()[0].includes('Secure'))
  const b = fakeEvent({})
  setRawCookie(b.event, 'a', 'v', { secure: true })
  assert.ok(b.setCookies()[0].includes('Secure'))
})

test('isHttpsRequest reads the first value of a proxy chain, an array header and a TLS socket', () => {
  assert.equal(isHttpsRequest({ 'x-forwarded-proto': 'https, http' }), true)
  assert.equal(isHttpsRequest({ 'x-forwarded-proto': 'http, https' }), false)
  assert.equal(isHttpsRequest({ 'x-forwarded-proto': ['HTTPS'] }), true)
  assert.equal(isHttpsRequest({}, true), true)
  assert.equal(isHttpsRequest({}), false)
  assert.equal(isHttpsRequest({ 'x-forwarded-proto': '' }), false)
})

test('several cookies in one response each get the flag and none is lost', () => {
  const { event, setCookies } = fakeEvent({ 'x-forwarded-proto': 'https' })
  setRawCookie(event, 'one', '1', { path: '/' })
  setRawCookie(event, 'two', '2', { path: '/' })
  assert.equal(setCookies().length, 2)
  assert.ok(setCookies().every((c) => c.includes('; Secure')))
})
