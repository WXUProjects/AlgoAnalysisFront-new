import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  BLOG_IMAGE_UPLOAD_HINT,
  blogImageToolbarAction,
  extractMarkdownImageUrls,
  firstContentImageUrl,
  isAllowedBlogImageUrl,
  isBlogHostedUploadUrl,
  isImageUsedInArticle,
  markdownImageSnippet,
  rejectBlogImageUpload,
  setMarkdownImageWidth,
  updateMarkdownImageLayout,
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

  it('extractMarkdownImageUrls collects md + cover + html img', () => {
    const urls = extractMarkdownImageUrls(
      'hello ![a](https://cdn.example.com/a.png) and <img src="https://cdn.example.com/b.jpg">',
      'https://cdn.example.com/cover.webp',
    )
    assert.deepEqual(urls, [
      'https://cdn.example.com/cover.webp',
      'https://cdn.example.com/a.png',
      'https://cdn.example.com/b.jpg',
    ])
  })

  it('isBlogHostedUploadUrl only matches /blog/{id}/file paths', () => {
    assert.equal(
      isBlogHostedUploadUrl(
        'https://zhiyuansofts.cn/blog/27/20260730_abc.webp',
      ),
      true,
    )
    assert.equal(
      isBlogHostedUploadUrl('https://cdn.example.com/blog/1/x.png'),
      true,
    )
    assert.equal(
      isBlogHostedUploadUrl('https://free.picui.cn/external.webp'),
      false,
    )
    assert.equal(isBlogHostedUploadUrl('https://example.com/img.png'), false)
  })

  it('firstContentImageUrl skips cover-only and returns first body image', () => {
    assert.equal(
      firstContentImageUrl(
        't ![a](https://zhiyuansofts.cn/blog/1/a.webp) ![b](https://x/b.png)',
      ),
      'https://zhiyuansofts.cn/blog/1/a.webp',
    )
    assert.equal(firstContentImageUrl('no images'), '')
  })

  it('setMarkdownImageWidth rewrites first matching image', () => {
    const md = 'x ![说明](https://x/a.webp) y ![说明](https://x/a.webp)'
    const next = setMarkdownImageWidth(md, 'https://x/a.webp', 480)
    assert.equal(next, 'x ![说明|480](https://x/a.webp) y ![说明](https://x/a.webp)')
    const cleared = setMarkdownImageWidth(
      '![图|200](https://x/a.webp)',
      'https://x/a.webp',
      0,
    )
    assert.equal(cleared, '![图](https://x/a.webp)')
  })

  it('updateMarkdownImageLayout sets percent and center', () => {
    const base = '![图|400](https://x/a.webp)'
    const centered = updateMarkdownImageLayout(base, 'https://x/a.webp', {
      align: 'center',
      widthPercent: 50,
    })
    assert.equal(centered, '![图|50%|center](https://x/a.webp)')
    const left = updateMarkdownImageLayout(centered, 'https://x/a.webp', {
      align: 'left',
    })
    assert.equal(left, '![图|50%](https://x/a.webp)')
  })

  it('isImageUsedInArticle checks content and cover', () => {
    assert.equal(
      isImageUsedInArticle('https://x/a.webp', '![x](https://x/a.webp)', ''),
      true,
    )
    assert.equal(
      isImageUsedInArticle('https://x/a.webp', 'nope', 'https://x/a.webp'),
      true,
    )
    assert.equal(isImageUsedInArticle('https://x/a.webp', 'nope', ''), false)
  })
})
