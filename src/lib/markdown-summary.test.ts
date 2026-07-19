import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  plainTextFromMarkdown,
  renderSummaryMarkdown,
} from './markdown.ts'

describe('plainTextFromMarkdown / renderSummaryMarkdown', () => {
  it('strips latex delimiters and keeps tex body', () => {
    const text = plainTextFromMarkdown(
      '$N$ 最大能到 $10^{500}$，以及 $$a+b$$',
    )
    assert.match(text, /N/)
    assert.match(text, /10\^\{500\}/)
    assert.match(text, /a\+b/)
    assert.doesNotMatch(text, /\$/)
  })

  it('strips bold and inline code markers (no HTML render)', () => {
    const text = plainTextFromMarkdown('用 **数位 DP** 与 `rem` 记录余数')
    assert.equal(text, '用 数位 DP 与 rem 记录余数')
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

  it('strips images and list markers to plain text flow', () => {
    const text = plainTextFromMarkdown(
      '![图](https://x.test/a.png)\n- 第一点\n1. 第二点',
    )
    assert.match(text, /图/)
    assert.match(text, /第一点/)
    assert.match(text, /第二点/)
  })

  it('escapes raw html', () => {
    const html = renderSummaryMarkdown('<script>alert(1)</script> **ok**')
    assert.doesNotMatch(html, /<script>/i)
    assert.match(html, /&lt;script&gt;/)
    assert.doesNotMatch(html, /<strong>/)
    assert.match(html, /ok/)
  })
})
