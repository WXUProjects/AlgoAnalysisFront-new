import assert from 'node:assert/strict'
import test from 'node:test'
import type { BlogArticle } from '@shared/api'
import { canPinBlogArticle, movePinnedArticle } from './BlogPinned.tsx'

function article(id: number, visibility = 'public'): BlogArticle {
  return {
    id,
    slug: `article-${id}`,
    title: `Article ${id}`,
    visibility,
    createdAt: id,
  }
}

test('movePinnedArticle moves an article to the dropped position without mutating input', () => {
  const input = [article(1), article(2), article(3)]
  const result = movePinnedArticle(input, 0, 2)

  assert.deepEqual(result.map((item) => item.id), [2, 3, 1])
  assert.deepEqual(input.map((item) => item.id), [1, 2, 3])
})

test('canPinBlogArticle only accepts public and password articles', () => {
  assert.equal(canPinBlogArticle(article(1, 'public')), true)
  assert.equal(canPinBlogArticle(article(2, 'password')), true)
  assert.equal(canPinBlogArticle(article(3, 'private')), false)
})
