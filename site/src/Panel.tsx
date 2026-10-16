import SpotlightCard from './rb/SpotlightCard'
import { isProject, isScene, site, size, type Line, type Project, type Stop } from './content'

const { hackathons, contact } = site.sections
import { useTheme } from './theme'

const id = site.identity

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const theme = useTheme()
  return (
    <SpotlightCard theme={theme} className={`card ${className}`} spotlightColor="#a78bfa" intensity={0.12} borderGlow={0.5}
      style={{ '--spotlight-card-surface': 'var(--panel)', '--spotlight-card-border': 'var(--line)' } as React.CSSProperties}>
      {children}
    </SpotlightCard>
  )
}

export function Resumes() {
  return (
    <div className="resumes">
      <span className="label">Résumé (PDF)</span>
      <div className="row">
        {id.resumes.map(r => (
          <a key={r.id} className="btn" href={r.file} target="_blank" rel="noopener" title={`Open the ${r.text} résumé as a PDF in a new tab`}>{r.text}</a>
        ))}
      </div>
    </div>
  )
}

export function Reach() {
  return (
    <div className="row">
      <a className="btn solid" href={`mailto:${id.email}`} title={`Email ${id.email} · opens your mail app`}>Email me</a>
      <a className="btn" href={id.github} target="_blank" rel="noopener" title="Open GitHub in a new tab">GitHub ↗</a>
      <a className="btn" href={id.linkedin} target="_blank" rel="noopener" title="Open LinkedIn in a new tab">LinkedIn ↗</a>
    </div>
  )
}

function Bullets({ lines, on }: { lines: Line[]; on?: string }) {
  return (
    <ul className={`bullets ${on ? 'focus' : ''}`}>
      {lines.map(b => <li key={b.id} data-id={b.id} className={b.id === on ? 'on' : ''}>{b.text}</li>)}
    </ul>
  )
}

function Chips({ stack }: { stack: string[] }) {
  return <ul className="chips" aria-label="Stack">{stack.map(s => <li key={s}>{s}</li>)}</ul>
}

export function Intro() {
  const [hi, ...lines] = site.intro.intro
  return (
    <div className="intro">
      <h1 data-id={hi.id}>{hi.text}</h1>
      {lines.map(l => (
        <p key={l.id} data-id={l.id} className={l.id === 'I3' ? 'now' : ''}>
          {l.id === 'I3' && <i className="dot" title="Working there now" />}{l.text}
        </p>
      ))}
      <Reach />
      <Resumes />
    </div>
  )
}

// KABAM: the bullet that matches the scene in view is lit, the others dim.
export function Kabam({ on }: { on?: string }) {
  const { head, kabam, ta } = site.experience
  return (
    <div className="sect">
      <h2 data-id={head.id}>{head.text}</h2>
      <Card>
        <h3 data-id={kabam.id}>{kabam.title}</h3>
        <p className="when"><i className="dot" title="Working there now" />{kabam.when}</p>
        <Bullets lines={kabam.bullets} on={on} />
        <Chips stack={kabam.stack} />
      </Card>
      <Card className="small">
        <h3 data-id={ta.id}>{ta.title}</h3>
        <p className="when">{ta.when}</p>
        <Bullets lines={ta.bullets} />
      </Card>
    </div>
  )
}

export function ProjectCard({ project, n }: { project: Project; n: number }) {
  return (
    <div className="sect">
      <p className="label">Projects · {n} of {site.projects.length}</p>
      <Card>
        <p className="tag">{project.tag}</p>
        <h2 className="title" data-id={project.id}>{project.title}</h2>
        {project.what && <p className="what" data-id={project.what.id}>{project.what.text}</p>}
        {project.bullets && <Bullets lines={project.bullets} />}
        {project.fleet && <p className="fleet" data-id={project.fleet.id}>{project.fleet.text}</p>}
        <Chips stack={project.stack} />
        {project.links.length > 0 && (
          <div className="row links">
            {project.links.map(l => (
              <a key={l.href} className="btn sm" href={l.href} target="_blank" rel="noopener"
                title={`${l.text} of ${project.title}, in a new tab`}>{l.text} ↗</a>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export function Panel({ stop }: { stop: Stop }) {
  if (isScene(stop)) return <Kabam on={stop.scene.bullet} />
  if (isProject(stop)) return <ProjectCard project={stop.project} n={site.projects.indexOf(stop.project) + 1} />
  return <Intro />
}

export function Hackathons() {
  return (
    <section id="hackathons" className="sect wide">
      <h2 data-id={hackathons.head.id}>{hackathons.head.text}</h2>
      <Card>
        <ol className="results">
          {hackathons.results!.map(r => (
            <li key={r.id} data-id={r.id}>
              <span className="label">{r.year}</span>
              <span className="name">{r.name}
                {r.note && (r.project
                  ? <em> · <a href={`#${r.project}`} title={`Go to ${r.note.split(' (')[0].split(',')[0]}`}>{r.note}</a></em>
                  : <em> · {r.note}</em>)}
              </span>
              {r.proof
                ? <a className="res" href={r.proof} target="_blank" rel="noopener" title={`See the ${r.name} certificate in a new tab`}>{r.result} ↗</a>
                : <span className="res">{r.result}</span>}
            </li>
          ))}
        </ol>
        {hackathons.also && <p className="also" data-id={hackathons.also.id}>{hackathons.also.text}</p>}
      </Card>
      <p className="label certs-label">Certificates</p>
      <div className="certs">
        {hackathons.certs!.map(c => (
          <figure key={c.id} data-id={c.id} className="cert">
            <a href={c.img} target="_blank" rel="noopener" title={`Open the ${c.name} full size, in a new tab`}>
              <img src={c.img} alt={`${c.name}, Coursera, ${c.year}, issued to Yao Xiang`} loading="lazy"
                width={size(c.img)?.[0]} height={size(c.img)?.[1]} />
            </a>
            <figcaption>
              <span className="label">{c.year}</span>
              <span className="name">{c.name}</span>
              <a className="res" href={c.verify} target="_blank" rel="noopener" title={`Check ${c.name} on Coursera, in a new tab`}>Verify ↗</a>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export function Contact() {
  return (
    <section id="contact" className="sect wide contact">
      <h2 data-id={contact.head.id}>{contact.head.text}</h2>
      <a className="mail" href={`mailto:${id.email}`} title="Email Xiang · opens your mail app">{id.email}</a>
      <Reach />
      <Resumes />
    </section>
  )
}
