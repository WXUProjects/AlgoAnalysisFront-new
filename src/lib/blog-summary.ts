/**
 * Default 简述 for blog / solution articles.
 * Pure helpers — editor leaves field empty when summary is system default;
 * save regenerates when user leaves summary blank.
 */

export const DEFAULT_SUMMARY_MAX = 280
const ELLIPSIS = '…'

/** Strip fenced code + light markdown noise, collapse whitespace, truncate. */
export function generateDefaultSummary(content: string): string {
  let s = content.replace(/\r\n/g, '\n')
  s = stripFencedCodeBlocks(s)
  s = stripMarkdownNoise(s)
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

/** True when empty or equals regenerate(content). */
export function isDefaultSummary(summary: string, content: string): boolean {
  const sum = summary.trim()
  if (!sum) return true
  return sum === generateDefaultSummary(content)
}

/** Empty user input → regenerate; otherwise keep custom text. */
export function resolveSummaryForSave(
  userSummary: string,
  content: string,
): string {
  if (!userSummary.trim()) return generateDefaultSummary(content)
  return userSummary.trim()
}

function stripFencedCodeBlocks(s: string): string {
  const lines = s.split('\n')
  const out: string[] = []
  let inFence = false
  for (const line of lines) {
    const trim = line.trim()
    if (trim.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    out.push(line)
  }
  return out.join('\n')
}

function stripMarkdownNoise(s: string): string {
  let out = s
  // images ![alt](url) → alt
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  // links [label](url) → label
  out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  return out
    .split('\n')
    .map((line) => {
      let t = line.trim().replace(/^#+\s*/, '')
      if (t.startsWith('- ') || t.startsWith('* ')) t = t.slice(2).trim()
      return t
    })
    .join('\n')
}
