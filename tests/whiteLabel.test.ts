// node --experimental-strip-types --test tests/whiteLabel.test.ts   (Node 22+). The storefront source names no platform (parity D15/E14, source half).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// @ts-ignore: a plain .mjs tool
import { scanRepo, scanText, stripComments } from '../tools/white-label-scan.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('WL-07 the storefront source names no platform in anything a buyer can read (and the allow list has no dead entries)', () => {
  const { findings, staleAllow } = scanRepo(root)
  assert.deepEqual(findings, [])
  assert.deepEqual(staleAllow, [])
})

test('WL-07b negative control: the scan finds each kind of leak', () => {
  for (const [what, text] of [
    ['a sentence naming the platform', '<p>Powered by Stratum</p>'],
    ['a title', "useHead({ title: 'Stratum Shop' })"],
    ['an error message', "throw createError({ statusCode: 502, statusMessage: 'Stratum is unreachable' })"],
    ['a label with an apostrophe', "const label = 'Open your Stratum\'s admin'"],
    ['the platform host', "const u = 'https://shop.stratumengage.com/x'"],
    ['JourneyCX', "const by = 'JourneyCX'"],
    ['Perfex', '<span>Invoice by Perfex</span>'],
    ['an uppercase mention', '<p>STRATUM</p>'],
  ] as const) {
    assert.ok(scanText('x.vue', text).length > 0, `the scan missed: ${what}`)
  }
})

test('WL-07c what is code or a comment is not text a buyer reads, so it is not flagged', () => {
  for (const text of [
    "import type { BlogPost } from '~/server/utils/stratum'",
    "const d = await $fetch<import('~/server/utils/stratum').BlogPost>('/x')",
    'const r = await fetchStratum(event, path)',
    'const url = config.stratumInternalUrl',
    "headers: { 'X-Stratum-Token': token }",
    'STRATUM_INTERNAL_URL=http://127.0.0.1',
    '// this talks to Stratum',
    '/* Stratum quantity rule */',
    '<!-- Stratum comment -->',
  ]) {
    assert.deepEqual(scanText('x.vue', text), [], text)
  }
  assert.equal(stripComments('a // Stratum\nb').includes('Stratum'), false)
})
