// node --experimental-strip-types --test tests/fontFamilies.test.ts   (Node 22+). The storefront applies a block font only from the allow-list.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALLOWED_FONT_FAMILIES, safeFontFamily } from '../utils/fontFamilies.ts'

test('every listed font is accepted exactly as the Studio saves it', () => {
  assert.ok(ALLOWED_FONT_FAMILIES.length >= 34)
  for (const f of ALLOWED_FONT_FAMILIES) assert.equal(safeFontFamily(f), f)
})

test('the list is well formed: unique, ends with a generic family, no characters that could leave the declaration', () => {
  assert.equal(new Set(ALLOWED_FONT_FAMILIES).size, ALLOWED_FONT_FAMILIES.length)
  for (const f of ALLOWED_FONT_FAMILIES) {
    assert.match(f, /^[A-Za-z0-9 ,'\-]+$/, f)
    assert.match(f, /(sans-serif|serif|cursive|monospace)$/, f)
  }
})

test('free text and anything that is not on the list is ignored (the block inherits the theme font)', () => {
  for (const bad of ['', 'Comic Sans MS', "'Montserrat'", "'Montserrat', sans-serif; color: red", "'Montserrat', sans-serif}", 'url(http://evil.example/x.woff)', "Arial, Helvetica, sans-serif ", "arial, helvetica, sans-serif", "'Montserrat', sans-serif<script>", 'inherit', 'var(--x)']) {
    assert.equal(safeFontFamily(bad), undefined, JSON.stringify(bad))
  }
  for (const odd of [undefined, null, 5, {}, [], ["'Montserrat', sans-serif"]]) assert.equal(safeFontFamily(odd), undefined)
})
