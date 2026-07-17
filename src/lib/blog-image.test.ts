import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  BLOG_IMAGE_UPLOAD_HINT,
  blogImageToolbarAction,
  isAllowedBlogImageUrl,
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

  it('toolbar action is link-only with guidance', () => {
    const a = blogImageToolbarAction()
    assert.equal(a.markdownSnippet.before, '![')
    assert.ok(a.markdownSnippet.after.includes('https://'))
    assert.ok(a.toastMessage.includes('链接') || a.toastMessage.includes('上传'))
    assert.equal(a.toastMessage, BLOG_IMAGE_UPLOAD_HINT)
  })

  it('upload path always rejects', () => {
    const r = rejectBlogImageUpload(null)
    assert.equal(r.ok, false)
    assert.equal(r.message, BLOG_IMAGE_UPLOAD_HINT)
  })
})
