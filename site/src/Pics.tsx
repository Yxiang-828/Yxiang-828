import { isExternal, size, type Pic, type Project } from './content'

type Box = { x: number; y: number; w: number; h: number }
const fit = (src: string, w: number, h: number) => {
  const [iw, ih] = size(src) ?? [16, 10]
  const k = Math.min(w / iw, h / ih)
  return { w: iw * k, h: ih * k }
}

// The pictures his old site chose for a project, laid out large in a W×H
// area: the main picture first, the second overlapping its lower corner, the
// icon pinned to its top corner. Every picture and the big button under them
// open the project's page.
function layout(pics: Pic[], W: number, H: number): { boxes: Box[]; cta: { x: number; y: number; w: number } } {
  const main = pics.find(p => p.role === 'main')!
  const [mw, mh] = size(main.img) ?? [16, 10]
  const boxes: Box[] = []
  const place = (p: Pic, b: Box) => { boxes[pics.indexOf(p)] = b }
  const side = pics.find(p => p.role === 'side'), side2 = pics.find(p => p.role === 'side2'), badge = pics.find(p => p.role === 'badge')
  const CTA_H = 78, GAP = 26, room = H - CTA_H - GAP
  let cta = { x: 0, y: 0, w: W }
  if (!side) {
    const m = fit(main.img, W, room)
    place(main, { x: 0, y: 0, ...m })
    cta.y = m.h + GAP
  } else if (mw >= mh) {
    // landscape: main on top, the second picture over its lower right corner, the button under both
    const m = fit(main.img, W * (mw / mh > 1.8 ? 0.9 : 0.8), room * 0.74)
    place(main, { x: 0, y: 0, ...m })
    const s = fit(side.img, W * 0.44, room * 0.52)
    const sy = Math.min(m.h * 0.6, room - s.h)
    place(side, { x: W - s.w, y: sy, ...s })
    cta.y = Math.max(m.h, sy + s.h) + GAP
  } else {
    // portrait: main on the left, the others stacked to its right, the button under all of them
    const m = fit(main.img, W * 0.46, room)
    place(main, { x: 0, y: 0, ...m })
    const x = m.w + W * 0.05
    let y = 0
    for (const p of [side, side2]) {
      if (!p) continue
      const s = fit(p.img, W - x, side2 ? (m.h - 18) / 2 : m.h)
      place(p, { x, y, ...s })
      y += s.h + 18
    }
    cta.y = Math.max(m.h, y - 18) + GAP
  }
  if (badge) {
    const m = boxes[pics.indexOf(main)]
    const b = fit(badge.img, W * 0.15, W * 0.15)
    place(badge, { x: m.x + m.w - b.w * 0.62, y: -b.h * 0.32, ...b })
  }
  // centre the group in the area, top of the badge included
  const top = Math.min(0, ...boxes.filter(Boolean).map(b => b.y))
  const dy = Math.max(-top, (H - (cta.y + CTA_H - top)) / 2 - top)
  boxes.forEach(b => { if (b) b.y += dy })
  cta.y += dy
  return { boxes, cta }
}

const open = (p: Project) => ({
  href: p.page!, target: isExternal(p.page!) || p.page!.endsWith('.webp') ? '_blank' : undefined, rel: 'noopener',
})

export function Cta({ project }: { project: Project }) {
  if (!project.page || !project.cta) return null
  return (
    <a className="cta" {...open(project)} title={`${project.cta} · Enter`}>
      <span>{project.cta}</span><b aria-hidden>→</b>
    </a>
  )
}

// Wide screens: absolutely placed inside the stage's picture area.
export function PicsWide({ project, W, H }: { project: Project; W: number; H: number }) {
  const { boxes, cta } = layout(project.pics, W, H)
  return (
    <div className="pics" style={{ width: W, height: H }}>
      {project.pics.map((p, i) => {
        const b = boxes[i]
        return (
          <a key={p.img} className={`pic ${p.role}`} {...open(project)} tabIndex={-1}
            style={{ left: b.x, top: b.y, width: b.w, height: b.h }} title={project.cta}>
            <img src={p.img} alt={p.alt} decoding="async" draggable={false} />
          </a>
        )
      })}
      <div className="cta-at" style={{ left: cta.x, top: cta.y, maxWidth: cta.w }}><Cta project={project} /></div>
    </div>
  )
}

// The picture's own size, so the browser keeps its space before it loads: a
// lazy picture that grows the page mid-scroll moves the place a link aims at.
const dims = (src: string) => { const s = size(src); return s ? { width: s[0], height: s[1] } : {} }

// Phones: the main picture full width, the rest in a row under it.
export function PicsNarrow({ project }: { project: Project }) {
  const main = project.pics.find(p => p.role === 'main')!
  const rest = project.pics.filter(p => p !== main)
  return (
    <div className="pics-narrow">
      <a className="pic main" {...open(project)} title={project.cta}><img src={main.img} alt={main.alt} {...dims(main.img)} loading="lazy" decoding="async" /></a>
      {rest.length > 0 && (
        <div className="rest">
          {rest.map(p => (
            <a key={p.img} className={`pic ${p.role}`} {...open(project)} title={project.cta}><img src={p.img} alt={p.alt} {...dims(p.img)} loading="lazy" decoding="async" /></a>
          ))}
        </div>
      )}
      <Cta project={project} />
    </div>
  )
}
