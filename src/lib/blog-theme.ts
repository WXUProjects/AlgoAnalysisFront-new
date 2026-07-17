/**
 * Blog custom-theme extension points (reserved).
 * Default: main-site tokens only. Custom theme is off unless backend enables it.
 */

export type BlogThemeTokens = {
  /** CSS variable overrides, e.g. { '--primary': '…' } */
  cssVars?: Record<string, string>
  /** Optional accent class names (future) */
  classNames?: {
    shell?: string
    article?: string
  }
}

export type BlogThemeContext = {
  /** Backend flag: custom theme capability open for this blog owner */
  enabled: boolean
  /** Resolved custom theme payload (null when disabled / not set) */
  customTheme: BlogThemeTokens | null
  /** Always true for the default path — main-site semantic tokens */
  useMainSiteTokens: boolean
}

/**
 * Resolve theme for rendering a blog surface.
 * When not enabled, always returns main-site defaults (no custom payload).
 */
export function resolveBlogTheme(input: {
  enabled?: boolean
  customTheme?: BlogThemeTokens | null
}): BlogThemeContext {
  const enabled = Boolean(input.enabled)
  if (!enabled) {
    return {
      enabled: false,
      customTheme: null,
      useMainSiteTokens: true,
    }
  }
  // Capability open but user theme store not shipped yet — still main-site tokens.
  return {
    enabled: true,
    customTheme: input.customTheme ?? null,
    useMainSiteTokens: !input.customTheme,
  }
}

/**
 * Apply reserved CSS vars onto a style object when a custom theme is active.
 * No-op when disabled or empty.
 */
export function blogThemeStyle(
  ctx: BlogThemeContext,
): Record<string, string> | undefined {
  if (!ctx.enabled || !ctx.customTheme?.cssVars) return undefined
  return { ...ctx.customTheme.cssVars }
}
