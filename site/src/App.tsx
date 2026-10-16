import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import DotGrid from './rb/DotGrid'
import { site, size, stops, type Line } from './content'
import { Stage } from './Stage'
import { Matrix, type MatrixHandle } from './Matrix'
import { PicsNarrow } from './Pics'
import { Hackathons, Contact, Intro, Kabam, ProjectCard } from './Panel'
import { Holo } from './Holo'
import { toggleTheme, token, useTheme } from './theme'

const AFTER = ['hackathons', 'contact'] as const
const afterLine: Record<string, Line> = {
  hackathons: site.sections.hackathons.holo, contact: site.sections.contact.holo,
}

// The pinned camera needs a window at least 900 px wide and 460 px tall (CSS
// pixels, so zooming in shrinks it). A card taller than the frame slides
// while you scroll (Stage.tsx pan); only a shorter window gets the blocks.
function useMedia(q: string) {
  const [on, setOn] = useState(() => matchMedia(q).matches)
  useEffect(() => {
    const m = matchMedia(q)
    const ch = () => setOn(m.matches)
    m.addEventListener('change', ch)
    return () => m.removeEventListener('change', ch)
  }, [q])
  return on
}

export function App() {
  const wideScreen = useMedia('(min-width: 900px)')
  const wide = useMedia('(min-width: 900px) and (min-height: 460px)')
  const [chat, setChat] = useState(false)
  const theme = useTheme()
  const reduce = useReducedMotion()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 't' && !(e.target instanceof HTMLInputElement) && !e.metaKey && !e.ctrlKey) toggleTheme()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // read the tokens after the theme attribute has changed
  const dots = useMemo(() => ({ base: token('--dot'), on: token('--dot-on') }), [theme])

  // Holo speaks for the tour stop in view, or for the section below the tour
  const [tourLine, setTourLine] = useState<Line>(stops[0].holo)
  const [after, setAfter] = useState<string | null>(null)
  useEffect(() => {
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) setAfter(e.target.id === 'tour' ? null : e.target.id) })
    }, { rootMargin: '-45% 0px -45% 0px' })
    ;['tour', ...AFTER].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [wide])

  const goStop = useRef<(k: number) => void>(() => {})
  const navTo = (to: string, now = false) => {
    const k = to === 'experience' ? 1 : stops.findIndex(s => s.key === to)
    if (k >= 0) goStop.current(k)
    else document.getElementById(to)?.scrollIntoView({ behavior: reduce || now ? 'auto' : 'smooth' })
  }
  // links from the v1 project pages (../index.html#projects, #proj-aiko …) land on their v2 place
  useEffect(() => {
    const h = decodeURIComponent(location.hash.slice(1))
    if (!h) return
    const legacy = site.legacy as Record<string, string>
    const t = setTimeout(() => navTo(legacy[h] ?? h, true), 150)
    return () => clearTimeout(t)
  }, [])
  // in-page links (#P6 from the hackathon list) move the tour, not just the hash
  useEffect(() => {
    const on = () => navTo(decodeURIComponent(location.hash.slice(1)))
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])

  return (
    <>
      <div className="field" aria-hidden>
        <DotGrid key={theme} dotSize={3} gap={22} baseColor={dots.base} activeColor={dots.on} proximity={130}
          shockRadius={260} shockStrength={3} glow={0.35} intro={false} />
      </div>
      <Top go={navTo} />
      {wide
        ? <Stage goRef={goStop} onLine={setTourLine} chat={chat} />
        : <Stack goRef={goStop} onLine={setTourLine} flow={wideScreen} />}
      <main className="after">
        <Hackathons />
        <Contact />
      </main>
      <Holo line={after ? afterLine[after] : tourLine} go={navTo} open={chat} setOpen={setChat}
        stop={after ?? stops.find(s => s.holo.id === tourLine.id)?.key ?? 'intro'} />
    </>
  )
}

function Top({ go }: { go: (to: string) => void }) {
  const theme = useTheme()
  return (
    <header className="top">
      <button className="mark" onClick={() => go('intro')} title="Back to the start · Home">{site.identity.name}</button>
      <nav>
        {site.nav.map(n => (
          <button key={n.id} data-id={n.id} onClick={() => go(n.to)} title={`Go to ${n.text}`}>{n.text}</button>
        ))}
        <button className="mode" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode · T`}>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </nav>
    </header>
  )
}

type TourProps = { goRef: React.RefObject<(k: number) => void>; onLine: (l: Line) => void }

// Phones, and wide windows under 460 px tall: no pinned camera; the intro,
// KABAM and each project are blocks (on a wide window, text and pictures side by side).
function Stack({ goRef, onLine, flow }: TourProps & { flow: boolean }) {
  const reduce = useReducedMotion()
  const refs = useRef<(HTMLElement | null)[]>([])
  const robot = useRef<MatrixHandle>(null)
  const [j, setJ] = useState(0)
  useEffect(() => {
    robot.current?.paint(2, 0.35)
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) setJ(Number((e.target as HTMLElement).dataset.k)) })
    }, { rootMargin: '-45% 0px -45% 0px' })
    refs.current.forEach(el => el && io.observe(el))
    return () => io.disconnect()
  }, [])
  useEffect(() => { onLine(stops[j].holo) }, [j])
  // KABAM's three stops share one block
  const block = (k: number) => (k >= 1 && k <= 3 ? 1 : k)
  goRef.current = (k: number) => refs.current[block(k)]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  return (
    <div id="tour" className={`stack ${flow ? 'flow' : ''}`}>
      <section data-k={0} ref={el => { refs.current[0] = el }} className="block">
        <img className="portrait" src={site.identity.portrait.src} alt={site.identity.portrait.alt}
          width={size(site.identity.portrait.src)?.[0]} height={size(site.identity.portrait.src)?.[1]} />
        <Intro />
      </section>
      <section id="experience" data-k={1} ref={el => { refs.current[1] = el }} className="block">
        <div className="robot-still"><Matrix ref={robot} /></div>
        <Kabam />
      </section>
      {site.projects.map((p, i) => {
        const k = 4 + i
        return (
          <section key={p.id} id={p.id} data-k={k} ref={el => { refs.current[k] = el }} className="block">
            <PicsNarrow project={p} />
            <ProjectCard project={p} n={i + 1} />
          </section>
        )
      })}
    </div>
  )
}
