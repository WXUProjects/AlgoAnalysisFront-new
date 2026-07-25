/**
 * KaTeX pipeline smoke tests for markdown render + sanitize.
 * Run: npx tsx --test src/lib/markdown-katex.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
})
const win = dom.window
Object.defineProperty(globalThis, 'window', { value: win, configurable: true })
Object.defineProperty(globalThis, 'document', {
  value: win.document,
  configurable: true,
})
Object.defineProperty(globalThis, 'HTMLElement', {
  value: win.HTMLElement,
  configurable: true,
})
Object.defineProperty(globalThis, 'Node', { value: win.Node, configurable: true })
Object.defineProperty(globalThis, 'NodeFilter', {
  value: win.NodeFilter,
  configurable: true,
})

const md = await import('./markdown.ts')

describe('renderMarkdown KaTeX', () => {
  it('renders inline $...$ as katex HTML', () => {
    const html = md.renderMarkdown('求 $x^2+1$ 的值')
    assert.match(html, /class="katex"/)
    assert.doesNotMatch(html, /\$x\^2/)
    assert.match(html, /katex-html|mord/)
  })

  it('renders display $$...$$', () => {
    const html = md.renderMarkdown('公式\n\n$$a+b=c$$\n\n结束')
    assert.match(html, /class="katex"/)
    assert.match(html, /katex-display|katex/)
  })

  it('renders \\( \\) and \\[ \\]', () => {
    const html = md.renderMarkdown('行内 \\(n\\leq 10\\) 块级 \\[E=mc^2\\]')
    assert.match(html, /class="katex"/)
  })

  it('keeps katex after sanitize (styles for layout)', () => {
    const html = md.renderMarkdown('$\\frac{1}{2}$')
    assert.match(html, /class="katex"/)
    // strut uses height style
    assert.match(html, /style=/)
  })
})

describe('renderSummaryMarkdown should render katex for cards', () => {
  it('includes katex markup for formulas in summary', () => {
    const html = md.renderSummaryMarkdown('最大 $10^{500}$ 与 **数位**')
    assert.match(html, /class="katex"/, 'summary must render KaTeX, not plain tex')
    assert.doesNotMatch(html, /\$/)
    assert.match(html, /数位/)
  })
})

describe('plain sample input-format LaTeX', () => {
  it('detects A_1 / \\ldots format lines', () => {
    assert.equal(md.lineLooksLikeLatexFormat('A_1 A_2 \\ldots A_N'), true)
    assert.equal(md.lineLooksLikeLatexFormat('P_1 P_2 \\ldots P_N'), true)
    assert.equal(md.lineLooksLikeLatexFormat('N'), false)
    assert.equal(md.lineLooksLikeLatexFormat('3 1 4 1 5 2'), false)
    assert.equal(md.lineLooksLikeLatexFormat('oxo'), false)
  })

  it('renders input-format fence with KaTeX, keeps sample numbers plain', () => {
    const html = md.renderMarkdown(
      '### 输入\n\n```\nN\nA_1 A_2 \\ldots A_N\n```\n\n```\n6\n3 1 4 1 5 2\n```\n',
    )
    assert.match(html, /md-code-math/)
    assert.match(html, /class="katex"/)
    // 可见区是 …，\ldots 仅保留在 data-copy-text 供复制
    assert.match(html, /data-copy-text="A_1 A_2 \\ldots A_N"/)
    assert.match(html, />…</)
    // 数字样例仍是纯文本行
    assert.match(html, /md-code-src">6</)
    assert.match(html, /3 1 4 1 5 2/)
  })

  it('copy text keeps original format string via data-copy-text', () => {
    const html = md.renderMarkdown('```\nN\nA_1 A_2 \\ldots A_N\n```\n')
    document.body.innerHTML = html
    const block = document.querySelector('.md-code-block')!
    const text = md.extractMarkdownCodeText(block)
    assert.equal(text, 'N\nA_1 A_2 \\ldots A_N')
    document.body.innerHTML = ''
  })
})
