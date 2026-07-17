import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderSummaryMarkdown } from './markdown.ts'

describe('renderSummaryMarkdown', () => {
  it('renders inline latex and display latex', () => {
    const html = renderSummaryMarkdown(
      '$N$ 最大能到 $10^{500}$，以及 $$a+b$$',
    )
    assert.match(html, /katex/)
    assert.doesNotMatch(html, /\$N\$/)
    assert.doesNotMatch(html, /\$10\^\{500\}\$/)
  })

  it('renders bold and inline code', () => {
    const html = renderSummaryMarkdown('用 **数位 DP** 与 `rem` 记录余数')
    assert.match(html, /<strong>数位 DP<\/strong>/)
    assert.match(html, /<code class="md-summary-code">rem<\/code>/)
  })

  it('does not render links as anchors (label only)', () => {
    const html = renderSummaryMarkdown('见 [文档](https://example.com/a) 与说明')
    assert.doesNotMatch(html, /<a\b/)
    assert.match(html, /见 文档 与说明/)
  })

  it('does not render headings as heading tags', () => {
    const html = renderSummaryMarkdown('# 标题\n正文 **加粗**')
    assert.doesNotMatch(html, /<h[1-6]\b/)
    assert.match(html, /标题/)
    assert.match(html, /<strong>加粗<\/strong>/)
  })

  it('strips images and list markers to plain text flow', () => {
    const html = renderSummaryMarkdown(
      '![图](https://x.test/a.png)\n- 第一点\n1. 第二点',
    )
    assert.doesNotMatch(html, /<img\b/)
    assert.doesNotMatch(html, /<ul\b|<ol\b|<li\b/)
    assert.match(html, /图/)
    assert.match(html, /第一点/)
    assert.match(html, /第二点/)
  })

  it('escapes raw html', () => {
    const html = renderSummaryMarkdown('<script>alert(1)</script> **ok**')
    assert.doesNotMatch(html, /<script>/i)
    assert.match(html, /&lt;script&gt;/)
    assert.match(html, /<strong>ok<\/strong>/)
  })
})
