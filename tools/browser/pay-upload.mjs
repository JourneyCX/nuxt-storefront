// REAL-BROWSER test of the pay-invoices page (B2B Session 8d). It starts a stand-in back office (tools/browser/fake-backoffice.mjs) and the real
// storefront server (`nuxt dev`) pointed at it, signs a trade buyer in with a forged-but-valid session cookie, and drives the page in Chromium:
// choose invoices, read the reference, upload a proof, pay first and upload later, a refusal. It also checks, on what the stand-in RECEIVED,
// that the signature was valid, the file arrived intact, and that the browser sent no amount that counts.
//
// Why a browser: the Session 3 lesson (a form that "worked" when the code was called directly did nothing when submitted for real) applies to
// uploads too: a file input, a FileReader, a base64 body and a same-origin POST are exactly the parts a unit test never touches.
//
//   node tools/browser/pay-upload.mjs
//
// Needs: node_modules installed (npm ci), playwright-core (set PLAYWRIGHT_CORE to its folder if it is not installed here) and a Chromium
// (set CHROMIUM to its executable; the default is the newest ~/AppData/Local/ms-playwright/chromium-*/chrome-win/chrome.exe). Not part of CI.

import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { startFakeBackoffice, TENANT_ID, SID } from './fake-backoffice.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..', '..')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core')

const BACK = 3911
const WEB = 3910
const COOKIE_SECRET = 'browser-test-cookie-secret'
const results = []
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : '  (' + detail + ')'}`) }

function chromiumPath() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM
  const base = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright')
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().reverse() : []
  for (const d of dirs) { const p = path.join(base, d, 'chrome-win', 'chrome.exe'); if (fs.existsSync(p)) return p }
  throw new Error('No Chromium found: set CHROMIUM.')
}

/** The trade session cookie exactly as the storefront signs it (server/utils/tradeContext.ts). */
function tradeCookie() {
  const body = Buffer.from(JSON.stringify({ tid: TENANT_ID, sid: SID, iat: Math.floor(Date.now() / 1000) })).toString('base64url')
  const sig = createHmac('sha256', COOKIE_SECRET).update('trade|' + body).digest('base64url')
  return { name: `stratum-trade-${TENANT_ID}`, value: `${body}.${sig}` }
}

async function waitFor(url, ms) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.status < 500) return true } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 1500))
  }
  return false
}

const pdf = (label) => Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\n% ${label}\n%%EOF\n`)

