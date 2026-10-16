import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import '../theme.css'
import '../app.css'
import './sub.css'
import DotGrid from '../rb/DotGrid'
import { site } from '../content'
import { Holo } from '../Holo'
import { initTheme, toggleTheme, token, useTheme } from '../theme'

// Aiko's page is written in its HTML (it reads without JavaScript); this adds
// what the home page has around it: the dot field, the theme switch and Holo.
initTheme()

const mode = document.getElementById('mode')!
const label = () => {
  const dark = document.documentElement.dataset.theme !== 'light'
  mode.textContent = dark ? 'Light' : 'Dark'
  mode.title = `Switch to ${dark ? 'light' : 'dark'} mode · T`
}
label()
mode.addEventListener('click', () => { toggleTheme(); label() })
addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 't' && !(e.target instanceof HTMLInputElement) && !e.metaKey && !e.ctrlKey) { toggleTheme(); label() }
})

function Field() {
  const theme = useTheme()
  const dots = useMemo(() => ({ base: token('--dot'), on: token('--dot-on') }), [theme])
  return <DotGrid key={theme} dotSize={3} gap={22} baseColor={dots.base} activeColor={dots.on} proximity={130}
    shockRadius={260} shockStrength={3} glow={0.35} intro={false} />
}

// Holo speaks for Aiko's card here; her links lead to the home page's stops,
// except Aiko's own, which is this page.
const aiko = site.projects.find(p => p.page === '/projects/aiko.html')!
const go = (to: string) => {
  if (to === aiko.id) scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  else location.href = `/#${to}`
}
function HoloHere() {
  const [open, setOpen] = useState(false)
  return <Holo line={aiko.holo} stop={aiko.id} go={go} open={open} setOpen={setOpen} />
}

createRoot(document.getElementById('field')!).render(<StrictMode><Field /></StrictMode>)
createRoot(document.getElementById('holo-root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <HoloHere />
    </MotionConfig>
  </StrictMode>,
)
