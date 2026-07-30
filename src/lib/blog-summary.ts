/**
 * 文章 / 题解简述：仅允许按正文自动生成，不允许用户手写。
 */

import { summarySourceFromMarkdown } from '@/lib/markdown'

export const DEFAULT_SUMMARY_MAX = 280
const ELLIPSIS = '…'

/** 从正文生成列表简述：剥 MD 语法，保留 `$公式$`，截断到上限。 */
export function generateDefaultSummary(content: string): string {
  let s = summarySourceFromMarkdown(content.replace(/\r\n/g, '\n'))
  s = s
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
    .trim()
  if (!s) return ''
  const runes = Array.from(s)
  if (runes.length <= DEFAULT_SUMMARY_MAX) return s
  const window = runes.slice(0, DEFAULT_SUMMARY_MAX)
  for (let i = window.length - 1; i >= DEFAULT_SUMMARY_MAX - 40 && i >= 0; i--) {
    if ('。！？；.!?;，,'.includes(window[i]!)) {
      return window.slice(0, i + 1).join('') + ELLIPSIS
    }
  }
  return window.join('') + ELLIPSIS
}
