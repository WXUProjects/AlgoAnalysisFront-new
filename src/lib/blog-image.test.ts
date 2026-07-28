import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  BLOG_IMAGE_UPLOAD_HINT,
  blogImageToolbarAction,
  isAllowedBlogImageUrl,
  markdownImageSnippet,
  rejectBlogImageUpload,
} from './blog-image.ts'

describe('blog image policy', () => {
  it('allows empty and http(s) cover urls', () => {
    assert.equal(isAllowedBlogImageUrl(''), true)
    assert.equal(isAllowedBlogImageUrl('https://cdn.example.com/a.png'), true)
    assert.equal(isAllowedBlogImageUrl('http://x.test/b.jpg'), true)
  })

  it('rejects non-http schemes and garbage', () => {
    assert.equal(isAllowedBlogImageUrl('data:image/png;base64,aaa'), false)
    assert.equal(isAllowedBlogImageUrl('file:///tmp/x.png'), false)
    assert.equal(isAllowedBlogImageUrl('not a url'), false)
    assert.equal(isAllowedBlogImageUrl('ftp://x/y'), false)
  })

  it('toolbar action is link-only when upload disabled', () => {
    const a = blogImageToolbarAction()
    assert.equal(a.preferUpload, false)
    assert.equal(a.markdownSnippet.before, '![')
    assert.ok(a.markdownSnippet.after.includes('https://'))
    assert.equal(a.toastMessage, BLOG_IMAGE_UPLOAD_HINT)
  })

  it('toolbar prefers upload when enabled', () => {
    const a = blogImageToolbarAction({ uploadEnabled: true })
    assert.equal(a.preferUpload, true)
  })

  it('upload path rejects unless enabled', () => {
    const r = rejectBlogImageUpload(null)
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.message, BLOG_IMAGE_UPLOAD_HINT)
    assert.equal(rejectBlogImageUpload(null, { uploadEnabled: true }).ok, true)
  })

  it('markdownImageSnippet supports width', () => {
    assert.equal(
      markdownImageSnippet('https://x/a.webp', '图', 550),
      '![图|550](https://x/a.webp)',
    )
    assert.equal(
      markdownImageSnippet('https://x/a.webp', '图'),
      '![图](https://x/a.webp)',
    )
  })
})
