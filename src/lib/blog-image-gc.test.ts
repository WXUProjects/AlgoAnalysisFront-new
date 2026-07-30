import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBlogImageGcRequest,
  createBlogImageCleanupController,
  normalizeBlogImageCleanupPreview,
  normalizeBlogImageOrphans,
} from './blog-image-gc'

function previewFixture(ids = [7, 9], snapshot = 'snapshot-a') {
  return {
    orphans: ids.map((id) => ({
      id,
      objectKey: `/blog/2/${id}.webp`,
      url: `/blog/2/${id}.webp`,
      protected: false,
    })),
    total: ids.length,
    candidateIds: ids,
    snapshot,
  }
}

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

test('normalizes the cleanup snapshot and candidate ids returned by preview', () => {
  const preview = normalizeBlogImageCleanupPreview({
    orphans: [
      { id: 9, objectKey: '/blog/2/b.webp', url: '/blog/2/b.webp' },
      { id: 7, objectKey: '/blog/2/a.webp', url: '/blog/2/a.webp' },
    ],
    total: 2,
    candidateIds: [7, 9],
    snapshot: 'sha256-preview-token',
  })
  assert.deepEqual(preview?.candidateIds, [7, 9])
  assert.equal(preview?.snapshot, 'sha256-preview-token')
  assert.equal(preview?.orphans.length, 2)
})

test('builds confirm body from the exact preview snapshot', () => {
  assert.deepEqual(
    buildBlogImageGcRequest({
      candidateIds: [7, 9],
      snapshot: 'sha256-preview-token',
    }),
    { candidateIds: [7, 9], snapshot: 'sha256-preview-token' },
  )
})

test('cleanup controller previews with GET dependency and confirms the exact snapshot once', async () => {
  let getCount = 0
  let postCount = 0
  const bodies: Array<{ candidateIds: number[]; snapshot: string }> = []
  let releasePost!: () => void
  const postGate = new Promise<void>((resolve) => {
    releasePost = resolve
  })
  const controller = createBlogImageCleanupController({
    preview: async () => {
      getCount += 1
      return { success: true, message: 'ok', data: previewFixture(), status: 200 }
    },
    confirm: async (body) => {
      postCount += 1
      bodies.push(body)
      await postGate
      return { success: true, message: 'ok', data: { deleted: 2 }, status: 200 }
    },
  })

  const preview = await controller.loadPreview()
  assert.equal(preview.kind, 'preview')
  assert.equal(preview.status, 200)
  assert.equal(getCount, 1)
  assert.equal(postCount, 0)

  const firstConfirm = controller.confirmPreview()
  const concurrentConfirm = await controller.confirmPreview()
  assert.equal(concurrentConfirm.kind, 'busy')
  assert.equal(postCount, 1)
  assert.deepEqual(bodies, [{ candidateIds: [7, 9], snapshot: 'snapshot-a' }])
  releasePost()
  const confirmed = await firstConfirm
  assert.equal(confirmed.kind, 'confirmed')
  assert.equal(confirmed.status, 200)

  const continuousConfirm = await controller.confirmPreview()
  assert.equal(continuousConfirm.kind, 'no-preview')
  assert.equal(postCount, 1)
})

for (const failureStatus of [409, 502]) {
  test(`${failureStatus} refreshes preview with GET and requires another manual confirm`, async () => {
    let getCount = 0
    let postCount = 0
    const bodies: Array<{ candidateIds: number[]; snapshot: string }> = []
    const controller = createBlogImageCleanupController({
      preview: async () => {
        getCount += 1
        const data = getCount === 1
          ? previewFixture([7, 9], 'snapshot-a')
          : previewFixture([11], 'snapshot-b')
        return { success: true, message: 'ok', data, status: 200 }
      },
      confirm: async (body) => {
        postCount += 1
        bodies.push(body)
        if (postCount === 1) {
          return {
            success: false,
            message:
              failureStatus === 409
                ? '清理预览已变化，请重新预览'
                : '部分图片清理失败',
            data: null,
            status: failureStatus,
          }
        }
        return { success: true, message: 'ok', data: { deleted: 1 }, status: 200 }
      },
    })

    await controller.loadPreview()
    const refreshed = await controller.confirmPreview()
    assert.equal(refreshed.kind, 'refreshed')
    assert.equal(refreshed.status, failureStatus)
    assert.equal(refreshed.refreshStatus, 200)
    assert.equal(getCount, 2)
    assert.equal(postCount, 1, 'refresh must not auto-confirm')

    await Promise.resolve()
    assert.equal(postCount, 1, 'new preview still requires a user action')
    const confirmed = await controller.confirmPreview()
    assert.equal(confirmed.kind, 'confirmed')
    assert.equal(postCount, 2)
    assert.deepEqual(bodies, [
      { candidateIds: [7, 9], snapshot: 'snapshot-a' },
      { candidateIds: [11], snapshot: 'snapshot-b' },
    ])
  })
}

test('cleanup controller preserves non-refresh error status and keeps preview retryable', async () => {
  let postCount = 0
  const controller = createBlogImageCleanupController({
    preview: async () => ({
      success: true,
      message: 'ok',
      data: previewFixture(),
      status: 200,
    }),
    confirm: async () => {
      postCount += 1
      return {
        success: false,
        message: '稍后重试',
        data: null,
        status: 503,
      }
    },
  })
  await controller.loadPreview()
  const failed = await controller.confirmPreview()
  assert.equal(failed.kind, 'confirm-error')
  assert.equal(failed.status, 503)
  await controller.confirmPreview()
  assert.equal(postCount, 2)
})
