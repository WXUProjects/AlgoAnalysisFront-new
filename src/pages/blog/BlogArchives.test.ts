import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadAllBlogArticles } from './BlogArchives'

function page(page: number, total: number, count: number) {
  return {
    success: true,
    message: 'success',
    data: {
      list: Array.from({ length: count }, (_, i) => ({ id: (page - 1) * 50 + i + 1 })),
      total,
      page,
      pageSize: 50,
    },
  } as any
}

test('归档会拉取超过单页上限的全部文章', async () => {
  const requested: number[] = []
  const result = await loadAllBlogArticles('sanyinchen', async ({ page: current = 1 }) => {
    requested.push(current)
    return current === 1 ? page(1, 57, 50) : page(2, 57, 7)
  })

  assert.equal(result.success, true)
  assert.equal(result.list.length, 57)
  assert.deepEqual(requested, [1, 2])
})

test('归档分页失败时保留已加载文章并返回失败状态', async () => {
  const result = await loadAllBlogArticles('sanyinchen', async ({ page: current = 1 }) => {
    if (current === 1) return page(1, 57, 50)
    return { success: false, message: '加载失败', data: null } as any
  })

  assert.equal(result.success, false)
  assert.equal(result.list.length, 50)
})
