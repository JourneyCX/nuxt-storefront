// node --experimental-strip-types --test tests/accountAddress.test.ts   (Node 22+)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanBilling } from '../server/utils/accountAddress.ts'

const base = { first_name: 'A', last_name: 'B', address_1: '1 Road', city: 'Cape Town', postcode: '8001', country: 'ZA', state: 'WC' }

test('a blank billing email is not sent (the fresh-account save failure)', () => {
  assert.deepEqual(cleanBilling({ ...base, email: '' }), base)
  assert.deepEqual(cleanBilling({ ...base, email: '   ' }), base)
  assert.deepEqual(cleanBilling({ ...base, email: null }), base)
})

test('a real billing email is kept (trimmed) and the other fields are untouched', () => {
  assert.deepEqual(cleanBilling({ ...base, email: ' a@b.co ' }), { ...base, email: 'a@b.co' })
})

test('an address with no email key is returned as it is, and the input is never changed', () => {
  assert.deepEqual(cleanBilling(base), base)
  const input = { ...base, email: '' }
  cleanBilling(input)
  assert.equal(input.email, '')
})

test('a missing billing object stays missing (shipping-only save)', () => {
  assert.equal(cleanBilling(undefined), undefined)
})

test('a non-blank invalid email is still passed on, so WooCommerce validates it', () => {
  assert.equal((cleanBilling({ ...base, email: 'not-an-email' }) as { email: string }).email, 'not-an-email')
})
