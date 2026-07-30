import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeBlogImageOrphans } from './blog-image-gc'

test('normalizes orphan image rows from the API', () => {
  const rows = normalizeBlogImageOrphans([
    {
      id: 7,
      objectKey: '/blog/1/a.webp',
      url: 'https://cdn/blog/1/a.webp',
      contentHash: 'abc',
      createdAt: 123,
      protected: true,
    },
  ])
  assert.deepEqual(rows, [
    {
      id: 7,
      objectKey: '/blog/1/a.webp',
      url: 'https://cdn/blog/1/a.webp',
      contentHash: 'abc',
      createdAt: 123,
      protected: true,
    },
  ])
})

test('drops malformed rows and accepts legacy Go field casing', () => {
  const rows = normalizeBlogImageOrphans([
    { ID: 9, ObjectKey: '/blog/2/b.webp', URL: '/blog/2/b.webp' },
    { id: 0, objectKey: '' },
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 9)
  assert.equal(rows[0].objectKey, '/blog/2/b.webp')
})
