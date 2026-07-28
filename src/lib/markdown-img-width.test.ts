/**
 * Obsidian |width 图片定宽：解析 + 真实 renderMarkdown 路径。
 * Run: npx tsx --test src/lib/markdown-img-width.test.ts
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

describe('parseObsidianImageAlt', () => {
  it('parses |width and strips from alt', () => {
    const r = md.parseObsidianImageAlt('单调队列操作过程图|550')
    assert.equal(r.alt, '单调队列操作过程图')
    assert.equal(r.width, 550)
    assert.equal(r.height, undefined)
  })

  it('parses bare |width and WxH', () => {
    assert.deepEqual(md.parseObsidianImageAlt('|200'), {
      alt: '',
      width: 200,
    })
    const wh = md.parseObsidianImageAlt('图|550x300')
    assert.equal(wh.alt, '图')
    assert.equal(wh.width, 550)
    assert.equal(wh.height, 300)
  })

  it('leaves normal alt alone', () => {
    assert.deepEqual(md.parseObsidianImageAlt('普通说明'), {
      alt: '普通说明',
    })
    assert.deepEqual(md.parseObsidianImageAlt('a|notanum'), {
      alt: 'a|notanum',
    })
  })
})

describe('renderMarkdown Obsidian image width', () => {
  it('emits width attr and style for ![说明|550](url)', () => {
    const html = md.renderMarkdown(
      '![单调队列|550](https://example.com/a.webp)',
    )
    const doc = new JSDOM(html).window.document
    const img = doc.querySelector('img')
    assert.ok(img, 'img must exist')
    assert.equal(img.getAttribute('width'), '550')
    assert.equal(img.getAttribute('alt'), '单调队列')
    assert.doesNotMatch(img.getAttribute('alt') || '', /\|550/)
    const style = img.getAttribute('style') || ''
    assert.match(style, /width:\s*550px/)
    // max-width 由 .markdown-body img CSS 约束，sanitize 后 style 仅保留 width
    assert.equal(img.getAttribute('src'), 'https://example.com/a.webp')
  })

  it('supports ![|550](url) and does not force width without |N', () => {
    const sized = md.renderMarkdown('![|120](https://example.com/b.png)')
    const imgSized = new JSDOM(sized).window.document.querySelector('img')
    assert.equal(imgSized?.getAttribute('width'), '120')

    const plain = md.renderMarkdown('![封面](https://example.com/c.png)')
    const imgPlain = new JSDOM(plain).window.document.querySelector('img')
    assert.ok(imgPlain)
    assert.equal(imgPlain.getAttribute('width'), null)
    assert.equal(imgPlain.getAttribute('alt'), '封面')
  })

  it('keeps width after sanitize and supports WxH', () => {
    const html = md.renderMarkdown(
      '![说明|400x200](https://cdn.example.com/x.jpg)',
    )
    const img = new JSDOM(html).window.document.querySelector('img')
    assert.equal(img?.getAttribute('width'), '400')
    assert.equal(img?.getAttribute('height'), '200')
    // sanitize 允许 img style 中的 width/max-width/height
    assert.match(img?.getAttribute('style') || '', /400px/)
  })
})
