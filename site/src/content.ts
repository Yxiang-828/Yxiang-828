import raw from '../../content/site.json'
import sizes from '../v2media/sizes.json'

export type Line = { id: string; text: string; ask?: string }
export type Link = { text: string; href: string }
export type Pic = { img: string; alt: string; role: 'main' | 'side' | 'side2' | 'badge' }
export type Job = { id: string; title: string; when?: string; bullets: Line[]; stack: string[] }
export type Scene = { id: string; label: string; bullet: string; holo: Line }
export type Project = {
  id: string; title: string; tag: string; what?: Line; bullets?: Line[]; fleet?: Line; more?: Line[]
  stack: string[]; page?: string; links: Link[]; cta?: string; pics: Pic[]; holo: Line
}
export type Result = { id: string; year: string; name: string; result: string; note?: string; proof?: string; project?: string }
export type Cert = { id: string; name: string; year: string; verify: string; img: string }
export type Section = { id: string; head: Line; results?: Result[]; also?: Line; certs?: Cert[]; holo: Line }
export type Site = {
  identity: typeof raw.identity
  nav: { id: string; text: string; to: string }[]
  intro: { id: string; label: string; intro: Line[]; holo: Line }
  experience: { id: string; label: string; head: Line; kabam: Job; ta: Job; scenes: Scene[] }
  projects: Project[]
  sections: { hackathons: Section; contact: Section }
  legacy: Record<string, string>
}

export const site = raw as unknown as Site
export const size = (src: string) => (sizes as unknown as Record<string, [number, number]>)[src]

// The tour, in scroll order: the intro, KABAM's three scenes (the Orin module,
// the robot, its route), then one stop per project. `w` is the stop's share of
// the scroll; the route gets two so the robot has room to drive.
export type Stop =
  | { key: 'intro'; label: string; w: number; holo: Line }
  | { key: string; label: string; w: number; holo: Line; scene: Scene }
  | { key: string; label: string; w: number; holo: Line; project: Project }
export const stops: Stop[] = [
  { key: 'intro', label: site.intro.label, w: 1, holo: site.intro.holo },
  ...site.experience.scenes.map(scene => ({ key: scene.id, label: scene.label, w: scene.id === 'route' ? 2 : 1, holo: scene.holo, scene })),
  ...site.projects.map(project => ({ key: project.id, label: project.title, w: 1, holo: project.holo, project })),
]
export const isScene = (s: Stop): s is Extract<Stop, { scene: Scene }> => 'scene' in s
export const isProject = (s: Stop): s is Extract<Stop, { project: Project }> => 'project' in s
export const isExternal = (href: string) => /^https?:/.test(href)
