import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'yx-theme'

const read = (): Theme => (document.documentElement.dataset.theme as Theme) || 'dark'
const subs = new Set<() => void>()

export function initTheme() {
  const saved = localStorage.getItem(KEY) as Theme | null
  const prefers = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  document.documentElement.dataset.theme = saved ?? prefers
}

export function toggleTheme() {
  const next: Theme = read() === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  localStorage.setItem(KEY, next)
  subs.forEach(f => f())
}

export const useTheme = () =>
  useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, read)

// DotGrid takes hex colours, so it reads them from the active tokens.
export const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
