import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'motion/react'
import { isProject, isScene, site, stops, type Line } from './content'
import { Matrix, type MatrixHandle } from './Matrix'
import { PicsWide } from './Pics'
import { Panel } from './Panel'

// One camera rule for the whole tour: scrolling down pulls the camera straight
// back. The next stop arrives from in front of you, larger, and settles at full
// size; the one you leave shrinks back and fades out, so nothing is left tiny.
// KABAM's three stops are one drawing whose own camera pulls back by the same
// rule (Orin module, robot, route), then the robot drives while you scroll.
const PB = 2.2       // pull-back factor per stop
const MOVE = 0.55    // share of a stop's scroll spent moving to the next one
const N = stops.length
const START = stops.reduce<number[]>((a, s) => [...a, a[a.length - 1] + s.w], [0])
const TOTAL = START[N]
const KABAM = [1, 3] // first and last KABAM stop

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

// scroll progress 0..1 -> (s: continuous stop index, rest: 0..1 through the stop's resting part)
function where(p: number) {
  const x = clamp(p) * TOTAL
  let j = 0
  while (j < N - 1 && START[j + 1] <= x) j++
  const u = x - START[j], rest = j === N - 1 ? stops[j].w : stops[j].w - MOVE
  return u < rest ? { s: j, rest: u / rest } : { s: j + ease((u - rest) / MOVE), rest: 1 }
}

function useViewport() {
  const [v, setV] = useState({ w: innerWidth, h: innerHeight })
  useEffect(() => {
    const on = () => setV({ w: innerWidth, h: innerHeight })
    addEventListener('resize', on)
    return () => removeEventListener('resize', on)
  }, [])
  return v
}

