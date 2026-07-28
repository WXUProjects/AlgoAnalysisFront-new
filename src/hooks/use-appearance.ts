import { useTheme } from 'next-themes'
import { useBlogColorScheme } from '@/components/blog/blog-color-scheme'
import {
  normalizeColorScheme,
  type ColorSchemeMode,
} from '@/lib/color-scheme'

/**
 * Unified appearance API:
 * - On personal blog (BlogColorSchemeProvider): author default + visitor override
 * - Elsewhere: main-site next-themes (algo-cwux-theme)
 */
export function useAppearance(): {
  theme: ColorSchemeMode
  setTheme: (mode: string) => void
  resolvedTheme: 'light' | 'dark' | undefined
  /** True when controlling a personal blog surface. */
  isBlogScoped: boolean
} {
  const blog = useBlogColorScheme()
  const main = useTheme()

  if (blog) {
    return {
      theme: blog.theme,
      setTheme: blog.setTheme,
      resolvedTheme: blog.resolvedTheme,
      isBlogScoped: true,
    }
  }

  return {
    theme: normalizeColorScheme(main.theme),
    setTheme: (mode: string) => main.setTheme(normalizeColorScheme(mode)),
    resolvedTheme:
      main.resolvedTheme === 'dark'
        ? 'dark'
        : main.resolvedTheme === 'light'
          ? 'light'
          : undefined,
    isBlogScoped: false,
  }
}
