/**
 * Blog image policy: uploads are disabled; only external URL links.
 * Pure helpers — unit-tested, used by Markdown editor + cover field.
 */

export const BLOG_IMAGE_UPLOAD_HINT =
  '暂不支持上传图片，请插入图片链接，例如：![说明](https://example.com/pic.png)'

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
 * Always returns a markdown snippet + user-facing guidance (never an upload).
 */
export function blogImageToolbarAction(): {
  markdownSnippet: { before: string; after: string; placeholder: string }
  toastMessage: string
} {
  return {
    markdownSnippet: {
      before: '![',
      after: '](https://)',
      placeholder: '图片说明',
    },
    toastMessage: BLOG_IMAGE_UPLOAD_HINT,
  }
}

/** Reject file-based image upload attempts for blog surfaces. */
export function rejectBlogImageUpload(_file?: File | null): {
  ok: false
  message: string
} {
  return { ok: false, message: BLOG_IMAGE_UPLOAD_HINT }
}
