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
Object.defineProperty(globalThis, 'HTMLButtonElement', {
  value: win.HTMLButtonElement,
  configurable: true,
})
Object.defineProperty(globalThis, 'Element', {
  value: win.Element,
  configurable: true,
})
Object.defineProperty(globalThis, 'Node', { value: win.Node, configurable: true })
Object.defineProperty(globalThis, 'NodeFilter', {
  value: win.NodeFilter,
  configurable: true,
})
Object.defineProperty(globalThis, 'navigator', {
  value: win.navigator,
  configurable: true,
})

const { extractMarkdownCodeText, renderMarkdown, sanitizeHtml } =
  await import('./markdown.ts')
const { bindMarkdownCodeCopy } = await import('./markdown-code-copy.ts')

describe('markdown code block copy', () => {
  it('renderMarkdown injects copy button on fenced code', () => {
    const html = renderMarkdown('```js\nconsole.log(1)\n```')
    assert.match(html, /class="md-code-block"/)
    assert.match(html, /class="md-code-copy"/)
    assert.match(html, /aria-label="复制"/)
    assert.match(html, />复制</)
    assert.match(html, /md-code-ln/) // 带语言：有行号
  })

  it('plain sample fences get floating copy without line numbers', () => {
    const html = renderMarkdown('### 输入\n\n```\n3 4 4\n```\n')
    assert.match(html, /md-code-sample/)
    assert.match(html, /class="md-code-copy"/)
    assert.doesNotMatch(html, /md-code-ln/)
    assert.doesNotMatch(html, /md-code-header/)
  })

  it('sanitize keeps only md-code-copy buttons', () => {
    const dirty =
      '<div class="md-code-block"><button type="button" class="md-code-copy" onclick="alert(1)">复制</button>' +
      '<button type="submit" class="evil">坏按钮</button></div>'
    const clean = sanitizeHtml(dirty)
    assert.match(clean, /md-code-copy/)
    assert.match(clean, /aria-label="复制"/)
    assert.doesNotMatch(clean, /evil/)
    assert.doesNotMatch(clean, /onclick/i)
    assert.doesNotMatch(clean, /submit/)
  })

  it('extractMarkdownCodeText joins source lines without line numbers', () => {
    document.body.innerHTML = `
      <div class="md-code-block">
        <pre><code>
          <span class="md-code-row">
            <span class="md-code-ln">1</span>
            <span class="md-code-src">int main() {</span>
          </span>
          <span class="md-code-row">
            <span class="md-code-ln">2</span>
            <span class="md-code-src">  return 0;</span>
          </span>
        </code></pre>
      </div>`
    const block = document.querySelector('.md-code-block')!
    assert.equal(extractMarkdownCodeText(block), 'int main() {\n  return 0;')
    document.body.innerHTML = ''
  })

  it('bindMarkdownCodeCopy writes clipboard text', async () => {
    document.body.innerHTML = `
      <div class="markdown-body">
        <div class="md-code-block">
          <div class="md-code-header">
            <button type="button" class="md-code-copy">复制</button>
          </div>
          <pre><code>
            <span class="md-code-src">hello</span>
          </code></pre>
        </div>
      </div>`
    const root = document.querySelector('.markdown-body') as HTMLElement
    let written = ''
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (t: string) => {
          written = t
        },
      },
    })

    const unbind = bindMarkdownCodeCopy(root)
    const btn = root.querySelector('button.md-code-copy') as HTMLButtonElement
    btn.click()
    await new Promise((r) => setTimeout(r, 0))
    assert.equal(written, 'hello')
    assert.equal(btn.textContent, '已复制')
    unbind()
    document.body.innerHTML = ''
  })
})
