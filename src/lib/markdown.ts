import { marked, type Tokens } from 'marked'
import katex from 'katex'
import TurndownService from 'turndown'
import 'katex/dist/katex.min.css'
import { highlightWith, loadHljs, mapHljsLang } from '@/lib/code-hl'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const PLACEHOLDER_PREFIX = '@@MATH'
const PLACEHOLDER_SUFFIX = '@@'

type MathPiece = { display: boolean; tex: string }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function extractMath(src: string): { text: string; pieces: MathPiece[] } {
  const pieces: MathPiece[] = []
  let text = src

  // 块级 $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => {
    const i = pieces.length
    pieces.push({ display: true, tex: tex.trim() })
    return `${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`
  })

  // 行内 $...$（避免 $$）
  text = text.replace(/\$((?:\\.|[^$\\])+?)\$/g, (_, tex: string) => {
    const i = pieces.length
    pieces.push({ display: false, tex: tex.trim() })
    return `${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`
  })

  // \( ... \) / \[ ... \]
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, tex: string) => {
    const i = pieces.length
    pieces.push({ display: false, tex: tex.trim() })
    return `${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`
  })
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex: string) => {
    const i = pieces.length
    pieces.push({ display: true, tex: tex.trim() })
    return `${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`
  })

  return { text, pieces }
}

function renderKatex(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
      output: 'html',
    })
  } catch {
    const esc = escapeHtml(tex)
    return display
      ? `<pre class="math-fallback">${esc}</pre>`
      : `<code class="math-fallback">${esc}</code>`
  }
}

function restoreMath(html: string, pieces: MathPiece[]): string {
  return html.replace(
    new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, 'g'),
    (_, idx: string) => {
      const p = pieces[Number(idx)]
      if (!p) return ''
      return renderKatex(p.tex, p.display)
    },
  )
}

/** 公告 HTML / Markdown 共用 allowlist 消毒。 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  if (typeof document === 'undefined') return escapeHtml(html)

  const allowedTags = new Set([
    'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'details', 'div',
    'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'kbd',
    'li', 'ol', 'p', 'pre', 's', 'span', 'strong', 'sub', 'summary', 'sup',
    'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
  ])
  const dropWithContent = new Set([
    'base', 'button', 'embed', 'form', 'iframe', 'input', 'link', 'math',
    'meta', 'object', 'script', 'style', 'svg', 'template', 'textarea',
  ])
  const doc = document.implementation.createHTMLDocument('')
  doc.body.innerHTML = html

  const safeURL = (value: string, image: boolean): boolean => {
    const normalized = Array.from(value)
      .filter((character) => character.charCodeAt(0) > 0x20)
      .join('')
      .toLowerCase()
    if (!normalized) return false
    if (/^(javascript|vbscript|data|file|blob):/.test(normalized)) return false
    if (/^(https?:)?\/\//.test(normalized)) return true
    if (!image && /^(mailto|tel):/.test(normalized)) return true
    if (!normalized.includes(':')) return true
    return /^(#|\?|\.\.\/|\.\/|\/)/.test(normalized)
  }

  for (const el of Array.from(doc.body.querySelectorAll('*'))) {
    if (!el.isConnected) continue
    const tag = el.tagName.toLowerCase()
    if (!allowedTags.has(tag)) {
      if (dropWithContent.has(tag)) el.remove()
      else el.replaceWith(...Array.from(el.childNodes))
      continue
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const allowed =
        name === 'title' ||
        name === 'class' ||
        name === 'aria-hidden' ||
        (tag === 'a' && ['href', 'target', 'rel'].includes(name)) ||
        (tag === 'img' && ['src', 'alt', 'width', 'height', 'loading'].includes(name)) ||
        (['td', 'th'].includes(tag) && ['colspan', 'rowspan', 'align'].includes(name)) ||
        (name === 'style' && Boolean(el.closest('.katex')))
      if (!allowed || name.startsWith('on') || name.startsWith('data-')) {
        el.removeAttribute(attr.name)
      }
    }

    if (tag === 'a') {
      const href = el.getAttribute('href') || ''
      if (!safeURL(href, false)) el.removeAttribute('href')
      if (el.getAttribute('target') === '_blank') {
        el.setAttribute('rel', 'noopener noreferrer')
      } else {
        el.removeAttribute('target')
        el.removeAttribute('rel')
      }
    }
    if (tag === 'img') {
      const src = el.getAttribute('src') || ''
      if (!safeURL(src, true)) el.remove()
      else el.setAttribute('loading', 'lazy')
    }
    if (el.hasAttribute('style')) {
      const declarations = (el.getAttribute('style') || '').split(';')
      const safeDeclarations = declarations.filter((declaration) => {
        const [property, ...rest] = declaration.split(':')
        const value = rest.join(':').trim().toLowerCase()
        const safeProperty = /^(height|width|min-width|top|left|margin(?:-right)?|vertical-align|font-size|position)$/
        const safeValue = /^-?(?:\d+|\d*\.\d+)(?:em|ex|rem|px|%)?$|^relative$/
        return safeProperty.test(property.trim().toLowerCase()) && safeValue.test(value)
      })
      if (safeDeclarations.length) el.setAttribute('style', safeDeclarations.join(';'))
      else el.removeAttribute('style')
    }
  }

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT)
  const comments: Comment[] = []
  while (walker.nextNode()) comments.push(walker.currentNode as Comment)
  comments.forEach((comment) => comment.remove())
  return doc.body.innerHTML
}

let rendererReady = false
let hljsReady: Awaited<ReturnType<typeof loadHljs>> | null = null

/**
 * 将高亮 HTML 按行拆开，并为跨行 span 补齐开闭标签，
 * 使每行可独立包进带行号的结构。
 */
