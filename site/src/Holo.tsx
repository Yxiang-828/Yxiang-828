import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Line } from './content'
import qa from '../../content/holo-qa.json'
import { ask, Limit, type Answer, type Step, type Turn } from './ask'

type Msg =
  | { who: 'you'; text: string }
  | { who: 'holo'; text: string; steps: Step[]; answer?: Answer; pending?: boolean; note?: string }

const KABAM = new Set(['chip', 'robot', 'route'])
const short = (model: string) => model.split('/').pop() ?? model

// Prepared questions to offer before the visitor has asked anything: the ones
// for the stop in view first.
function startChips(stop: string, asked: Set<string>) {
  const here = KABAM.has(stop) ? 'experience' : stop
  const all = qa.qa.filter(x => !asked.has(x.id))
  return [...all.filter(x => x.to === here), ...all.filter(x => x.to === null), ...all.filter(x => x.to !== here && x.to !== null)]
    .slice(0, 3).map(x => ({ id: x.id, q: x.q[0] }))
}

// Holo's corner: her line for the stop in view, and her chat. Whether the
// chat is open lives in App, so the wide stage can make room for it.
export function Holo({ line, stop, go, open, setOpen }: {
  line: Line; stop: string; go: (to: string) => void
  open: boolean; setOpen: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const reduce = useReducedMotion()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [asked, setAsked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const list = useRef<HTMLOListElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const sprite = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key.toLowerCase() === 'h' && !(e.target instanceof HTMLInputElement)) setOpen(o => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // the input takes focus when the chat mounts (autoFocus: it appears only after
  // the bubble has faded out); on close, focus goes back to Holo's button
  useEffect(() => {
    if (wasOpen.current && !open) sprite.current?.focus()
    wasOpen.current = open
  }, [open])
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }) }, [msgs, reduce])

  const send = async (q: string, chipId?: string) => {
    q = q.trim()
    if (!q || busy) return
    const history: Turn[] = []
    msgs.forEach((m, i) => {
      const prev = msgs[i - 1]
      if (m.who === 'holo' && m.answer && prev?.who === 'you') history.push({ q: prev.text, a: m.answer.text, used: m.answer.used })
    })
    const nowAsked = new Set(asked)
    if (chipId) nowAsked.add(chipId)
    setAsked(nowAsked)
    setDraft('')
    setBusy(true)
    setMsgs(m => [...m, { who: 'you', text: q }, { who: 'holo', text: '', steps: [], pending: true }])
    const patch = (f: (m: Extract<Msg, { who: 'holo' }>) => Msg) =>
      setMsgs(m => m.map((x, i) => (i === m.length - 1 && x.who === 'holo' ? f(x) : x)))
    try {
      const a = await ask({ q, history: history.slice(-3), asked: [...nowAsked], stop },
        s => patch(x => ({ ...x, steps: [...x.steps, s] })))
      if (a.matched) setAsked(s => new Set(s).add(a.matched!))
      patch(x => ({ ...x, text: a.text, answer: a, pending: false }))
    } catch (e) {
      const note = e instanceof Limit
        ? `Holo has answered a lot just now. Try again ${e.wait === 'a minute' ? 'in a minute' : 'tomorrow'}, or write to Xiang below.`
        : 'Holo could not be reached. The page itself has everything she knows.'
      patch(x => ({ ...x, pending: false, note }))
    } finally {
      setBusy(false)
    }
  }
  // back to the input once it is enabled again (focus on a disabled input is lost)
  useEffect(() => { if (!busy && open) input.current?.focus() }, [busy])

  const last = [...msgs].reverse().find(m => m.who === 'holo' && m.answer) as Extract<Msg, { who: 'holo' }> | undefined
  const chips = last?.answer?.chips.filter(c => !asked.has(c.id)) ?? startChips(stop, asked)
  const enter = { duration: 0.2, ease: [0.32, 0.72, 0, 1] as const }

  return (
    <aside className={`holo ${open ? 'open' : ''}`}>
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div key="chat" className="chat" role="dialog" aria-label="Chat with Holo"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }} animate={{ opacity: 1, scale: 1, transition: enter }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}>
            <header>
              <img src="/v2media/holo.webp" alt="" />
              <strong>Holo</strong>
              <button className="x" title="Close · Esc" onClick={() => setOpen(false)}>×</button>
            </header>
            <ol className="talk" ref={list} aria-live="polite">
              <li className="said voice" data-id={line.id}>{line.text}</li>
              {msgs.map((m, i) => m.who === 'you'
                ? <li key={i} className="you">{m.text}</li>
                : <HoloSaid key={i} m={m} go={go} />)}
            </ol>
            {!busy && chips.length > 0 && (
              <ul className="next" aria-label="Ask next">
                {chips.map(c => (
                  <li key={c.id}><button onClick={() => send(c.q, c.id)} title={`Ask Holo: ${c.q}`}>{c.q}</button></li>
                ))}
              </ul>
            )}
            <form onSubmit={e => { e.preventDefault(); send(draft) }}>
              <input ref={input} aria-label="Ask Holo" placeholder="Ask Holo about Xiang…" maxLength={500}
                value={draft} onChange={e => setDraft(e.target.value)} disabled={busy} autoFocus />
              <button className="btn solid" disabled={busy || !draft.trim()} title="Send · Enter">Send</button>
            </form>
            <p className="fine">Questions you ask here are sent to Xiang. Holo can be wrong; the page is the record.</p>
          </motion.div>
        ) : (
          <motion.button key={line.id} className="bubble" onClick={() => setOpen(true)} title="Open Holo's chat · H"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }} animate={{ opacity: 1, scale: 1, transition: enter }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}>
            <span className="voice" data-id={line.id}>{line.text}</span>
          </motion.button>
        )}
      </AnimatePresence>
      {!open && <button ref={sprite} className="sprite" onClick={() => setOpen(true)} title="Open Holo's chat · H"><img src="/v2media/holo.webp" alt="Holo" /></button>}
    </aside>
  )
}

