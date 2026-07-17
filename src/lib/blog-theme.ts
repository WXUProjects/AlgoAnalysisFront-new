/**
 * Blog shell themes.
 * - chirpy: default, 1:1 Chirpy (jekyll-theme-chirpy) layout
 * - simple: original shadcn top-bar shell（简约）
 * - mizuki: Material Design 3 inspired shell, adapted from
 *   https://github.com/LyraVoid/Mizuki （用户可选，非默认；动画轻度–中度）
 */

import type { BlogSocialLink, BlogThemeId } from '@shared/api'

export type { BlogSocialLink, BlogThemeId }

export const BLOG_THEME_IDS = ['chirpy', 'simple', 'mizuki'] as const

export const BLOG_THEME_META: Record<
  BlogThemeId,
  {
    id: BlogThemeId
    label: string
    description: string
    /** 主题来源说明（设置页展示） */
    credit?: string
    creditUrl?: string
  }
> = {
  chirpy: {
    id: 'chirpy',
    label: 'Chirpy',
    description: '左侧栏 + 文章卡片，经典技术博客风格',
  },
  simple: {
    id: 'simple',
    label: '简约',
    description: '顶栏导航 + 卡片列表，贴近主站风格',
  },
  mizuki: {
    id: 'mizuki',
    label: 'Mizuki',
    description:
      '毛玻璃顶栏 + 渐变横幅 + 圆角卡片，Material Design 3 气质（动画轻度）',
    credit: 'LyraVoid/Mizuki',
    creditUrl: 'https://github.com/LyraVoid/Mizuki',
  },
}

export const DEFAULT_BLOG_THEME_ID: BlogThemeId = 'chirpy'

export type BlogThemeTokens = {
  /** CSS variable overrides, e.g. { '--primary': '…' } */
  cssVars?: Record<string, string>
  classNames?: {
    shell?: string
    article?: string
  }
}

export type BlogThemeContext = {
  /** Resolved shell theme id */
  themeId: BlogThemeId
  /** Sidebar subtitle (Chirpy / Mizuki) */
  subtitle: string
  /** Bottom-left / profile social links */
  socialLinks: BlogSocialLink[]
  /** Legacy admin flag for free-form custom CSS (unused by shells) */
  enabled: boolean
  /** Reserved free-form payload */
  customTheme: BlogThemeTokens | null
  /** simple theme uses main-site semantic tokens */
  useMainSiteTokens: boolean
}

export function normalizeBlogThemeId(raw?: string | null): BlogThemeId {
  const v = (raw || '').trim().toLowerCase()
  if (v === 'simple') return 'simple'
  if (v === 'mizuki') return 'mizuki'
  return 'chirpy'
}

export function normalizeSocialLinks(
  raw: unknown,
): BlogSocialLink[] {
  if (!Array.isArray(raw)) return []
  const out: BlogSocialLink[] = []
  for (const rawItem of raw) {
    if (!rawItem || typeof rawItem !== 'object') continue
    const o = rawItem as Record<string, unknown>
    const type = String(o.type || '').trim().toLowerCase()
    const url = String(o.url || '').trim()
    if (!type || !url) continue
    const labelRaw = o.label != null ? String(o.label).trim() : ''
    const link: BlogSocialLink = { type, url }
    if (labelRaw) link.label = labelRaw
    out.push(link)
    if (out.length >= 12) break
  }
  return out
}

/**
 * Resolve theme for rendering a blog surface.
 * Chirpy is the default for all blogs.
 */
export function resolveBlogTheme(input: {
  themeId?: string | null
  subtitle?: string | null
  socialLinks?: BlogSocialLink[] | null
  enabled?: boolean
  customTheme?: BlogThemeTokens | null
}): BlogThemeContext {
  const themeId = normalizeBlogThemeId(input.themeId)
  const enabled = Boolean(input.enabled)
  const customTheme =
    enabled && input.customTheme ? input.customTheme : null
  return {
    themeId,
    subtitle: (input.subtitle || '').trim(),
    socialLinks: normalizeSocialLinks(input.socialLinks ?? []),
    enabled,
    customTheme,
    useMainSiteTokens: themeId === 'simple' && !customTheme,
  }
}

/**
 * Apply reserved CSS vars onto a style object when a custom theme is active.
 */
export function blogThemeStyle(
  ctx: BlogThemeContext,
): Record<string, string> | undefined {
  if (!ctx.customTheme?.cssVars) return undefined
  return { ...ctx.customTheme.cssVars }
}

/** Known social icon keys → display hint */
export const SOCIAL_LINK_PRESETS: {
  type: string
  label: string
  placeholder: string
}[] = [
  { type: 'github', label: 'GitHub', placeholder: 'https://github.com/you' },
  { type: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/you' },
  { type: 'email', label: '邮箱', placeholder: 'mailto:you@example.com' },
  { type: 'rss', label: 'RSS', placeholder: 'https://…/feed.xml' },
  { type: 'bilibili', label: 'Bilibili', placeholder: 'https://space.bilibili.com/…' },
  { type: 'zhihu', label: '知乎', placeholder: 'https://www.zhihu.com/people/…' },
  { type: 'custom', label: '自定义链接', placeholder: 'https://…' },
]
