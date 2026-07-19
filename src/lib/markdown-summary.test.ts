import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
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

const {
  plainTextFromMarkdown,
  renderSummaryMarkdown,
} = await import('./markdown.ts')

describe('plainTextFromMarkdown', () => {
  it('strips latex delimiters and keeps tex body (meta / plain use)', () => {
    const text = plainTextFromMarkdown(
      '$N$ 最大能到 $10^{500}$，以及 $$a+b$$',
    )
    assert.match(text, /N/)
    assert.match(text, /10\^\{500\}/)
    assert.match(text, /a\+b/)
    assert.doesNotMatch(text, /\$/)
  })

  it('strips bold and inline code markers', () => {
    const text = plainTextFromMarkdown('用 **数位 DP** 与 `rem` 记录余数')
    assert.equal(text, '用 数位 DP 与 rem 记录余数')
  })

  it('strips images and list markers to plain text flow', () => {
    const text = plainTextFromMarkdown(
      '![图](https://x.test/a.png)\n- 第一点\n1. 第二点',
    )
    assert.match(text, /图/)
    assert.match(text, /第一点/)
    assert.match(text, /第二点/)
  })
})

describe('renderSummaryMarkdown (cards: KaTeX + plain text)', () => {
  it('renders latex as katex HTML', () => {
    const html = renderSummaryMarkdown(
      '$N$ 最大能到 $10^{500}$，以及 $$a+b$$',
    )
    assert.match(html, /class="katex"/)
    assert.doesNotMatch(html, /\$/)
    // multiple formulas
    assert.ok((html.match(/class="katex"/g) || []).length >= 2)
  })

  it('strips bold/code tags but keeps readable text', () => {
    const html = renderSummaryMarkdown('用 **数位 DP** 与 `rem` 记录余数')
    assert.doesNotMatch(html, /<strong>|<code/)
    assert.match(html, /数位 DP/)
    assert.match(html, /rem/)
  })

  it('does not render links as anchors (label only)', () => {
    const html = renderSummaryMarkdown('见 [文档](https://example.com/a) 与说明')
    assert.doesNotMatch(html, /<a\b/)
    assert.match(html, /见 文档 与说明/)
  })

  it('does not render headings or bold tags', () => {
    const html = renderSummaryMarkdown('# 标题\n正文 **加粗**')
    assert.doesNotMatch(html, /<h[1-6]\b/)
    assert.doesNotMatch(html, /<strong>/)
    assert.match(html, /标题/)
    assert.match(html, /加粗/)
  })

  it('escapes raw html', () => {
    const html = renderSummaryMarkdown('<script>alert(1)</script> **ok**')
    assert.doesNotMatch(html, /<script>/i)
    assert.match(html, /&lt;script&gt;|alert/)
    assert.doesNotMatch(html, /<strong>/)
    assert.match(html, /ok/)
  })

  it('renders problem-style constraints', () => {
    const html = renderSummaryMarkdown(
      '求 $1 \\leq x \\leq N$，且 $1 \\leq N < 10^{500}$',
    )
    assert.match(html, /class="katex"/)
    assert.doesNotMatch(html, /\$1/)
  })
})
