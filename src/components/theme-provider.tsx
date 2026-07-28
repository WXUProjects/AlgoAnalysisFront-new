import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { MAIN_SITE_THEME_STORAGE_KEY } from '@/lib/color-scheme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={MAIN_SITE_THEME_STORAGE_KEY}
    >
      {children}
    </NextThemesProvider>
  )
}