// The model marks a title the markdown way (*Spice and Wolf*); set it upright
// in her italic line instead of showing the asterisks.
function titled(text: string) {
  return text.split(/\*([^*\n]+)\*/).map((part, i) => i % 2 ? <em key={i}>{part}</em> : part)
}

// One answer: the live steps while she works, then the text, links that move
// the page to what it stands on, and how it was made.
function HoloSaid({ m, go }: { m: Extract<Msg, { who: 'holo' }>; go: (to: string) => void }) {
  const search = m.steps.find(s => s.stage === 'search')
  const draft = m.steps.find(s => s.stage === 'draft')
  const check = m.steps.find(s => s.stage === 'check')
  if (m.pending) {
    return (
      <li className="holo-said working">
        <span className="dot" aria-hidden />
        {!search ? 'Searching the page…' : `Found ${search.hits.length} of ${search.of} facts · ${search.ms} ms. Writing…`}
      </li>
    )
  }
  if (m.note) return <li className="holo-said note">{m.note}</li>
  const a = m.answer!
  return (
    <li className="holo-said">
      {a.plain && <span className="label">Holo's voice is down · the closest fact from the page</span>}
      <p className="voice">{titled(a.text)}</p>
      {a.links.length > 0 && (
        <div className="goto">
          {a.links.map(l => (
            <button key={l.to} onClick={() => go(l.to)} title={`Move the page to ${l.label}`}>{l.label} →</button>
          ))}
        </div>
      )}
      <details className="trace" onToggle={e => { if (e.currentTarget.open) e.currentTarget.scrollIntoView({ block: 'nearest' }) }}>
        <summary title="See the steps behind this answer">How I answered · {(a.ms / 1000).toFixed(1)} s</summary>
        <ol>
          {search && (
            <li>
              <b>Search</b> {search.ms} ms: {Object.entries(search.lists).map(([k, n]) => `${k} ${n}`).join(' · ')}
              {' '}→ fused by rank (RRF) → top {search.hits.length} of {search.of} facts
              {search.note && <em> ({search.note})</em>}
              <ul className="hits">
                {search.hits.map(h => (
                  <li key={h.id} className={a.used.includes(h.id) ? 'used' : ''}
                    title={Object.entries(h.ranks).map(([k, r]) => `${k} #${r}`).join(', ')}>
                    <code>{h.id}</code> {h.title}
                  </li>
                ))}
              </ul>
            </li>
          )}
          {draft && <li><b>Answer</b> {short(draft.model)} · {draft.ms} ms{draft.error ? ` · failed: ${draft.error}` : ''}</li>}
          {check && <li><b>Check</b> {short(check.model)} · {check.ms} ms · {check.cut.length ? `cut: ${check.cut.join(' | ')}` : 'nothing cut'}</li>}
          <li><b>Linked facts</b> {a.used.length ? a.used.join(", ") : "none"}</li>
        </ol>
      </details>
    </li>
  )
}
