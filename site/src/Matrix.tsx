import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'

// KABAM as one drawing at three zoom levels, five times apart: the Jetson Orin
// module (level 0) sits inside the patrol robot (level 1), and the robot sits at the
// start of its patrol route on a LiDAR map (level 2). The camera pulls back
// level by level, then the robot drives its Nav2 route past the waypoints to
// the dock. A drawing of the work, not robot data. Each level is drawn in its
// own ±500 box; lines and LiDAR dots keep their screen size at every zoom.
const K = 5

// level 2, the map
const ROUTE: [number, number][] = [
  [0, 0], [0, -220], [200, -330], [370, -300], [390, -40], [290, 180], [40, 320], [-220, 310], [-350, 110], [-330, -150],
]
const WAYPOINTS = [2, 4, 6, 8]
const BUILDINGS: [number, number, number, number][] = [[90, -220, 210, 320], [-260, 60, 180, 160], [-280, -380, 160, 160]]
const TREES: [number, number][] = [[-130, -60], [210, 280], [-420, -330], [430, 400], [150, -430]]

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lidarDots() {
  const r = rng(4)
  const pts: [number, number][] = []
  const wall = (x1: number, y1: number, x2: number, y2: number, keep = 0.85) => {
    const n = Math.round(Math.hypot(x2 - x1, y2 - y1) / 9)
    for (let i = 0; i <= n; i++) {
      if (r() > keep) continue
      const t = i / n
      pts.push([x1 + (x2 - x1) * t + (r() - 0.5) * 5, y1 + (y2 - y1) * t + (r() - 0.5) * 5])
    }
  }
  BUILDINGS.forEach(([x, y, w, h]) => { wall(x, y, x + w, y); wall(x + w, y, x + w, y + h); wall(x + w, y + h, x, y + h); wall(x, y + h, x, y) })
  wall(-470, -450, 120, -450); wall(240, -450, 470, -450); wall(470, -450, 470, 450, 0.7)
  wall(470, 450, -470, 450, 0.7); wall(-470, 450, -470, -450)
  TREES.forEach(([cx, cy]) => { for (let i = 0; i < 26; i++) { const a = r() * 6.283, d = 6 + r() * 22; pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]) } })
  return pts.map(([x, y]) => `M${x.toFixed(1)} ${y.toFixed(1)}h0.01`).join('')
}

// arc length along the route, so the robot drives at an even speed
const SEG = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]))
const TOTAL = SEG.reduce((a, b) => a + b, 0)
const AT = SEG.reduce<number[]>((acc, l) => [...acc, acc[acc.length - 1] + l], [0])
function along(d: number): [number, number] {
  d = Math.min(Math.max(d, 0), TOTAL)
  let i = 0
  while (i < SEG.length - 1 && AT[i + 1] < d) i++
  const f = SEG[i] ? (d - AT[i]) / SEG[i] : 0
  return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * f, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * f]
}

const text = (x: number, y: number, s: string, size: number, cls = 'm-label') =>
  <text x={x} y={y} fontSize={size} textAnchor="middle" className={cls}>{s}</text>

function Orin() {
  const chips: [number, number][] = [[-330, -250], [210, -250], [-330, 170], [210, 170]]
  const bundles = chips.flatMap(([cx, cy], k) => {
    const tx = cx < 0 ? cx + 120 : cx, ty = cy + 40
    return Array.from({ length: 9 }, (_, i) => {
      const sx = cx < 0 ? -118 : 118, sy = (cy < 0 ? -90 : 30) + i * 7, mx = (sx + tx) / 2
      return <polyline key={`b${k}${i}`} points={`${sx},${sy} ${mx},${sy} ${mx},${ty - 28 + i * 7} ${tx},${ty - 28 + i * 7}`} className="m-trace" />
    })
  })
  return (
    <>
      <rect x={-492} y={-420} width={984} height={840} rx={26} className="m-board" />
      {[[-450, -380], [450, -380], [-450, 380], [450, 380]].map(([x, y]) => <circle key={`h${x}${y}`} cx={x} cy={y} r={16} className="m-faint" />)}
      {Array.from({ length: 64 }, (_, i) => <rect key={`f${i}`} x={-440 + i * 13.8} y={392} width={8} height={26} className="m-pin" />)}
      {bundles}
      {chips.map(([x, y]) => <rect key={`c${x}${y}`} x={x} y={y} width={120} height={80} rx={4} className="m-chip" />)}
      <rect x={-118} y={-118} width={236} height={236} rx={8} className="m-soc" />
      {Array.from({ length: 10 }, (_, i) => <rect key={`v${i}`} x={-300 + i * 22} y={-360} width={14} height={60} className="m-cell" />)}
    </>
  )
}
const orinText = (
  <>
    {text(0, -140, 'JETSON ORIN AGX', 26)}
    {[[-330, -250], [210, -250], [-330, 170], [210, 170]].map(([x, y]) => <g key={`l${x}${y}`}>{text(x + 60, y + 48, 'LPDDR5', 18, 'm-label dim')}</g>)}
    {text(0, 10, 'SAM3', 44, 'm-label hot')}
    {text(0, 60, 'on TensorRT', 22, 'm-label hot')}
  </>
)

