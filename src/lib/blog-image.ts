/**
 * Blog image policy helpers — link-only by default; upload when authorized.
 * Pure helpers — unit-tested, used by Markdown editor + cover field.
 */

export const BLOG_IMAGE_UPLOAD_HINT =
  '暂不支持上传图片，请插入图片链接，例如：![说明](https://example.com/pic.png)'

export const BLOG_IMAGE_UPLOAD_ENABLED_HINT =
  '可粘贴或点工具栏上传图片；也支持外链。定宽写法：![说明|550](url)'

/** Whether a cover/image value is an allowed external http(s) URL. */
export function isAllowedBlogImageUrl(value: string): boolean {
  const v = (value || '').trim()
  if (!v) return true // empty = no cover
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Resolve toolbar image action for blog compose.
 * When uploadEnabled, returns null snippet so the editor opens file picker instead.
 */
export function blogImageToolbarAction(opts?: { uploadEnabled?: boolean }): {
  markdownSnippet: { before: string; after: string; placeholder: string }
  toastMessage: string
  /** true → editor should open file picker / upload path */
  preferUpload: boolean
} {
  if (opts?.uploadEnabled) {
    return {
      markdownSnippet: {
        before: '![',
        after: '](https://)',
        placeholder: '图片说明',
      },
      toastMessage: BLOG_IMAGE_UPLOAD_ENABLED_HINT,
      preferUpload: true,
    }
  }
  return {
    markdownSnippet: {
      before: '![',
      after: '](https://)',
      placeholder: '图片说明',
    },
    toastMessage: BLOG_IMAGE_UPLOAD_HINT,
    preferUpload: false,
  }
}

/** Reject file-based image upload attempts for blog surfaces when not allowed. */
export function rejectBlogImageUpload(
  _file?: File | null,
  opts?: { uploadEnabled?: boolean },
): { ok: false; message: string } | { ok: true } {
  if (opts?.uploadEnabled) return { ok: true }
  return { ok: false, message: BLOG_IMAGE_UPLOAD_HINT }
}

/** Build markdown image line; optional Obsidian width. */
export function markdownImageSnippet(
  url: string,
  alt = '图片',
  width?: number,
): string {
  const safeUrl = (url || '').trim()
  const safeAlt = (alt || '图片').replace(/[[\]]/g, '')
  if (width && width > 0) {
    return `![${safeAlt}|${Math.round(width)}](${safeUrl})`
  }
  return `![${safeAlt}](${safeUrl})`
}

/** Markdown image token: ![alt|WxH?](url) — factory avoids global lastIndex bugs. */
function mdImageRe() {
  return /!\[([^\]]*)]\(\s*<?([^)\s>]+)>?\s*(?:["'][^"']*["'])?\s*\)/g
}

function htmlImgRe() {
  return /<img[^>]+src=["']([^"']+)["']/gi
}

/** Collect unique http(s) image URLs from markdown body (+ optional cover). */
export function extractMarkdownImageUrls(
  content: string,
  cover = '',
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (raw: string) => {
    const u = (raw || '').trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u)) return
    if (seen.has(u)) return
    seen.add(u)
    out.push(u)
  }
  add(cover)
  const md = content || ''
  for (const m of md.matchAll(mdImageRe())) {
    if (m[2]) add(m[2])
  }
  for (const m of md.matchAll(htmlImgRe())) {
    if (m[1]) add(m[1])
  }
  return out
}

/** True if url appears in content or cover (substring match on image src). */
export function isImageUsedInArticle(
  url: string,
  content: string,
  cover = '',
): boolean {
  const u = (url || '').trim()
  if (!u) return false
  if ((cover || '').includes(u)) return true
  return (content || '').includes(u)
}

/**
 * Rewrite width for the first markdown image whose URL equals `url`.
 * Uses Obsidian `![alt|W](url)` form; clears width when width <= 0.
 */
export function setMarkdownImageWidth(
  content: string,
  url: string,
  width: number,
): string {
  const target = (url || '').trim()
  if (!target || !content) return content
  let replaced = false
  return content.replace(mdImageRe(), (full, altRaw: string, href: string) => {
    if (replaced) return full
    if ((href || '').trim() !== target) return full
    replaced = true
    const altBase = String(altRaw ?? '').replace(/\|\d{1,5}(?:x\d{1,5})?\s*$/i, '')
    const w = Math.round(width)
    if (w > 0) {
      return `![${altBase}|${w}](${href})`
    }
    return `![${altBase}](${href})`
  })
}

export type BlogSessionImage = {
  id: string
  url: string
  name: string
  /** Uploaded in this edit session (vs already in content). */
  fromUpload: boolean
}
