import { marked, type Tokens } from 'marked'
import katex from 'katex'
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

/** 公告 HTML / Markdown 共用消毒（非 DOMPurify 级，但挡住常见 XSS 面） */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '')
    .replace(/<meta[\s\S]*?>/gi, '')
    .replace(/<base[\s\S]*?>/gi, '')
    .replace(/<form[\s\S]*?>[\s\S]*?<\/form>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
}

let rendererReady = false
let hljsReady: Awaited<ReturnType<typeof loadHljs>> | null = null

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
    return `<pre class="code-hl"><code class="hljs${langClass}">${body}</code></pre>\n`
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

/** 粗判内容是否更像 HTML（公告富文本） */
export function looksLikeHtml(src: string): boolean {
  if (!src) return false
  return /<\/?[a-z][\s\S]*>/i.test(src.trim())
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
