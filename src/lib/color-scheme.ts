/**
 * Site / blog appearance modes (next-themes + blog-scoped provider).
 * - light / dark: manual
 * - system: follow OS prefers-color-scheme (adaptive)
 *
 * Blog author default is stored server-side as `colorScheme`.
 * Visitor override is per-blog in localStorage; does not change author default.
 */

import { safeLocalStorage } from '@/lib/safe-storage'

export type ColorSchemeMode = 'light' | 'dark' | 'system'

/** Main-site next-themes storage key (ThemeProvider). */
export const MAIN_SITE_THEME_STORAGE_KEY = 'algo-cwux-theme'

/** Cycle order used by compact icon buttons (Chirpy / Mizuki). */
export const COLOR_SCHEME_ORDER: readonly ColorSchemeMode[] = [
  'light',
  'dark',
  'system',
] as const

export const COLOR_SCHEME_OPTIONS: readonly {
  id: ColorSchemeMode
  /** Short label in menus / status */
  label: string
  /** Full description for helper text */
  description: string
}[] = [
  {
    id: 'light',
    label: '浅色',
    description: '一直用浅色外观',
  },
  {
    id: 'dark',
    label: '深色',
    description: '一直用深色外观',
  },
  {
    id: 'system',
    label: '跟随系统',
    description: '跟着设备深浅自动切',
  },
] as const

export function normalizeColorScheme(
  raw?: string | null,
): ColorSchemeMode {
  const v = (raw || '').trim().toLowerCase()
  if (v === 'light' || v === 'dark' || v === 'system') return v
  if (v === 'auto') return 'system'
  return 'system'
}

/** Next mode when cycling light → dark → system → light. */
export function nextColorScheme(
  current?: string | null,
): ColorSchemeMode {
  const cur = normalizeColorScheme(current)
  const i = COLOR_SCHEME_ORDER.indexOf(cur)
  const idx = i < 0 ? 0 : (i + 1) % COLOR_SCHEME_ORDER.length
  return COLOR_SCHEME_ORDER[idx]!
}

export function colorSchemeLabel(mode?: string | null): string {
  const id = normalizeColorScheme(mode)
  return COLOR_SCHEME_OPTIONS.find((o) => o.id === id)?.label ?? '跟随系统'
}

/** Accessible label for the control (current selection). */
export function colorSchemeControlLabel(mode?: string | null): string {
  return `外观：${colorSchemeLabel(mode)}`
}

/** Hint for cycle buttons: what the next click will do. */
export function colorSchemeCycleHint(mode?: string | null): string {
  const next = nextColorScheme(mode)
  return `现在是${colorSchemeLabel(mode)}，点一下切成${colorSchemeLabel(next)}`
}

/** Resolve light|dark from mode + current OS preference. */
export function resolveColorScheme(
  mode?: string | null,
  systemDark?: boolean,
): 'light' | 'dark' {
  const m = normalizeColorScheme(mode)
  if (m === 'light' || m === 'dark') return m
  if (typeof systemDark === 'boolean') return systemDark ? 'dark' : 'light'
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function blogVisitorColorStorageKey(username: string): string {
  return `algo-blog-color:${(username || '').trim().toLowerCase()}`
}

/** Visitor's manual choice for this blog; null = use author default. */
export function getBlogVisitorColorScheme(
  username: string,
): ColorSchemeMode | null {
  if (!username) return null
  const raw = safeLocalStorage.get(blogVisitorColorStorageKey(username))
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return null
}

export function setBlogVisitorColorScheme(
  username: string,
  mode: ColorSchemeMode,
): void {
  if (!username) return
  safeLocalStorage.set(
    blogVisitorColorStorageKey(username),
    normalizeColorScheme(mode),
  )
}

/**
 * Effective mode for a blog surface:
 * visitor override → author default → system.
 */
export function resolveBlogColorScheme(input: {
  username?: string | null
  authorDefault?: string | null
}): ColorSchemeMode {
  const u = (input.username || '').trim()
  if (u) {
    const visitor = getBlogVisitorColorScheme(u)
    if (visitor) return visitor
  }
  return normalizeColorScheme(input.authorDefault)
}

/** Read main-site saved theme (for restoring after leaving a blog). */
export function getMainSiteColorScheme(): ColorSchemeMode {
  return normalizeColorScheme(
    safeLocalStorage.get(MAIN_SITE_THEME_STORAGE_KEY),
  )
}

/** Apply light/dark class on <html> (blog-scoped while mounted). */
export function applyDocumentColorScheme(mode: ColorSchemeMode): void {
  if (typeof document === 'undefined') return
  const resolved = resolveColorScheme(mode)
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}
