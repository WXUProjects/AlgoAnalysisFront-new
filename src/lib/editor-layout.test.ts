/**
 * Structural checks: blog/solution editors are taller + pane toggle exists.
 * Run: npx tsx --test src/lib/editor-layout.test.ts
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

describe('editor layout (blog + solution)', () => {
  it('MarkdownEditor exposes edit/split/preview pane modes', () => {
    const src = read('components/markdown-editor.tsx')
    assert.match(src, /setPane\('edit'\)/)
    assert.match(src, /setPane\('split'\)/)
    assert.match(src, /setPane\('preview'\)/)
    assert.match(src, /title="仅编辑"/)
    assert.match(src, /imageUploadEnabled/)
    assert.match(src, /onPaste/)
    assert.match(src, /purpose.*blog|uploadImage\(file, 'blog'\)/)
  })

  it('BlogEditor default height is significantly above old 480', () => {
    const src = read('pages/blog/BlogEditor.tsx')
    // 旧值 480；现用 0.72 * viewport 或至少 720 量级
    assert.doesNotMatch(src, /minHeight=\{480\}/)
    assert.match(src, /0\.72|880|720/)
    assert.match(src, /imageUploadEnabled/)
  })

  it('ProblemSolutionEdit default height is significantly above old 640', () => {
    const src = read('pages/ProblemSolutionEdit.tsx')
    assert.doesNotMatch(src, /minHeight=\{640\}/)
    assert.match(src, /0\.72|900|800/)
    assert.match(src, /imageUploadEnabled/)
  })
})