function Robot({ body }: { body: React.Ref<SVGRectElement> }) {
  return (
    <>
      {[[-205, -175], [165, -175], [-205, 85], [165, 85]].map(([x, y]) => <rect key={`w${x}${y}`} x={x} y={y} width={40} height={90} rx={10} className="m-wheel" />)}
      <rect ref={body} x={-160} y={-235} width={320} height={470} rx={46} className="m-body" />
      <circle cx={0} cy={-190} r={24} className="m-lidar" />
    </>
  )
}
const robotText = (
  <>
    {text(0, 300, 'PATROL ROBOT', 28)}
    {text(0, -250, 'LIDAR', 16, 'm-label dim')}
    {text(250, -60, 'ROS 2', 20, 'm-label dim')}
    {text(-250, -60, 'CAN', 20, 'm-label dim')}
  </>
)
const mapText = (
  <>
    {text(-330, -470, 'LIDAR SLAM MAP', 18, 'm-label dim')}
    {text(250, -360, 'NAV2 MPPI ROUTE', 18, 'm-label hot')}
    {text(-330, -190, 'DOCK', 18)}
  </>
)

export type MatrixHandle = { paint: (c: number, t: number) => void }

// c: camera level, 0 = the Orin module fills the view, 2 = the whole map.
// t: how far the robot has driven along its route, 0..1.
// Levels 0 and 1 are drawn inside the robot's frame, so its turns carry them.
export const Matrix = forwardRef<MatrixHandle>(function Matrix(_, ref) {
  const dots = useMemo(lidarDots, [])
  const map = useRef<SVGGElement>(null)
  const robot = useRef<SVGGElement>(null)
  const lvl1 = useRef<SVGGElement>(null)
  const lvl0 = useRef<SVGGElement>(null)
  const body = useRef<SVGRectElement>(null)
  const sweep = useRef<SVGPathElement>(null)
  const texts = [useRef<SVGGElement>(null), useRef<SVGGElement>(null), useRef<SVGGElement>(null)]
  const wps = useRef<(SVGRectElement | null)[]>([])

  useImperativeHandle(ref, () => ({
    paint(c, t) {
      const S = [0, 1, 2].map(L => Math.pow(K, L - c))
      const d = t * TOTAL
      const [px, py] = along(d)
      const [ax, ay] = along(d - 14), [bx, by] = along(d + 14)
      const heading = (bx === ax && by === ay) ? 0 : Math.atan2(bx - ax, -(by - ay)) * 180 / Math.PI
      map.current?.setAttribute('transform', `scale(${S[2]})`)
      // zoomed in past the robot: its body and the map step aside for the Orin module
      if (map.current) map.current.style.opacity = String(Math.min(1, Math.max(0, (12 - S[2]) / 4)))
      if (body.current) body.current.style.fillOpacity = String(Math.min(1, Math.max(0, (2.6 - S[1]) / 1.2)))
      robot.current?.setAttribute('transform', `translate(${px * S[2]} ${py * S[2]}) rotate(${heading})`)
      lvl1.current?.setAttribute('transform', `scale(${S[1]})`)
      lvl0.current?.setAttribute('transform', `scale(${S[0]})`)
      if (lvl0.current) lvl0.current.style.opacity = String(Math.min(1, Math.max(0, (S[0] - 0.06) / 0.1)))
      texts.forEach((r, L) => {
        const s = S[L], el = r.current
        if (!el) return
        el.setAttribute('transform', `scale(${s})`)
        el.style.opacity = String(s > 0.55 && s < 1.9 ? Math.min(1, (s - 0.55) / 0.2, (1.9 - s) / 0.3) : 0)
      })
      sweep.current?.setAttribute('transform', `rotate(${(c * 140 + t * 1080) % 360} 0 -190)`)
      WAYPOINTS.forEach((w, k) => wps.current[k]?.classList.toggle('on', d >= AT[w] - 1))
    },
  }))

  return (
    <svg className="matrix" viewBox="-500 -500 1000 1000" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <g ref={map}>
        <path d={dots} className="m-dots" />
        <polyline points={ROUTE.map(p => p.join(',')).join(' ')} className="m-route" />
        {WAYPOINTS.map((w, k) => {
          const [x, y] = ROUTE[w]
          return <rect key={w} ref={el => { wps.current[k] = el }} x={x - 7} y={y - 7} width={14} height={14} transform={`rotate(45 ${x} ${y})`} className="m-wp" />
        })}
        <rect x={-350} y={-170} width={40} height={14} rx={3} className="m-dock" />
      </g>
      <g ref={robot}>
        <g ref={lvl1}>
          <path ref={sweep} d="M0 -190 L-150 -560 A400 400 0 0 1 150 -560 Z" className="m-sweep" />
          <Robot body={body} />
        </g>
        <g ref={lvl0}><Orin /></g>
        <g ref={texts[1]}>{robotText}</g>
        <g ref={texts[0]}>{orinText}</g>
      </g>
      <g ref={texts[2]}>{mapText}</g>
    </svg>
  )
})
