import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { cpSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fillHtml, fillJson } from '../lib/truth.mjs'

// The v1 pages (project write-ups, résumé page, their images and videos) keep
// their addresses: they are copied into the build untouched. Pages rebuilt in
// the v2 look are Vite pages instead, so the copy must not overwrite them.
const LEGACY = ['projects', 'images', 'media', 'v2media', 'resume.html', 'resume.pdf', 'styles.css', 'script.js']
const V2_PAGES = ['projects/aiko.html']

const legacy = (): Plugin => ({
  name: 'copy-legacy',
  apply: 'build',
  closeBundle() {
    for (const p of LEGACY) {
      const from = resolve(import.meta.dirname, p)
      const keep = (src: string) => !V2_PAGES.some(v => src === resolve(import.meta.dirname, v))
      if (existsSync(from)) cpSync(from, resolve(import.meta.dirname, 'dist', p), { recursive: true, filter: keep })
    }
  },
})

// The page is site/; what it shares with Holo, the résumé and the profile
// README (content/, lib/) sits one level up, at the repo root.
const ROOT = resolve(import.meta.dirname, '..')

// Every content/*.json the page imports has its {{path}} tokens filled from
// content/facts.json first, the same way Holo reads it (lib/truth.py).
const truth = (): Plugin => ({
  name: 'content-truth',
  enforce: 'pre',
  transform(code, id) {
    if (!/\/content\/[^/]+\.json$/.test(id) || id.endsWith('/facts.json')) return
    this.addWatchFile(resolve(ROOT, 'content/facts.json'))
    return { code: fillJson(code), map: null }
  },
})

// A v2 project page repeats lines of its home-page card (the tag, the bullets).
// They are filled from content/site.json when the page is served or built, so
// an edit to the card reaches the page too (room/4340: Aiko's page kept the
// 15 Oct copy). <p data-fill="P1.tag"> takes the tag; <article data-id="P1a">
// takes that line, "Heading: text" split into its h3 and p.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fill = (): Plugin => ({
  name: 'fill-from-content',
  transformIndexHtml(html) {
    html = fillHtml(html) // {{path}} in a page, its <meta> description say, from content/facts.json
    if (!html.includes('data-fill=') && !html.includes('data-id=')) return html
    const site = JSON.parse(fillJson(readFileSync(resolve(ROOT, 'content/site.json'), 'utf8')))
    const lines = new Map<string, string>()
    for (const p of site.projects) {
      lines.set(`${p.id}.tag`, p.tag)
      for (const l of [p.what, ...(p.bullets ?? []), p.fleet, ...(p.more ?? [])]) if (l) lines.set(l.id, l.text)
    }
    const line = (id: string) => {
      const text = lines.get(id)
      if (text === undefined) throw new Error(`${id} is on a page but not in content/site.json`)
      return text
    }
    return html
      .replace(/(<(\w+)[^>]*\sdata-fill="([^"]+)"[^>]*>)[\s\S]*?(<\/\2>)/g, (_, open, _tag, id, close) => open + esc(line(id)) + close)
      .replace(/(<article[^>]*\sdata-id="([^"]+)"[^>]*>\s*)<h3>([\s\S]*?)<\/h3>\s*<p>[\s\S]*?<\/p>/g, (_, open, id, h3) => {
        const text = line(id)
        const cut = text.indexOf(': ')
        return cut > 0 && cut < 40
          ? `${open}<h3>${esc(text.slice(0, cut))}</h3>\n      <p>${esc(text.slice(cut + 2))}</p>`
          : `${open}<h3>${h3}</h3>\n      <p>${esc(text)}</p>`
      })
  },
})

export default defineConfig({
  base: '/',
  publicDir: false,
  plugins: [truth(), react(), legacy(), fill()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(['index.html', ...V2_PAGES].map(f => [f.replace(/\W/g, '_'), resolve(import.meta.dirname, f)])),
    },
  },
  // Holo's agent (agent/holo.py) runs beside the page; same origin through this proxy
  server: { host: '127.0.0.1', port: 4871, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8790' }, fs: { allow: [ROOT] } },
  preview: { proxy: { '/api': 'http://127.0.0.1:8790' } },
})
