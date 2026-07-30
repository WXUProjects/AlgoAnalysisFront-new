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
    assert.doesNotMatch(text, /^-|^\s*-|\n-/)
  })

  it('does not expose Obsidian properties, comments or block ids', () => {
    const text = plainTextFromMarkdown(
      '---\ntitle: 私有属性\ntags: [内部]\n---\n正文 %%内部评论%% ^block-id',
    )
    assert.equal(text, '正文')
  })

  it('strips headings, hr, links, tables, tasks without leaking syntax', () => {
    const text = plainTextFromMarkdown(
      [
        '# 标题',
        '---',
        '- [ ] 待办',
        '- [x] 完成',
        '见 [文档](https://example.com) 说明',
        '| a | b |',
        '|---|---|',
        '| 1 | 2 |',
        '###无空格',
        '***',
        '==高亮== 与 ~~删~~',
      ].join('\n'),
    )
    assert.match(text, /标题/)
    assert.match(text, /待办/)
    assert.match(text, /完成/)
    assert.match(text, /文档/)
    assert.match(text, /说明/)
    assert.match(text, /高亮/)
    assert.match(text, /删/)
    assert.match(text, /无空格/)
    assert.doesNotMatch(text, /#|---|\[|\]|\(|\)|\||===|\*\*\*|==|~~|\$/)
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

  it('strips links whose label contains nested brackets (OJ title style)', () => {
    // 常见题解标题：[[平台 题号] 题名](url) — 标签内含 ]，旧正则会整段原样留下
    const raw =
      '[[AtCoder abc465d] X to Y](https://vjudge.net/problem/AtCoder-abc465d#author=translator:1281309:zh) 涉及图论'
    const html = renderSummaryMarkdown(raw)
    const text = plainTextFromMarkdown(raw)
    assert.doesNotMatch(html, /https?:\/\//)
    assert.doesNotMatch(html, /\]\(/)
    assert.match(html, /\[AtCoder abc465d\] X to Y/)
    assert.match(html, /涉及图论/)
    assert.equal(text, '[AtCoder abc465d] X to Y 涉及图论')
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

  it('does not expose Obsidian properties or comments in cards', () => {
    const html = renderSummaryMarkdown(
      '---\ntitle: 私有属性\nauthor: someone\n---\n公开摘要 %%内部评论%%',
    )
    assert.doesNotMatch(html, /私有属性|someone|内部评论/)
    assert.match(html, /公开摘要/)
  })

  it('does not leak markdown syntax characters in card text', () => {
    const html = renderSummaryMarkdown(
      '# 题解\n---\n- 思路一\n见 [链接](https://x.test) 与 **重点**',
    )
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    assert.match(text, /题解/)
    assert.match(text, /思路一/)
    assert.match(text, /链接/)
    assert.match(text, /重点/)
    assert.doesNotMatch(text, /(?<!&amp;)#|(?<!\w)---(?!\w)|^\s*- |\[|\]\(\)|(?<!\w)\*\*/)
  })
})
