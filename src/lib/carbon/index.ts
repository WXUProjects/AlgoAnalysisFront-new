export { THEMES, FONTS, getTheme, type Theme, type ThemeHighlights } from './themes'
export {
  highlightCode,
  inlineHighlightColors,
  escapeHtml,
} from './highlight'
export {
  exportCarbonPng,
  downloadDataUrl,
  copyDataUrlToClipboard,
  type ExportPngOptions,
} from './export'

export function dedent(code: string): string {
  const lines = code.replace(/\r\n/g, '\n').split('\n')
  const nonEmpty = lines.filter((l) => l.trim().length > 0)
  if (nonEmpty.length === 0) return code

  let minIndent = Infinity
  for (const line of nonEmpty) {
    const match = line.match(/^(\s*)/)
    const indent = match ? match[1].length : 0
    if (indent < minIndent) minIndent = indent
  }
  if (minIndent === 0 || minIndent === Infinity) return lines.join('\n')

  return lines
    .map((line) => (line.trim().length === 0 ? '' : line.slice(minIndent)))
    .join('\n')
}

export const CARBON_LANGUAGES: { value: string; label: string }[] = [
  { value: 'auto', label: '自动识别' },
  { value: 'plaintext', label: '纯文本' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'scala', label: 'Scala' },
  { value: 'lua', label: 'Lua' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'haskell', label: 'Haskell' },
]

export function languageLabel(value: string): string {
  return (
    CARBON_LANGUAGES.find((l) => l.value === value)?.label || value || '纯文本'
  )
}

export type CarbonUiSettings = {
  theme: string
  backgroundColor: string
  paddingVertical: number
  paddingHorizontal: number
  fontFamily: string
  fontSize: number
  lineHeight: number
  windowControls: boolean
  windowTheme: 'none' | 'sharp' | 'bw'
  dropShadow: boolean
  lineNumbers: boolean
  widthAdjustment: boolean
  width: number
  exportScale: 1 | 2 | 4
  language: string
}

export const DEFAULT_CARBON_SETTINGS: CarbonUiSettings = {
  theme: 'dark-modern',
  backgroundColor: 'rgba(171, 184, 195, 1)',
  paddingVertical: 56,
  paddingHorizontal: 56,
  fontFamily: 'JetBrains Mono',
  fontSize: 14,
  lineHeight: 133,
  windowControls: true,
  windowTheme: 'none',
  dropShadow: true,
  lineNumbers: false,
  widthAdjustment: true,
  width: 680,
  exportScale: 2,
  language: 'auto',
}

const BG_PRESETS = [
  'rgba(171, 184, 195, 1)',
  'rgba(255, 255, 255, 1)',
  'rgba(30, 30, 30, 1)',
  'rgba(52, 152, 219, 1)',
  'rgba(155, 89, 182, 1)',
  'rgba(46, 204, 113, 1)',
  'rgba(231, 76, 60, 1)',
  'rgba(241, 196, 15, 1)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
]

export { BG_PRESETS }
