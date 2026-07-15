import type { CSSProperties } from 'react'

/** highlight.js 加载与语言映射（编辑器 / 查看共用） */

let hljsPromise: Promise<typeof import('highlight.js').default> | null = null

export async function loadHljs() {
  if (!hljsPromise) {
    hljsPromise = import('highlight.js').then((m) => m.default)
  }
  return hljsPromise
}

export function mapHljsLang(lang: string): string {
  const l = (lang || 'text').toLowerCase()
  const map: Record<string, string> = {
    text: 'plaintext',
    plain: 'plaintext',
    plaintext: 'plaintext',
    cpp: 'cpp',
    c: 'c',
    csharp: 'csharp',
    cs: 'csharp',
    py: 'python',
    python: 'python',
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    go: 'go',
    golang: 'go',
    sh: 'bash',
    shell: 'bash',
    bash: 'bash',
    yml: 'yaml',
    yaml: 'yaml',
    md: 'markdown',
    markdown: 'markdown',
    rs: 'rust',
    rust: 'rust',
    kt: 'kotlin',
    kotlin: 'kotlin',
    proto: 'protobuf',
    protobuf: 'protobuf',
    objectivec: 'objectivec',
    'objective-c': 'objectivec',
    asm: 'x86asm',
    assembly: 'x86asm',
  }
  return map[l] || l
}

export function highlightWith(
  hljs: Awaited<ReturnType<typeof loadHljs>>,
  code: string,
  language?: string,
): string {
  const lang = mapHljsLang(language || 'text')
  try {
    const useLang =
      lang === 'plaintext' || !hljs.getLanguage(lang) ? 'plaintext' : lang
    return hljs.highlight(code, { language: useLang }).value
  } catch {
    return escapeHtml(code)
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 与 textarea 完全一致的排版（避免光标偏移） */
export const CODE_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'

export const CODE_TEXT_STYLE: CSSProperties = {
  fontFamily: CODE_FONT,
  fontSize: '13px',
  lineHeight: '20px',
  letterSpacing: '0px',
  tabSize: 2,
  whiteSpace: 'pre',
  wordBreak: 'normal',
  overflowWrap: 'normal',
  fontVariantLigatures: 'none',
}
