// Holo's agent over HTTP: one question in, its steps and answer streamed back
// as server-sent events (agent/holo.py).

export type Hit = { id: string; title: string; score: number; ranks: Record<string, number> }
export type Step =
  | { stage: 'search'; ms: number; of: number; lists: Record<string, number>; hits: Hit[]; prepared: string | null; note: string | null }
  | { stage: 'draft'; ms: number; model: string; error?: string }
  | { stage: 'check'; ms: number; model: string; claims: number | null; cut: string[]; changed: boolean; error: string | null }
export type Answer = {
  text: string; used: string[]; cut: string[]; plain?: boolean; ms: number
  links: { to: string; label: string }[]; chips: { id: string; q: string }[]; matched: string | null
}
export type Turn = { q: string; a: string; used: string[] }

export async function ask(
  body: { q: string; history: Turn[]; asked: string[]; stop: string | null },
  onStep: (s: Step) => void,
  signal?: AbortSignal,
): Promise<Answer> {
  const r = await fetch('/api/ask', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
  })
  // 429 comes from Holo ({wait}) or from Vercel's firewall rule ({error}, per minute)
  if (r.status === 429) throw new Limit(await r.json().then(j => j.wait ?? 'a minute', () => 'a minute'))
  if (!r.ok || !r.body) throw new Error(`Holo's server answered ${r.status}`)
  const reader = r.body.getReader()
  const text = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += text.decode(value, { stream: true })
    let cut: number
    while ((cut = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, cut)
      buf = buf.slice(cut + 2)
      const event = /^event: (.*)$/m.exec(block)?.[1]
      const data = /^data: (.*)$/m.exec(block)?.[1]
      if (!event || !data) continue
      if (event === 'step') onStep(JSON.parse(data))
      if (event === 'answer') return JSON.parse(data)
    }
  }
  throw new Error('The answer stopped half way')
}

export class Limit extends Error {
  constructor(public wait: string) { super(`limit: ${wait}`) }
}