function linesWithBalancedSpans(highlighted: string): string[] {
  const rawLines = highlighted.split('\n')
  const openTags: string[] = []
  const out: string[] = []

  for (const rawLine of rawLines) {
    const prefix = openTags.join('')
    const stack = openTags.slice()
    const re = /<\/?span\b[^>]*>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(rawLine)) !== null) {
      const tag = m[0]
      if (/^<\//.test(tag)) stack.pop()
      else stack.push(tag)
    }
    const suffix = '</span>'.repeat(stack.length)
    out.push(prefix + rawLine + suffix)
    openTags.length = 0
    openTags.push(...stack)
  }
  return out
}

/** Carbon 风格代码块：边框 + 行号 + 可选语言标签 */
function formatFencedCodeBlock(
  highlighted: string,
  langClass: string,
  language: string,
): string {
  const lines = linesWithBalancedSpans(highlighted)
  const rows = lines
    .map((line, i) => {
      const src = line.length ? line : ' '
      return (
        `<span class="md-code-row">` +
        `<span class="md-code-ln" aria-hidden="true">${i + 1}</span>` +
        `<span class="md-code-src">${src}</span>` +
        `</span>`
      )
    })
    .join('')
  const label =
    language && language.toLowerCase() !== 'text' && language.toLowerCase() !== 'plaintext'
      ? `<div class="md-code-header"><span class="md-code-dots" aria-hidden="true"></span><span class="md-code-lang">${escapeHtml(language)}</span></div>`
      : `<div class="md-code-header"><span class="md-code-dots" aria-hidden="true"></span></div>`
  return (
    `<div class="md-code-block">` +
    label +
    `<pre class="code-hl"><code class="hljs${langClass}">${rows}</code></pre>` +
    `</div>\n`
  )
}

