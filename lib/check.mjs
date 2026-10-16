// The build's last step (site/package.json "build"): fails the build, and so a
// Vercel deploy, when something built disagrees with content/facts.json.
//   1. a value listed in facts.json stale.values (case-insensitive),
//   2. a link to the old site, yxiang-828.github.io, other than the project
//      sites that live there in their own repos (stale.old_site_ok),
//   3. a {{token}} left unfilled,
//   4. a link inside the site to a file the build does not have.
// It reads the built page (site/dist), the README.md profile page, and every
// content/*.json as Holo reads it (filled), plus Holo's prompt and shots.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { facts, fillJson } from './truth.mjs'

const ROOT = resolve(import.meta.dirname, '..')
const DIST = join(ROOT, 'site/dist')
const f = facts()
const site = f.person.site
const problems = []
const say = (file, what) => problems.push(`${relative(ROOT, file)}: ${what}`)

const walk = dir => readdirSync(dir).flatMap(n => {
  const p = join(dir, n)
  return statSync(p).isDirectory() ? walk(p) : [p]
})
const TEXT = /\.(html|js|css|json|svg|txt|md)$/
const texts = [
  ...walk(DIST).filter(p => TEXT.test(p)),
  join(ROOT, 'README.md'),
  join(ROOT, 'agent/prompt.md'),
  join(ROOT, 'agent/shots.json'),
]
const read = p => p.startsWith(join(ROOT, 'content'))
  ? fillJson(readFileSync(p, 'utf8'))
  : readFileSync(p, 'utf8')
const content = readdirSync(join(ROOT, 'content'))
  .filter(n => n.endsWith('.json') && n !== 'facts.json')
  .map(n => join(ROOT, 'content', n))

const near = (t, i, n) => JSON.stringify(t.slice(Math.max(0, i - 40), i + n + 30))
const stale = [...new Set(f.stale.values.map(v => v.toLowerCase()))]
const okOld = f.stale.old_site_ok.map(r => `yxiang-828.github.io/${r}`)
for (const p of [...texts, ...content]) {
  const t = read(p), low = t.toLowerCase()
  for (const v of stale) {
    const i = low.indexOf(v)
    if (i >= 0) say(p, `stale "${v}" in ${near(t, i, v.length)}`)
  }
  for (const m of low.matchAll(/yxiang-828\.github\.io[^\s"'<>)`\]]*/g)) {
    if (!okOld.some(ok => m[0].startsWith(ok))) say(p, `old-site link ${m[0]} (point it at ${site})`)
  }
  for (const m of t.matchAll(/\{\{\s*[\w.]+\s*(\|\s*\w+\s*)?\}\}/g)) say(p, `unfilled ${m[0]}`)
}

// Links inside the site, from the built pages and from content (Holo's links
// and the page's buttons are content values starting with /).
const has = path => {
  const p = join(DIST, decodeURIComponent(path.split(/[?#]/)[0]))
  return existsSync(p) && (statSync(p).isFile() || existsSync(join(p, 'index.html')))
}
for (const p of walk(DIST).filter(p => p.endsWith('.html'))) {
  const t = readFileSync(p, 'utf8')
  for (const m of t.matchAll(/\s(?:href|src|poster)="([^"]+)"/g)) {
    const u = m[1]
    if (/^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/.test(u) || u.includes('${')) continue
    const path = u.startsWith('/') ? u : '/' + relative(DIST, resolve(dirname(p), u.split(/[?#]/)[0]))
    if (!has(path)) say(p, `dead link ${u}`)
  }
}
const own = new RegExp(`^(${site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})?(/[^\\s"']*)$`)
for (const p of [...content, join(ROOT, 'README.md')]) {
  const t = read(p)
  const values = p.endsWith('.md')
    ? [...t.matchAll(/(?:href="|\]\()([^")]+)/g)].map(m => m[1])
    : JSON.stringify(JSON.parse(t), (k, v) => v).match(/"(?:https?:\/\/[^"]+|\/[^"\s]*)"/g)?.map(s => s.slice(1, -1)) ?? []
  for (const u of values) {
    const m = own.exec(u)
    if (m && m[2].length > 1 && !m[2].startsWith('/api/') && !has(m[2])) say(p, `dead link ${u}`)
  }
}

if (problems.length) {
  console.error(`check: ${problems.length} problem(s), see content/facts.json\n  ` + problems.join('\n  '))
  process.exit(1)
}
console.log(`check: ok (${texts.length + content.length} files, no stale value, old-site link, unfilled token or dead link)`)
