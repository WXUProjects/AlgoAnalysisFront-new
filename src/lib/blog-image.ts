/**
 * Blog image policy helpers — link-only by default; upload when authorized.
 * Pure helpers — unit-tested, used by Markdown editor + cover field.
 */

import {
  formatObsidianImageAlt,
  parseObsidianImageAlt,
  type MarkdownImageAlign,
  type MarkdownImageLayout,
} from '@/lib/markdown'

export type { MarkdownImageAlign, MarkdownImageLayout }

export const BLOG_IMAGE_UPLOAD_HINT =
  '暂未开通图片上传，可申请权限或粘贴图片链接'

export const BLOG_IMAGE_UPLOAD_ENABLED_HINT =
  '可粘贴或上传图片；在预览图上可调整大小与对齐'

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

/** Build markdown image line; optional pixel / percent / align. */
export function markdownImageSnippet(
  url: string,
  alt = '图片',
  widthOrLayout?: number | Partial<Omit<MarkdownImageLayout, 'alt'>>,
): string {
  const safeUrl = (url || '').trim()
  const safeAlt = (alt || '图片').replace(/[[\]]/g, '')
  if (widthOrLayout == null) {
    return `![${safeAlt}](${safeUrl})`
  }
  if (typeof widthOrLayout === 'number') {
    if (widthOrLayout > 0) {
      return `![${formatObsidianImageAlt({ alt: safeAlt, width: widthOrLayout })}](${safeUrl})`
    }
    return `![${safeAlt}](${safeUrl})`
  }
  return `![${formatObsidianImageAlt({ alt: safeAlt, ...widthOrLayout })}](${safeUrl})`
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

/**
 * 本站又拍云上传路径：/blog/{userId}/filename.ext（任意 host）。
 * 外链（题图床、图床外链等）返回 false，不进「文章图片」栏。
 */
export function isBlogHostedUploadUrl(url: string): boolean {
  const u = (url || '').trim()
  if (!u) return false
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    return /\/blog\/\d+\/[^/?#]+$/i.test(parsed.pathname)
  } catch {
    return /\/blog\/\d+\/[^/?#\s]+/i.test(u)
  }
}

/** 正文第一张 http(s) 图（不含 cover 参数）。 */
export function firstContentImageUrl(content: string): string {
  const urls = extractMarkdownImageUrls(content, '')
  return urls[0] || ''
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

export type ImageLayoutPatch = {
  /** 像素宽；null 清除像素与百分比 */
  widthPx?: number | null
  /** 百分比 1–100；设置后清除像素宽 */
  widthPercent?: number | null
  /** left 视为默认（不写修饰符） */
  align?: MarkdownImageAlign | null
}

/**
 * 更新正文中第一个匹配 url 的图片修饰（宽/百分比/对齐）。
 * patch 字段未传则保留原值。
 */
export function updateMarkdownImageLayout(
  content: string,
  url: string,
  patch: ImageLayoutPatch,
): string {
  const target = (url || '').trim()
  if (!target || !content) return content
  let replaced = false
  return content.replace(mdImageRe(), (full, altRaw: string, href: string) => {
    if (replaced) return full
    if ((href || '').trim() !== target) return full
    replaced = true
    const cur = parseObsidianImageAlt(String(altRaw ?? ''))
    const next: MarkdownImageLayout = { alt: cur.alt }

    // 尺寸：显式 percent / px 优先；null 表示清除；未传则保留
    if (typeof patch.widthPercent === 'number' && patch.widthPercent > 0) {
      next.widthPercent = Math.min(100, Math.round(patch.widthPercent))
    } else if (typeof patch.widthPx === 'number' && patch.widthPx > 0) {
      next.width = Math.round(patch.widthPx)
      if (cur.height) next.height = cur.height
    } else if (patch.widthPercent === null || patch.widthPx === null) {
      // 清除尺寸
    } else {
      if (cur.widthPercent != null) next.widthPercent = cur.widthPercent
      else if (cur.width != null) {
        next.width = cur.width
        if (cur.height) next.height = cur.height
      }
    }

    if (patch.align !== undefined) {
      if (patch.align && patch.align !== 'left') next.align = patch.align
      // left / null → omit
    } else if (cur.align && cur.align !== 'left') {
      next.align = cur.align
    }

    const altStr = formatObsidianImageAlt(next)
    return `![${altStr}](${href})`
  })
}

/** @deprecated use updateMarkdownImageLayout */
export function setMarkdownImageWidth(
  content: string,
  url: string,
  width: number,
): string {
  return updateMarkdownImageLayout(content, url, {
    widthPx: width > 0 ? width : null,
  })
}

export type BlogSessionImage = {
  id: string
  url: string
  name: string
  /** Uploaded in this edit session (vs already in content). */
  fromUpload: boolean
  /** 服务端落库 content hash（SHA-256），与 GC / images/check 对齐 */
  hash?: string
}