export function Stage({ goRef, onLine, chat }: { goRef: React.RefObject<(k: number) => void>; onLine: (l: Line) => void; chat: boolean }) {
  const rail = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const vp = useViewport()
  const { scrollYProgress } = useScroll({ target: rail, offset: ['start start', 'end end'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  const casting = new URLSearchParams(location.search).has('cast')
  const progress = casting || reduce ? scrollYProgress : smooth

  // the picture area: right of the text, clear of the top bar and the stop list.
  // With Holo's chat open (app.css: right 4.4vw, up to 420 px wide) the text
  // steps aside and the pictures take its place, left of the chat, at full size.
  const chatAt = vp.w * (1 - 0.044) - Math.min(420, vp.w - 32) - 32
  const A = chat
    ? { x: vp.w * 0.04, y: 100, w: Math.max(0, chatAt - vp.w * 0.04), h: vp.h - 100 - 120 }
    : { x: vp.w * 0.47, y: 100, w: vp.w * 0.44, h: vp.h - 100 - 120 }

  const layers = useRef<(HTMLDivElement | null)[]>([])
  const matrix = useRef<MatrixHandle>(null)
  const copy = useRef<HTMLDivElement>(null)
  const paint = (p: number) => {
    let { s, rest } = where(p)
    pan(p, s)
    if (reduce) s = Math.round(s)
    stops.forEach((st, k) => {
      if (isScene(st) && k !== KABAM[0]) return
      const el = layers.current[k]
      if (!el) return
      const d = isScene(st) ? (s < KABAM[0] ? s - KABAM[0] : s > KABAM[1] ? s - KABAM[1] : 0) : s - k
      const o = d < 0 ? clamp(1 + d / 0.6) : clamp(1 - d / 0.45)
      el.style.visibility = o > 0.001 ? 'visible' : 'hidden'
      el.style.opacity = String(o)
      el.style.transform = `scale(${Math.pow(PB, -d)})`
      el.style.pointerEvents = Math.abs(d) < 0.3 ? 'auto' : 'none'
    })
    const c = clamp(s - KABAM[0], 0, 2)
    const t = s < KABAM[1] ? 0 : s > KABAM[1] ? 1 : rest
    matrix.current?.paint(c, t)
  }
  // A card taller than its frame (a short window, or a zoomed-in page) is not
  // cut off: while the camera rests at its stop, scrolling slides the card up
  // from its top to its bottom; the camera moves on only after that.
  const pan = (p: number, s: number) => {
    const box = copy.current, card = box?.firstElementChild as HTMLElement | null
    if (!box || !card) return
    const over = Math.max(0, card.offsetHeight - box.clientHeight)
    box.classList.toggle('slides', over > 0)
    if (!over) { card.style.translate = ''; return }
    const k = clamp(Math.round(s), 0, N - 1)
    const [a, z] = k >= KABAM[0] && k <= KABAM[1] ? KABAM : [k, k]
    const end = START[z] + (z === N - 1 ? stops[z].w : stops[z].w - MOVE)
    const f = clamp((clamp(p) * TOTAL - START[a]) / (end - START[a]))
    card.style.translate = `0 ${over / 2 - over * f}px` // its own property: motion animates `transform`
  }
  useMotionValueEvent(progress, 'change', paint)
  useEffect(() => { paint(progress.get()) })
  // The card's height changes without a scroll (its web fonts arrive, the window
  // resizes, a new card mounts): slide it again, or a cold load leaves the
  // card's top under the top bar until the visitor scrolls.
  const latest = useRef(paint)
  latest.current = paint
  const sizes = useRef<ResizeObserver | null>(null)
  const watch = (el: HTMLDivElement | null) => {
    sizes.current ??= new ResizeObserver(() => latest.current(progress.get()))
    sizes.current.disconnect()
    if (el) sizes.current.observe(el)
  }
  useEffect(() => () => sizes.current?.disconnect(), [])

  const [j, setJ] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', p => {
    const next = clamp(Math.round(where(p).s), 0, N - 1)
    setJ(prev => (prev === next ? prev : next))
  })
  useEffect(() => { onLine(stops[j].holo) }, [j])

  const go = (k: number) => {
    const el = rail.current!
    const p = (START[k] + 0.01) / TOTAL
    window.scrollTo({ top: el.offsetTop + p * (el.offsetHeight - innerHeight), behavior: reduce ? 'auto' : 'smooth' })
  }
  goRef.current = go
  useEffect(() => {
    ;(window as unknown as { __cast: unknown }).__cast = {
      stops: stops.map(s => s.key),
      start: START.slice(0, N).map(x => x / TOTAL),
      duration: 30,
      seek(p: number) { const el = rail.current!; window.scrollTo(0, el.offsetTop + p * (el.offsetHeight - innerHeight)) },
    }
  }, [])

  const stop = stops[j]
  const panelKey = isScene(stop) ? 'kabam' : stop.key
  return (
    <section ref={rail} id="tour" className="rail" style={{ height: `${TOTAL * 100}vh` }}>
      <div className="stage">
        <div className="area" style={{ left: A.x, top: A.y, width: A.w, height: A.h }}>
          {stops.map((st, k) => {
            if (isScene(st) && k !== KABAM[0]) return null
            return (
              <div key={st.key} className={`layer l-${st.key}`} ref={el => { layers.current[k] = el }}>
                {st.key === 'intro' && <img className="portrait" src={site.identity.portrait.src} alt={site.identity.portrait.alt} />}
                {isScene(st) && <Matrix ref={matrix} />}
                {isProject(st) && <PicsWide project={st.project} W={A.w} H={A.h} />}
              </div>
            )
          })}
        </div>
        <div ref={copy} className={`copy ${chat ? 'away' : ''}`} inert={chat} aria-hidden={chat}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={panelKey} ref={watch}
              initial={{ opacity: 0, y: reduce ? 0 : 10 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}>
              <Panel stop={stop} />
            </motion.div>
          </AnimatePresence>
        </div>
        <ol className="ticks" aria-label="Stops">
          {stops.map((s, k) => (
            <li key={s.key} className={k === KABAM[0] || k === KABAM[1] + 1 ? 'gap' : ''}>
              <button className={k === j ? 'on' : ''} onClick={() => go(k)} title={`Go to ${s.label}`}>
                <em>{s.label}</em><i />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
