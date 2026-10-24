// White-label source scan (M5 slice 3). A buyer must never see the platform's name on a storefront page, in a title, a tag, a link, an error
// message or a server response. This scans the storefront's source for the forbidden names (Dana, 2026-10-24: Stratum, stratumengage,
// JourneyCX, Perfex, the platform host) and fails on any standalone mention that is not in tools/white-label-allow.json.
//
// What it does NOT flag, on purpose: comments, import lines, and names that are part of code (module paths such as `~/server/utils/stratum`,
// identifiers such as `fetchStratum`, `STRATUM_INTERNAL_URL`, header names such as `x-stratum-token`): those are not text a buyer reads. What it
// DOES flag: the word on its own anywhere else (a sentence, a title, a label, an error message, a log prefix), and `stratumengage`, `journeycx`
// and `perfex` anywhere. Anything flagged that is deliberately fine goes in the allow list with a reason, and an allow entry that no longer
// matches anything is itself an error (so the list cannot rot). The rendered pages are checked live (parity D15); this is the source half.
//
//   node tools/white-label-scan.mjs        exit 1 when anything is found
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const FORBIDDEN_STANDALONE = ['stratum']
export const FORBIDDEN_ANYWHERE = ['stratumengage', 'journeycx', 'perfex']

const SCAN_DIRS = ['components', 'pages', 'layouts', 'composables', 'utils', 'server']
const SCAN_FILES = ['error.vue', 'app.vue', 'nuxt.config.ts']
const EXT = /\.(vue|ts|js|mjs)$/

/** Source text with comments removed (HTML, block and line comments). Line numbers are kept (comments become blank lines). */
export function stripComments(text) {
  const blank = (m) => m.replace(/[^\n]/g, '')
  return text
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[\s;,{(])\/\/[^\n]*/g, (m, lead) => lead)
}

/** Findings in one file's text: [{ line, word, text }]. */
export function scanText(file, text) {
  const out = []
  const lines = stripComments(text).split('\n')
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (line === '' || /^import\b/.test(line) || /^export\b.*\bfrom\b/.test(line)) return
    // a module path or a dynamic type import is code
    const code = raw.replace(/import\(\s*['"][^'"]*['"]\s*\)/g, '').replace(/from\s+['"][^'"]*['"]/g, '')
    const lower = code.toLowerCase()
    for (const w of FORBIDDEN_ANYWHERE) {
      if (lower.includes(w)) out.push({ line: i + 1, word: w, text: line.slice(0, 160) })
    }
    for (const w of FORBIDDEN_STANDALONE) {
      const re = new RegExp(`(?<![A-Za-z0-9_./~@$-])${w}(?![A-Za-z0-9_./~@$-])`, 'gi')
      if (re.test(code)) out.push({ line: i + 1, word: w, text: line.slice(0, 160) })
    }
  })
  return out
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, files)
    else if (EXT.test(e.name)) files.push(p)
  }
  return files
}

/** @returns {{ findings: {file:string,line:number,word:string,text:string}[], staleAllow: object[] }} */
export function scanRepo(root, allow = null) {
  const allowList = allow ?? JSON.parse(fs.readFileSync(path.join(root, 'tools', 'white-label-allow.json'), 'utf8')).allow
  const files = [...SCAN_DIRS.flatMap((d) => walk(path.join(root, d))), ...SCAN_FILES.map((f) => path.join(root, f)).filter((f) => fs.existsSync(f))]
  const used = new Set()
  const findings = []
  for (const f of files) {
    const rel = path.relative(root, f).split(path.sep).join('/')
    for (const hit of scanText(rel, fs.readFileSync(f, 'utf8'))) {
      const idx = allowList.findIndex((a) => a.file === rel && hit.text.includes(a.contains))
      if (idx >= 0) { used.add(idx); continue }
      findings.push({ file: rel, ...hit })
    }
  }
  return { findings, staleAllow: allowList.filter((_, i) => !used.has(i)) }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const { findings, staleAllow } = scanRepo(root)
  for (const f of findings) console.log(`${f.file}:${f.line}: "${f.word}" in: ${f.text}`)
  for (const a of staleAllow) console.log(`allow list entry matches nothing any more: ${JSON.stringify(a)}`)
  console.log(findings.length === 0 && staleAllow.length === 0 ? 'white-label scan: clean' : `white-label scan: ${findings.length} finding(s), ${staleAllow.length} stale allow entr${staleAllow.length === 1 ? 'y' : 'ies'}`)
  process.exit(findings.length === 0 && staleAllow.length === 0 ? 0 : 1)
}