const { server, state } = await startFakeBackoffice(BACK)
const nuxt = spawn(process.execPath, [path.join(repo, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs'), 'dev', '--port', String(WEB), '--host', '127.0.0.1'], {
  cwd: repo,
  env: { ...process.env, STRATUM_INTERNAL_URL: `http://127.0.0.1:${BACK}`, STRATUM_PUBLIC_HMAC_SECRET: 'browser-test-hmac-secret', ACCOUNT_SESSION_SECRET: COOKIE_SECRET, NODE_ENV: 'development' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let nuxtLog = ''
nuxt.stdout.on('data', d => { nuxtLog += d })
nuxt.stderr.on('data', d => { nuxtLog += d })
const stop = () => { try { nuxt.kill() } catch { /* gone */ } try { server.close() } catch { /* gone */ } }
process.on('exit', stop)

let browser
let page
try {
  if (!await waitFor(`http://127.0.0.1:${WEB}/api/trade/account/pay/list`, 240_000)) throw new Error('The storefront did not start:\n' + nuxtLog.slice(-1500))
  browser = await chromium.launch({ executablePath: chromiumPath() })
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } })
  const c = tradeCookie()
  await context.addCookies([{ name: c.name, value: c.value, url: `http://127.0.0.1:${WEB}`, httpOnly: true }])
  page = await context.newPage()
  if (process.env.PAY_DEBUG) {
    page.on('console', m => console.log('  [browser console]', m.type(), m.text().slice(0, 300)))
    page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('  [navigated]', f.url()) })
    page.on('pageerror', e => console.log('  [browser error]', String(e).slice(0, 400)))
    page.on('response', async r => { if (r.url().includes('/api/')) console.log('  [api]', r.request().method(), r.url().replace(/^https?:\/\/[^/]+/, ''), r.status(), (await r.text().catch(() => '')).slice(0, 300)) })
  }
  const hydrated = () => page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__), null, { timeout: 120_000 })
  const open = async () => { await page.goto(`http://127.0.0.1:${WEB}/trade/account/pay`, { waitUntil: 'domcontentloaded', timeout: 120_000 }); await hydrated(); await page.waitForSelector('[data-testid=trade-pay][data-ready=true]', { timeout: 120_000 }) }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pay-'))
  const slip = path.join(tmp, 'slip.pdf')
  fs.writeFileSync(slip, pdf('slip-one'))

  // ---- the page: invoices, and the order that has its own path ----------------------------------------------------------
  await open()
  const rows = await page.locator('[data-invoice]').count()
  check('PBU-01 the open invoices are listed, and the order waiting for its prepayment is listed on its own path (a link to the order, not an invoice to tick)',
    rows === 3 && await page.locator('[data-testid=pay-orders] a[href="/trade/order/B2B-901"]').count() === 1 && await page.locator('[data-testid=pay-pick-901]').count() === 0)

  // ---- choose two invoices: the reference is a code, shown before any file ----------------------------------------------
  await page.click('[data-testid=pay-pick-101]')
  await page.click('[data-testid=pay-pick-102]')
  if (process.env.PAY_DEBUG) console.log('  [state before click] checked:', await page.locator('input[type=checkbox]:checked').count(), 'disabled button:', await page.locator('[data-testid=pay-selected]').isDisabled())
  await page.click('[data-testid=pay-selected]')
  if (process.env.PAY_DEBUG) {
    await page.waitForTimeout(4000)
    console.log('  [state after click] error text:', JSON.stringify(await page.locator('[data-testid=pay-start-error]').allTextContents()), 'reference shown:', await page.locator('[data-testid=pay-reference]').count(), 'url:', page.url())
    await page.screenshot({ path: 'C:/w/pay_after_click.png' })
  }
  await page.waitForSelector('[data-testid=pay-reference]')
  const reference = (await page.textContent('[data-testid=pay-reference]'))?.trim() ?? ''
  const total = (await page.textContent('[data-testid=pay-total]'))?.trim() ?? ''
  const bank = (await page.textContent('[data-testid=pay-bank]')) ?? ''
  check('PBU-02 two invoices: a generated code with no look-alike characters, the total, and the bank details are on screen before anything is uploaded',
    /^PAY-[2-9A-HJKMNP-Z]{6}$/.test(reference) && total === 'R 700.00' && bank.includes('62000000000') && await page.locator('[data-testid=pay-status]').textContent().then(t => t?.includes('Waiting for your proof of payment')), `${reference} ${total}`)

  // ---- the upload form, really submitted --------------------------------------------------------------------------------
  await page.click('[data-testid=pay-upload-button]')
  check('PBU-03 submitting with no file says so in words and sends nothing', (await page.textContent('[data-testid=pay-upload-message]'))?.includes('Choose between 1 and 3 files') === true && state.calls.filter(x => x.action === 'account_pay_upload').length === 0)

  await page.setInputFiles('[data-testid=pay-files]', slip)
  await page.fill('[data-testid=pay-amount]', '1,25')
  const bad = await page.locator('[data-testid=pay-amount-bad]').count()
  const disabled = await page.locator('[data-testid=pay-upload-button]').isDisabled()
  check('PBU-04 an amount that could mean two things ("1,25") is flagged at once and the button is off; the format is shown next to the field', bad === 1 && disabled && (await page.textContent('[data-testid=trade-pay]'))?.includes('R 1,250.00') === true)

  await page.fill('[data-testid=pay-amount]', 'R 1,250.00')
  await page.fill('[data-testid=pay-ref-used]', 'ACME OCT')
  await page.click('[data-testid=pay-upload-button]')
  await page.waitForFunction(() => document.querySelector('[data-testid=pay-upload-message]')?.textContent?.includes('Thank you'), null, { timeout: 30_000 })
  const status = (await page.textContent('[data-testid=pay-status]')) ?? ''
  const up = state.calls.filter(x => x.action === 'account_pay_upload')
  const sent = up[0]?.body ?? {}
  check('PBU-05 the proof is uploaded: the page confirms in words and now says the payment is waiting to be checked', up.length === 1 && status.includes('Waiting for us to check your proof'), JSON.stringify(status))
  check('PBU-06 what the back office RECEIVED: the file intact, the reference the buyer used, the amount as plain "1250.00", the trade session, and NO amount or allocation of any kind',
    sent.files?.length === 1 && sent.files[0].name === 'slip.pdf' && Buffer.from(sent.files[0].data, 'base64').equals(pdf('slip-one'))
    && sent.buyer_reference === 'ACME OCT' && sent.buyer_total === '1250.00' && sent.sid === SID && sent.payment === state.payments[0].id
    && Object.keys(sent).sort().join() === 'buyer_reference,buyer_total,files,payment,sid', JSON.stringify(Object.keys(sent)))
  check('PBU-07 every call carried a valid signature (a wrong or missing one would have been refused)', state.badSignatures === 0, String(state.badSignatures))

  // ---- pay first, upload later --------------------------------------------------------------------------------------------
  await open()
  await page.click('[data-testid=pay-pick-103]')
  await page.click('[data-testid=pay-selected]')
  await page.waitForSelector('[data-testid=pay-reference]')
  check('PBU-08 one invoice: its number is the reference', (await page.textContent('[data-testid=pay-reference]'))?.trim() === 'INV-000103')
  await open() // the buyer leaves without uploading and comes back
  const row = page.locator('[data-payment-row]', { hasText: 'INV-000103' })
  check('PBU-09 the unfinished payment is still listed with its reference and says it is waiting for a proof', await row.count() === 1 && (await row.textContent())?.includes('Waiting for your proof of payment') === true)
  await row.locator('[data-open]').click()
  await page.waitForSelector('[data-testid=pay-upload-form]')
  await page.setInputFiles('[data-testid=pay-files]', [slip, path.join(tmp, 'slip.pdf')].slice(0, 1))
  await page.click('[data-testid=pay-upload-button]')
  await page.waitForFunction(() => document.querySelector('[data-testid=pay-upload-message]')?.textContent?.includes('Thank you'), null, { timeout: 30_000 })
  check('PBU-10 the proof can be uploaded later, to the payment that was started earlier (without an amount or a reference: both are optional)', state.calls.filter(x => x.action === 'account_pay_upload').length === 2 && state.calls.filter(x => x.action === 'account_pay_upload')[1].body.buyer_total === '')

  // ---- too many files are stopped in the browser; a refusal is shown in the back office's own words ------------------------
  await open()
  await page.click('[data-testid=pay-pick-101]')
  await page.click('[data-testid=pay-selected]')
  await page.waitForSelector('[data-testid=pay-upload-form]')
  const four = ['a', 'b', 'c', 'd'].map(n => { const f = path.join(tmp, n + '.pdf'); fs.writeFileSync(f, pdf(n)); return f })
  await page.setInputFiles('[data-testid=pay-files]', four)
  await page.click('[data-testid=pay-upload-button]')
  check('PBU-11 four files are refused before anything travels', (await page.textContent('[data-testid=pay-upload-message]'))?.includes('Choose between 1 and 3 files') === true && state.calls.filter(x => x.action === 'account_pay_upload').length === 2)

  await fetch(`http://127.0.0.1:${BACK}/__paid_meanwhile`, { method: 'POST' })
  await open()
  // The page was loaded after invoice 103 was paid, so 103 is no longer offered. A stale page is imitated by asking for it anyway.
  const stale = await page.evaluate(async () => { const r = await fetch('/api/trade/account/pay/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoice_ids: [103] }) }); return { status: r.status, text: await r.text() } })
  check('PBU-12 an invoice paid meanwhile is refused in the back office\'s own words', stale.status === 409 && stale.text.includes('already paid'), `${stale.status} ${stale.text.slice(0, 120)}`)

  // A browser will not let a script choose its Origin, so the cross-origin rule is tested from outside it: the same request with this
  // storefront's own origin gets through to the back office (409: invoice 103 is paid), with another site's origin it is stopped (403).
  const asBuyer = (origin) => fetch(`http://127.0.0.1:${WEB}/api/trade/account/pay/start`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: `${c.name}=${c.value}` }, body: JSON.stringify({ invoice_ids: [103] }) }).then(r => r.status)
  const [own, foreign] = [await asBuyer(`http://127.0.0.1:${WEB}`), await asBuyer('https://evil.example')]
  check('PBU-14 a state-changing request from another site is refused (403) while the same request from this storefront reaches the back office', own === 409 && foreign === 403, `own ${own}, foreign ${foreign}`)

  // ---- a phone ---------------------------------------------------------------------------------------------------------------
  await page.setViewportSize({ width: 390, height: 800 })
  await open()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check('PBU-13 at 390 px wide the page does not scroll sideways', overflow <= 1, String(overflow))
} catch (e) {
  console.log('FAIL  the run itself broke: ' + (e && e.stack ? e.stack : e))
  if (process.env.PAY_DEBUG && typeof page !== 'undefined') { console.log('--- page url ---', page.url()); console.log((await page.innerText('body').catch(() => '')).slice(0, 600)); await page.screenshot({ path: 'C:/w/pay_fail.png' }).catch(() => {}) }
  if (process.env.PAY_DEBUG) console.log('--- storefront log tail ---\n' + nuxtLog.slice(-2500))
  results.push(false)
} finally {
  if (browser) await browser.close()
  stop()
}
const failed = results.filter(r => !r).length
console.log(`\n${results.length} checks, ${failed} failed`)
process.exit(failed === 0 && results.length > 0 ? 0 : 1)
