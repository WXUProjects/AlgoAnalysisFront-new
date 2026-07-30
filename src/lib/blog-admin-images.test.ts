import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createBlogAdminImageController,
  normalizeBlogAdminImages,
} from './blog-admin-images'

test('normalizes admin image list and cleanup snapshot', () => {
  const result = normalizeBlogAdminImages({
    list: [
      {
        id: 7,
        userId: 2,
        username: 'alice',
        name: 'Alice',
        objectKey: '/blog/2/a.webp',
        url: 'https://cdn.example.com/blog/2/a.webp',
        contentHash: 'abc',
        purpose: 'content',
        createdAt: '2026-07-30T00:00:00Z',
        referenced: false,
      },
      { id: 0, objectKey: '' },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    mode: 'cleanup',
    candidateIds: [7, 0, 'bad'],
    snapshot: 'snapshot-1',
  })
  assert.ok(result)
  assert.equal(result.list.length, 1)
  assert.equal(result.list[0].id, 7)
  assert.equal(result.list[0].username, 'alice')
  assert.deepEqual(result.candidateIds, [7])
  assert.equal(result.snapshot, 'snapshot-1')
})

test('controller switches to cleanup and refreshes after one delete', async () => {
  const calls: string[] = []
  const controller = createBlogAdminImageController({
    list: async (params) => {
      calls.push(`list:${params.mode}:${params.page}`)
      return {
        success: true,
        message: 'ok',
        data: {
          list: [],
          total: params.mode === 'cleanup' ? 1 : 3,
          page: params.page,
          pageSize: params.pageSize,
          mode: params.mode,
          candidateIds: params.mode === 'cleanup' ? [7] : [],
          snapshot: params.mode === 'cleanup' ? 'snapshot-1' : '',
        },
      }
    },
    deleteOne: async (id) => {
      calls.push(`delete:${id}`)
      return { success: true, message: 'ok', data: { deleted: 1 } }
    },
    deleteBatch: async () => ({
      success: true,
      message: 'ok',
      data: { deleted: 1 },
    }),
  })

  await controller.load('all', 1, 20)
  await controller.load('cleanup', 1, 20)
  const outcome = await controller.deleteOne(7)
  assert.equal(outcome.kind, 'deleted')
  assert.deepEqual(calls, [
    'list:all:1',
    'list:cleanup:1',
    'delete:7',
    'list:cleanup:1',
  ])
})

test('controller refreshes cleanup candidates after stale batch', async () => {
  let listCalls = 0
  const controller = createBlogAdminImageController({
    list: async (params) => {
      listCalls++
      return {
        success: true,
        message: 'ok',
        data: {
          list: [],
          total: 1,
          page: params.page,
          pageSize: params.pageSize,
          mode: params.mode,
          candidateIds: [7],
          snapshot: `snapshot-${listCalls}`,
        },
      }
    },
    deleteOne: async () => ({
      success: true,
      message: 'ok',
      data: { deleted: 1 },
    }),
    deleteBatch: async () => ({
      success: false,
      status: 409,
      message: '图片状态已变化',
      data: null,
    }),
  })

  await controller.load('cleanup', 1, 20)
  const outcome = await controller.deleteAll()
  assert.equal(outcome.kind, 'refreshed')
  assert.equal(listCalls, 2)
  assert.equal(controller.current()?.snapshot, 'snapshot-2')
})

test('controller refreshes cleanup candidates after partial batch failure', async () => {
  let listCalls = 0
  const controller = createBlogAdminImageController({
    list: async (params) => {
      listCalls++
      return {
        success: true,
        message: 'ok',
        data: {
          list: [],
          total: 1,
          page: params.page,
          pageSize: params.pageSize,
          mode: params.mode,
          candidateIds: [7],
          snapshot: `snapshot-${listCalls}`,
        },
      }
    },
    deleteOne: async () => ({ success: true, data: { deleted: 1 } }),
    deleteBatch: async () => ({
      success: false,
      status: 502,
      message: '部分图片删除失败',
      data: null,
    }),
  })

  await controller.load('cleanup', 1, 20)
  const outcome = await controller.deleteAll()
  assert.equal(outcome.kind, 'refreshed')
  assert.equal(listCalls, 2)
  assert.equal(controller.current()?.snapshot, 'snapshot-2')
})

test('controller returns to the previous page after deleting the last row', async () => {
  const pages: number[] = []
  let listCalls = 0
  const controller = createBlogAdminImageController({
    list: async (params) => {
      pages.push(params.page)
      listCalls++
      return {
        success: true,
        message: 'ok',
        data: {
          list: [],
          total: listCalls === 1 ? 21 : 20,
          page: params.page,
          pageSize: params.pageSize,
          mode: params.mode,
          candidateIds: [7],
          snapshot: `snapshot-${listCalls}`,
        },
      }
    },
    deleteOne: async () => ({ success: true, data: { deleted: 1 } }),
    deleteBatch: async () => ({ success: true, data: { deleted: 1 } }),
  })

  await controller.load('cleanup', 2, 20)
  const outcome = await controller.deleteOne(7)
  assert.equal(outcome.kind, 'deleted')
  assert.deepEqual(pages, [2, 2, 1])
  assert.equal(controller.current()?.page, 1)
})
