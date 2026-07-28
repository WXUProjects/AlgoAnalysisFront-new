/**
 * 图片尺寸 / 对齐：解析 + renderMarkdown。
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

  it('parses percent and align in any order', () => {
    const a = md.parseObsidianImageAlt('说明|50%|center')
    assert.equal(a.alt, '说明')
    assert.equal(a.widthPercent, 50)
    assert.equal(a.align, 'center')
    assert.equal(a.width, undefined)

    const b = md.parseObsidianImageAlt('图|center|75%')
    assert.equal(b.widthPercent, 75)
    assert.equal(b.align, 'center')

    const c = md.parseObsidianImageAlt('图|居中')
    assert.equal(c.align, 'center')
    assert.equal(c.alt, '图')
  })

  it('leaves normal alt alone', () => {
    assert.deepEqual(md.parseObsidianImageAlt('普通说明'), {
      alt: '普通说明',
    })
    assert.deepEqual(md.parseObsidianImageAlt('a|notanum'), {
      alt: 'a|notanum',
    })
  })

  it('formatObsidianImageAlt round-trips', () => {
    assert.equal(
      md.formatObsidianImageAlt({
        alt: '图',
        widthPercent: 50,
        align: 'center',
      }),
      '图|50%|center',
    )
    assert.equal(
      md.formatObsidianImageAlt({ alt: '图', width: 400 }),
      '图|400',
    )
    assert.equal(md.formatObsidianImageAlt({ alt: '图', align: 'left' }), '图')
  })
})

describe('renderMarkdown image layout', () => {
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
    assert.equal(img.getAttribute('src'), 'https://example.com/a.webp')
    const block = doc.querySelector('.md-img-block')
    assert.ok(block)
    assert.ok(block?.classList.contains('md-img-align-left'))
  })

  it('supports percent + center', () => {
    const html = md.renderMarkdown(
      '![图|50%|center](https://example.com/c.png)',
    )
    const doc = new JSDOM(html).window.document
    const img = doc.querySelector('img')
    assert.equal(img?.getAttribute('data-md-wpct'), '50')
    assert.match(img?.getAttribute('style') || '', /50%/)
    const block = doc.querySelector('.md-img-block')
    assert.ok(block?.classList.contains('md-img-align-center'))
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
    assert.match(img?.getAttribute('style') || '', /400px/)
  })
})
