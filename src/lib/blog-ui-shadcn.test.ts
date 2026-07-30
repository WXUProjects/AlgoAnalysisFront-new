import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function read(relativePath: string): string {
  return readFileSync(join(srcRoot, relativePath), 'utf8')
}

function buttonBlocks(source: string): string[] {
  return source.match(/<Button\b[\s\S]*?<\/Button>/g) ?? []
}

describe('today blog UI follows shadcn composition', () => {
  it('groups every BlogAdmin SelectItem inside SelectGroup', () => {
    const source = read('pages/dashboard/BlogAdmin.tsx')
    const contents = source.match(/<SelectContent>[\s\S]*?<\/SelectContent>/g) ?? []
    assert.ok(contents.length > 0)
    for (const content of contents) {
      assert.match(content, /<SelectGroup>/)
      assert.doesNotMatch(content, /<SelectContent>\s*<SelectItem/)
    }
  })

  it('lets Button CSS size blog action icons', () => {
    for (const relativePath of [
      'pages/dashboard/BlogAdmin.tsx',
      'pages/BlogPlaza.tsx',
      'pages/blog/BlogManage.tsx',
    ]) {
      for (const block of buttonBlocks(read(relativePath))) {
        assert.doesNotMatch(
          block,
          /<[A-Z][A-Za-z0-9]*Icon\b[^>]*className=["'][^"']*(?:size-|w-|h-)/,
          `${relativePath} contains a manually-sized Button icon`,
        )
      }
    }
  })

  it('uses flex gap instead of space-y stacks in BlogPlaza', () => {
    assert.doesNotMatch(read('pages/BlogPlaza.tsx'), /\bspace-y-/)
  })
})
