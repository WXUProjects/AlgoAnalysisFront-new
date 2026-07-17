/**
 * Blog navigation helpers.
 *
 * Rules:
 * - Main site → personal blog (`/blog/:user…`) or blog admin: open a **new tab**
 * - Blog reading shell → admin/settings: open a **new tab**
 * - Admin/settings → open blog / back to main site: **same tab**
 */

export const BLOG_NEW_TAB_PROPS = {
  target: '_blank' as const,
  rel: 'noopener noreferrer',
}

/** True for personal blog reading/admin paths (not plaza). */
export function isBlogPath(path: string): boolean {
  return /^\/blog\/[^/]+/.test(path)
}

/** True for blog manage / editor paths. */
export function isBlogManagePath(path: string): boolean {
  return /^\/blog\/[^/]+\/manage(\/|$)/.test(path)
}

/** Open a blog URL in a new tab (same-origin path or absolute). */
export function openBlogInNewTab(path: string) {
  if (typeof window === 'undefined') return
  const url = path.startsWith('http') ? path : path
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** Estimate reading minutes from markdown/plain text (Chirpy-style). */
export function estimateReadMinutes(content?: string): number {
  if (!content) return 1
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/[#>*_\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  // Chinese ~300 chars/min, English ~200 words/min; mix: count CJK + words
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const words = text
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  const minutes = Math.ceil(cjk / 300 + words / 200)
  return Math.max(1, minutes)
}

export type TocItem = {
  id: string
  text: string
  level: number
  /** bold-fallback items need DOM id injection after render */
  source?: 'heading' | 'bold' | 'title'
}

function slugifyToc(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  return base || 'section'
}

/**
 * Build article outline for the right panel「文章内容」.
 * Prefer ATX headings; if none, promote standalone **bold** lines (common in 题解).
 */
export function buildArticleOutline(
  md?: string,
  fallbackTitle?: string,
): TocItem[] {
  if (!md?.trim()) {
    if (fallbackTitle) {
      return [{ id: 'article-top', text: fallbackTitle, level: 1, source: 'title' }]
    }
    return []
  }
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const headings: TocItem[] = []
  const bolds: TocItem[] = []
  const used = new Map<string, number>()
  const assignId = (text: string) => {
    const base = slugifyToc(text)
    const n = used.get(base) ?? 0
    used.set(base, n + 1)
    return n === 0 ? base : `${base}-${n}`
  }
  let inFence = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^(`{3,}|~{3,})/.test(trimmed)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const hm = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (hm) {
      const text = hm[2]
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_~]+/g, '')
        .trim()
      if (text) {
        headings.push({
          id: assignId(text),
          text,
          level: hm[1].length,
          source: 'heading',
        })
      }
      continue
    }
    // standalone bold line: **小节标题**
    const bm = /^\*\*(.+?)\*\*\s*$/.exec(trimmed)
    if (bm) {
      const text = bm[1].replace(/[*_`]/g, '').trim()
      if (text && text.length <= 80) {
        bolds.push({
          id: assignId(text),
          text,
          level: 2,
          source: 'bold',
        })
      }
    }
  }
  const top: TocItem[] = fallbackTitle
    ? [{ id: 'article-top', text: fallbackTitle, level: 1, source: 'title' }]
    : []
  if (headings.length > 0) {
    // Keep page title as first jump target when body starts with h2+
    return top.length && headings[0].level > 1
      ? [...top, ...headings]
      : headings
  }
  if (bolds.length > 0) return [...top, ...bolds]
  return top
}

/**
 * After markdown HTML is in DOM, ensure outline anchors exist
 * (especially for bold-fallback sections).
 */
export function ensureOutlineAnchors(
  root: HTMLElement | null,
  items: TocItem[],
) {
  if (!root || items.length === 0) return
  // headings already get ids from markdown renderer — re-sync if missing
  const headings = Array.from(
    root.querySelectorAll('h1,h2,h3,h4,h5,h6'),
  ) as HTMLElement[]
  for (const item of items) {
    if (item.source === 'title' || item.id === 'article-top') continue
    if (document.getElementById(item.id)) continue
    const matchH = headings.find(
      (h) => (h.textContent || '').replace(/\s+/g, ' ').trim() === item.text,
    )
    if (matchH) {
      matchH.id = item.id
      matchH.classList.add('scroll-mt-24')
      continue
    }
    if (item.source !== 'bold') continue
    // p whose text is exactly the bold title
    const blocks = Array.from(
      root.querySelectorAll('p, li, strong'),
    ) as HTMLElement[]
    for (const el of blocks) {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (t !== item.text) continue
      const target =
        el.tagName === 'STRONG'
          ? (el.closest('p') as HTMLElement | null) || el
          : el
      if (!target.id) {
        target.id = item.id
        target.classList.add('scroll-mt-24')
      }
      break
    }
  }
}
