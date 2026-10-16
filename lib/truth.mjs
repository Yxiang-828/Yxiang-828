// The page's half of lib/truth.py: fills {{path}} and {{path|fmt}} in a
// content/ file from content/facts.json, so the page and Holo read the same
// text. build.py runs `node lib/truth.mjs <file>` and compares with Python.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const TOKEN = /\{\{\s*([\w.]+)\s*(?:\|\s*(\w+)\s*)?\}\}/g
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December']

export const facts = () => JSON.parse(readFileSync(resolve(ROOT, 'content/facts.json'), 'utf8'))

const fmt = (value, how, path) => {
  if (!how) return String(value)
  if (how === 'url') return encodeURIComponent(String(value)).replace(/%20/g, '+') // inside a link's query
  if (value === 'present') return 'Present'
  const m = /^(\d{4})-(\d{2})$/.exec(String(value))
  if (!m) throw new Error(`{{${path}|${how}}}: ${JSON.stringify(value)} is not YYYY-MM`)
  const [year, month] = [m[1], MONTHS[Number(m[2]) - 1]]
  if (how === 'mon') return `${month.slice(0, 3)} ${year}`
  if (how === 'month') return `${month} ${year}`
  if (how === 'm') return month.slice(0, 3)
  if (how === 'mm') return month
  if (how === 'y') return year
  throw new Error(`{{${path}|${how}}}: unknown format ${how} (mon, month, m, mm, y, url)`)
}

const lookup = (data, path) => {
  let node = data
  for (const part of path.split('.')) {
    if (node !== null && typeof node === 'object' && part in node) node = node[part]
    else throw new Error(`{{${path}}} is not in content/facts.json`)
  }
  if (node !== null && typeof node === 'object') throw new Error(`{{${path}}} is a group, not a value`)
  return node
}

export const fill = (text, data = facts()) => text.replace(TOKEN, (_, path, how) => fmt(lookup(data, path), how, path))

// HTML in, HTML out: each value escaped for the page (the <head> of a page).
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const fillHtml = (text, data = facts()) => text.replace(TOKEN, (_, path, how) => esc(fmt(lookup(data, path), how, path)))

// Raw JSON text in, raw JSON text out: each value is escaped for its string.
export const fillJson = (raw, data = facts()) =>
  raw.replace(TOKEN, (_, path, how) => JSON.stringify(fmt(lookup(data, path), how, path)).slice(1, -1))

if (process.argv[1] === import.meta.filename) {
  const file = resolve(ROOT, 'content', process.argv[2])
  process.stdout.write(JSON.stringify(JSON.parse(fillJson(readFileSync(file, 'utf8'))), null, 2) + '\n')
}
