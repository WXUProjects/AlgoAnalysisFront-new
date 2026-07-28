import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyDocumentColorScheme,
  getMainSiteColorScheme,
  normalizeColorScheme,
  resolveBlogColorScheme,
  resolveColorScheme,
  setBlogVisitorColorScheme,
  type ColorSchemeMode,
} from '@/lib/color-scheme'

type BlogColorSchemeContextValue = {
  /** Effective mode (visitor override or author default). */
  theme: ColorSchemeMode
  /** Author's saved default (no visitor override). */
  authorDefault: ColorSchemeMode
  /** Resolved light|dark after system preference. */
  resolvedTheme: 'light' | 'dark'
  /** Visitor picks a mode; persists per blog username. */
  setTheme: (mode: ColorSchemeMode | string) => void
  username: string
}

const BlogColorSchemeContext =
  createContext<BlogColorSchemeContextValue | null>(null)

/**
 * Blog-scoped appearance: author default + optional visitor override.
 * Applies class on <html> while mounted; restores main-site theme on leave.
 * Does not write to the main-site next-themes storage key.
 */
export function BlogColorSchemeProvider({
  username,
  authorDefault,
  children,
}: {
  username: string
  /** From API `colorScheme`; empty → system. */
  authorDefault?: string | null
  children: ReactNode
}) {
  const author = normalizeColorScheme(authorDefault)
  const [visitorTick, setVisitorTick] = useState(0)
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const theme = useMemo(() => {
    void visitorTick
    return resolveBlogColorScheme({
      username,
      authorDefault: author,
    })
  }, [username, author, visitorTick])

  const resolvedTheme = resolveColorScheme(theme, systemDark)

  const setTheme = useCallback(
    (mode: ColorSchemeMode | string) => {
      const next = normalizeColorScheme(mode)
      setBlogVisitorColorScheme(username, next)
      setVisitorTick((n) => n + 1)
    },
    [username],
  )

  // Apply while on this blog; restore main site when leaving.
  // Re-assert if main-site next-themes also toggles <html class>.
  useEffect(() => {
    applyDocumentColorScheme(theme)
    const wantDark = () => resolveColorScheme(theme, systemDark) === 'dark'
    const ensure = () => {
      const hasDark = document.documentElement.classList.contains('dark')
      if (hasDark !== wantDark()) applyDocumentColorScheme(theme)
    }
    const obs = new MutationObserver(ensure)
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => {
      obs.disconnect()
      applyDocumentColorScheme(getMainSiteColorScheme())
    }
  }, [theme, systemDark])

  // System preference changes while mode is system.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const value = useMemo(
    () => ({
      theme,
      authorDefault: author,
      resolvedTheme,
      setTheme,
      username,
    }),
    [theme, author, resolvedTheme, setTheme, username],
  )

  return (
    <BlogColorSchemeContext.Provider value={value}>
      {children}
    </BlogColorSchemeContext.Provider>
  )
}

export function useBlogColorScheme(): BlogColorSchemeContextValue | null {
  return useContext(BlogColorSchemeContext)
}
