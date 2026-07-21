import { marked, type Tokens } from 'marked'
import katex from 'katex'
import TurndownService from 'turndown'
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
    'a', 'abbr', 'b', 'blockquote', 'br', 'button', 'code', 'del', 'details',
    'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'kbd',
    'li', 'ol', 'p', 'pre', 's', 'span', 'strong', 'sub', 'summary', 'sup',
    'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
  ])
  const dropWithContent = new Set([
    'base', 'embed', 'form', 'iframe', 'input', 'link', 'math',
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

    // 仅保留我们渲染的代码块复制按钮，拒绝用户 HTML 里任意 button
    if (tag === 'button') {
      const cls = el.getAttribute('class') || ''
      if (!/\bmd-code-copy\b/.test(cls)) {
        el.remove()
        continue
      }
      el.setAttribute('type', 'button')
      el.className = 'md-code-copy'
      if (!el.getAttribute('aria-label')) {
        el.setAttribute('aria-label', '复制')
      }
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const allowed =
        name === 'title' ||
        name === 'class' ||
        name === 'aria-hidden' ||
        name === 'aria-label' ||
        (tag === 'button' && name === 'type') ||
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

const COPY_BTN =
  `<button type="button" class="md-code-copy" aria-label="复制">复制</button>`

/** 是否按「样例/纯文本」渲染：无语言标签的围栏（题面输入输出样例） */
function isPlainSampleFence(language: string): boolean {
  const lang = (language || '').trim().toLowerCase()
  return !lang || lang === 'text' || lang === 'plaintext' || lang === 'plain'
}

/** Carbon 风格代码块：语言代码带行号；样例块无行号、右上角浮层复制 */
function formatFencedCodeBlock(
  highlighted: string,
  langClass: string,
  language: string,
): string {
  const plainSample = isPlainSampleFence(language)
  const lines = linesWithBalancedSpans(highlighted)
  const rows = lines
    .map((line, i) => {
      const src = line.length ? line : ' '
      if (plainSample) {
        // 样例：不显示行号，便于对照 OJ 与复制
        return `<span class="md-code-row"><span class="md-code-src">${src}</span></span>`
      }
      return (
        `<span class="md-code-row">` +
        `<span class="md-code-ln" aria-hidden="true">${i + 1}</span>` +
        `<span class="md-code-src">${src}</span>` +
        `</span>`
      )
    })
    .join('')

  if (plainSample) {
    // 题面样例：块右上角浮层「复制」，一眼能看见
    return (
      `<div class="md-code-block md-code-sample">` +
      COPY_BTN +
      `<pre class="code-hl"><code class="hljs${langClass}">${rows}</code></pre>` +
      `</div>\n`
    )
  }

  const lang = `<span class="md-code-lang">${escapeHtml(language)}</span>`
  const header =
    `<div class="md-code-header">` +
    `<span class="md-code-dots" aria-hidden="true"></span>` +
    lang +
    COPY_BTN +
    `</div>`
  return (
    `<div class="md-code-block">` +
    header +
    `<pre class="code-hl"><code class="hljs${langClass}">${rows}</code></pre>` +
    `</div>\n`
  )
}

/**
 * 从渲染后的 `.md-code-block` 取出纯代码（不含行号）。
 * 供 MarkdownBody 复制按钮使用。
 */
export function extractMarkdownCodeText(block: Element): string {
  const srcs = block.querySelectorAll('.md-code-src')
  if (srcs.length > 0) {
    return Array.from(srcs, (el) => el.textContent ?? '').join('\n')
  }
  const pre = block.querySelector('pre')
  if (pre) {
    const clone = pre.cloneNode(true) as Element
    clone.querySelectorAll('.md-code-ln').forEach((n) => n.remove())
    return (clone.textContent ?? '').replace(/\n$/, '')
  }
  return ''
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

export type MarkdownOutlineItem = {
  id: string
  /** 1–6，对应 # … ###### */
  level: number
  text: string
}

/** 标题 slug：保留中英文与数字，便于提纲锚点与渲染 id 一致。 */
function slugifyHeadingText(text: string): string {
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

function makeHeadingIdAssigner() {
  const used = new Map<string, number>()
  return (text: string): string => {
    const base = slugifyHeadingText(text)
    const n = used.get(base) ?? 0
    used.set(base, n + 1)
    return n === 0 ? base : `${base}-${n}`
  }
}

/** 去掉标题行内常见 Markdown 标记，便于展示与生成 id。 */
function stripMdInline(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]+/g, '')
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
    .trim()
}

/**
 * 从 Markdown 源码提取标题提纲（跳过代码围栏内的 #）。
 * id 与 renderMarkdown 注入的 heading id 算法一致，可点按跳转。
 */
export function extractMarkdownOutline(md: string): MarkdownOutlineItem[] {
  if (!md?.trim()) return []
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const items: MarkdownOutlineItem[] = []
  const assignId = makeHeadingIdAssigner()
  let inFence = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^(`{3,}|~{3,})/.test(trimmed)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!m) continue
    const text = stripMdInline(m[2])
    if (!text) continue
    items.push({
      id: assignId(text),
      level: m[1].length,
      text,
    })
  }
  return items
}

/** 给 h1–h6 注入 id（与 extractMarkdownOutline 一致），并加 scroll-mt 便于锚点。 */
function withHeadingIds(html: string): string {
  if (!html || typeof document === 'undefined') return html
  const doc = document.implementation.createHTMLDocument('')
  doc.body.innerHTML = html
  const assignId = makeHeadingIdAssigner()
  for (const el of Array.from(
    doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6'),
  )) {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    el.id = assignId(text)
    el.classList.add('scroll-mt-24')
  }
  return doc.body.innerHTML
}

/**
 * 将 Markdown 渲染为安全 HTML（GFM + KaTeX + 代码高亮）。
 * 代码高亮依赖 hljs 是否已加载；未加载时仍输出正确结构，可先 await prepareMarkdownHighlight()。
 * 标题会注入 id，供文章提纲锚点跳转。
 */
export function renderMarkdown(md: string): string {
  if (!md) return ''
  ensureRenderer()
  try {
    const raw = md.replace(/\$\$\$/g, '$')
    const { text, pieces } = extractMath(raw)
    const html = marked.parse(text, { async: false }) as string
    return withHeadingIds(sanitizeHtml(restoreMath(html, pieces)))
  } catch {
    return withHeadingIds(
      sanitizeHtml(
        md.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'),
      ),
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
 * 若富文本里仍夹着 `$...$` / `\\(...\\)` 公式，走 Markdown+KaTeX 路径，避免裸公式残留。
 */
export function renderContent(src: string): string {
  if (!src) return ''
  if (looksLikeHtml(src)) {
    if (/\$|\\\(|\\\[/.test(src)) return renderMarkdown(src)
    // 纯 HTML 也注入 heading id，便于题面/题解提纲锚点与 scrollspy
    return withHeadingIds(sanitizeHtml(src))
  }
  return renderMarkdown(src)
}

export async function renderContentAsync(src: string): Promise<string> {
  if (!src) return ''
  if (looksLikeHtml(src)) {
    if (/\$|\\\(|\\\[/.test(src)) return renderMarkdownAsync(src)
    return withHeadingIds(sanitizeHtml(src))
  }
  return renderMarkdownAsync(src)
}

/**
 * 列表/卡片「文章简述」→ 安全 HTML。
 *
 * - **KaTeX 公式会渲染**（行内/块级；块级在 CSS 里压成行内以兼容 line-clamp）
 * - 其余 Markdown（加粗/链接/标题/代码）剥成纯文字，避免卡片排版被撑乱
 * - 输出已 escape + sanitize，可直接 dangerouslySetInnerHTML
 */
export function renderSummaryMarkdown(md: string): string {
  if (!md) return ''
  try {
    const raw = md.replace(/\$\$\$/g, '$').replace(/\r\n/g, '\n')
    const { text, pieces } = extractMath(raw)
    // 占位符保护：剥 MD 时勿弄坏 @@MATHn@@
    const plain = stripMarkdownKeepPlaceholders(text)
    const escaped = escapeHtml(plain)
    return sanitizeHtml(restoreMath(escaped, pieces))
  } catch {
    return escapeHtml(md)
  }
}

/**
 * 剥 Markdown 标记为可读纯文本，但保留 `@@MATHn@@` 公式占位符。
 * （与 plainTextFromMarkdown 类似，但不处理公式定界符——公式已在 extractMath 抽出）
 */
function stripMarkdownKeepPlaceholders(src: string): string {
  if (!src) return ''
  let s = src

  if (looksLikeHtml(s)) {
    s = s
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
  }

  // 代码块 / 行内代码 → 内容
  s = s.replace(/```[\w-]*\n?([\s\S]*?)```/g, ' $1 ')
  s = s.replace(/`([^`]+)`/g, '$1')

  // 标题 / 引用 / 列表标记
  s = s.replace(/^#{1,6}\s+/gm, '')
  s = s.replace(/^>\s?/gm, '')
  s = s.replace(/^\s*[-*+]\s+/gm, '')
  s = s.replace(/^\s*\d+\.\s+/gm, '')

  // 图片 / 链接
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1')
  s = s.replace(/<(https?:\/\/[^>\s]+)>/gi, '$1')

  // 加粗 / 斜体 / 删除线
  s = s.replace(/\*\*(.+?)\*\*/g, '$1')
  s = s.replace(/__(.+?)__/g, '$1')
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
  s = s.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '$1')
  s = s.replace(/~~(.+?)~~/g, '$1')

  s = s.replace(/\n+/g, ' ').replace(/[ \t]{2,}/g, ' ').trim()
  return s
}

/**
 * 从 Markdown/富文本草稿抽出单行纯文本（简述、列表副文案用）。
 * 保留可读文字，去掉标记与公式定界符。
 */
export function plainTextFromMarkdown(md: string): string {
  if (!md) return ''
  let s = md.replace(/\$\$\$/g, '$').replace(/\r\n/g, '\n')

  // 若整段像 HTML，先粗剥标签
  if (looksLikeHtml(s)) {
    s = s
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
  }

  // 公式：保留 tex 本体，去掉 $ / \( \)
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, ' $1 ')
  s = s.replace(/\$((?:\\.|[^$\\])+?)\$/g, ' $1 ')
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, ' $1 ')
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, ' $1 ')

  // 代码块 / 行内代码 → 内容
  s = s.replace(/```[\w-]*\n?([\s\S]*?)```/g, ' $1 ')
  s = s.replace(/`([^`]+)`/g, '$1')

  // 标题 / 引用 / 列表标记
  s = s.replace(/^#{1,6}\s+/gm, '')
  s = s.replace(/^>\s?/gm, '')
  s = s.replace(/^\s*[-*+]\s+/gm, '')
  s = s.replace(/^\s*\d+\.\s+/gm, '')

  // 图片 / 链接 / wiki 链
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1')
  s = s.replace(/<(https?:\/\/[^>\s]+)>/gi, '$1')

  // 加粗 / 斜体 / 删除线标记（只留文字）
  s = s.replace(/\*\*(.+?)\*\*/g, '$1')
  s = s.replace(/__(.+?)__/g, '$1')
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
  s = s.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '$1')
  s = s.replace(/~~(.+?)~~/g, '$1')

  // 压成一段，方便 line-clamp
  s = s.replace(/\n+/g, ' ').replace(/[ \t]{2,}/g, ' ').trim()
  return s
}