function ensureRenderer() {
  if (rendererReady) return
  rendererReady = true

  const renderer = new marked.Renderer()

  renderer.code = function ({ text, lang }: Tokens.Code): string {
    const language = (lang || '').trim().split(/\s+/)[0] || ''
    const mapped = mapHljsLang(language || 'text')
    let body = escapeHtml(text)
    if (hljsReady) {
      try {
        body = highlightWith(hljsReady, text, language || 'text')
      } catch {
        body = escapeHtml(text)
      }
    }
    const langClass = mapped && mapped !== 'plaintext' ? ` language-${mapped}` : ''
    return formatFencedCodeBlock(body, langClass, language || mapped || '')
  }

  renderer.link = function ({ href, title, text }: Tokens.Link): string {
    const safeHref = (href || '').trim()
    if (/^\s*javascript:/i.test(safeHref) || /^\s*vbscript:/i.test(safeHref)) {
      return escapeHtml(text)
    }
    const t = title ? ` title="${escapeHtml(title)}"` : ''
    const external =
      /^https?:\/\//i.test(safeHref) || safeHref.startsWith('//')
        ? ' target="_blank" rel="noopener noreferrer"'
        : ''
    return `<a href="${escapeHtml(safeHref)}"${t}${external}>${text}</a>`
  }

  renderer.image = function ({ href, title, text }: Tokens.Image): string {
    const safeHref = (href || '').trim()
    if (/^\s*javascript:/i.test(safeHref)) return ''
    const t = title ? ` title="${escapeHtml(title)}"` : ''
    const alt = escapeHtml(text || '')
    return `<img src="${escapeHtml(safeHref)}" alt="${alt}"${t} loading="lazy" />`
  }

  marked.use({ renderer })
}

/** 预加载代码高亮（可选，首次渲染前调用更佳） */
export async function prepareMarkdownHighlight(): Promise<void> {
  if (hljsReady) return
  hljsReady = await loadHljs()
  ensureRenderer()
}

/**
 * 将 Markdown 渲染为安全 HTML（GFM + KaTeX + 代码高亮）。
 * 代码高亮依赖 hljs 是否已加载；未加载时仍输出正确结构，可先 await prepareMarkdownHighlight()。
 */
export function renderMarkdown(md: string): string {
  if (!md) return ''
  ensureRenderer()
  try {
    const raw = md.replace(/\$\$\$/g, '$')
    const { text, pieces } = extractMath(raw)
    const html = marked.parse(text, { async: false }) as string
    return sanitizeHtml(restoreMath(html, pieces))
  } catch {
    return sanitizeHtml(
      md.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'),
    )
  }
}

/** 异步渲染：确保代码高亮可用 */
export async function renderMarkdownAsync(md: string): Promise<string> {
  await prepareMarkdownHighlight()
  return renderMarkdown(md)
}

/**
 * 粗判内容是否更像 HTML（公告/紧急通知等历史富文本）。
 * 仅匹配常见 HTML 标签，避免把 Markdown 代码里的 `<bits/...>`、`a < b` 等误判为 HTML，
 * 否则 mode=auto 会跳过 Markdown 渲染，题解/题面里的 C++ 代码块会原样显示。
 */
export function looksLikeHtml(src: string): boolean {
  if (!src) return false
  const s = src.trim()
  // 常见块/行内标签；不含通用 `<ident>`，以免误伤模板/头文件/比较符
  return /<\/?(?:p|div|span|br|hr|h[1-6]|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|a|img|strong|em|b|i|u|s|del|sub|sup|blockquote|pre|code|section|article|header|footer|nav|main|figure|figcaption|details|summary|abbr|kbd)\b[^>]*>/i.test(
    s,
  )
}

let turndown: TurndownService | null = null

function getTurndown(): TurndownService {
  if (turndown) return turndown
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  })
  td.addRule('strikethrough', {
    filter: ['del', 's', 'strike'] as unknown as TurndownService.Filter,
    replacement: (content) => `~~${content}~~`,
  })
  turndown = td
  return td
}

/**
 * 历史富文本 HTML → Markdown（公告/紧急通知编辑兼容）。
 */
export function htmlToMarkdown(html: string): string {
  if (!html?.trim()) return ''
  try {
    return getTurndown().turndown(html).trim()
  } catch {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim()
  }
}

/**
 * 编辑器入参：HTML 自动转 Markdown，已是 MD 原样。
 */
export function toMarkdownSource(src: string): string {
  if (!src?.trim()) return ''
  if (looksLikeHtml(src)) return htmlToMarkdown(src)
  return src
}

/**
 * 自动：HTML 则消毒；否则按 Markdown 渲染。
 */
export function renderContent(src: string): string {
  if (!src) return ''
  if (looksLikeHtml(src)) return sanitizeHtml(src)
  return renderMarkdown(src)
}

export async function renderContentAsync(src: string): Promise<string> {
  if (!src) return ''
  if (looksLikeHtml(src)) return sanitizeHtml(src)
  return renderMarkdownAsync(src)
}
