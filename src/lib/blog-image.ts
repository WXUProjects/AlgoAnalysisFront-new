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
