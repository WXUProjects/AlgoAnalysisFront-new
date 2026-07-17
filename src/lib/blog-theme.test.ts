import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  blogThemeStyle,
  normalizeBlogThemeId,
  normalizeSocialLinks,
  resolveBlogTheme,
  DEFAULT_BLOG_THEME_ID,
} from './blog-theme.ts'

describe('blog theme', () => {
  it('defaults to chirpy', () => {
    assert.equal(DEFAULT_BLOG_THEME_ID, 'chirpy')
    assert.equal(normalizeBlogThemeId(undefined), 'chirpy')
    assert.equal(normalizeBlogThemeId(''), 'chirpy')
    assert.equal(normalizeBlogThemeId('SIMPLE'), 'simple')
    assert.equal(normalizeBlogThemeId('mizuki'), 'mizuki')
    assert.equal(normalizeBlogThemeId('MIZUKI'), 'mizuki')
  })

  it('resolves chirpy with social links by default', () => {
    const t = resolveBlogTheme({
      socialLinks: [{ type: 'github', url: 'https://github.com/x' }],
    })
    assert.equal(t.themeId, 'chirpy')
    assert.equal(t.useMainSiteTokens, false)
    assert.equal(t.socialLinks.length, 1)
    assert.equal(t.socialLinks[0].type, 'github')
  })

  it('simple theme uses main-site tokens', () => {
    const t = resolveBlogTheme({ themeId: 'simple' })
    assert.equal(t.themeId, 'simple')
    assert.equal(t.useMainSiteTokens, true)
  })

  it('mizuki is optional and not default', () => {
    const t = resolveBlogTheme({ themeId: 'mizuki' })
    assert.equal(t.themeId, 'mizuki')
    assert.equal(t.useMainSiteTokens, false)
    assert.notEqual(DEFAULT_BLOG_THEME_ID, 'mizuki')
  })

  it('exposes css vars only when custom payload present', () => {
    const t = resolveBlogTheme({
      enabled: true,
      customTheme: { cssVars: { '--primary': 'oklch(0.5 0.1 200)' } },
    })
    assert.deepEqual(blogThemeStyle(t), {
      '--primary': 'oklch(0.5 0.1 200)',
    })
  })

  it('normalizes social links', () => {
    assert.deepEqual(
      normalizeSocialLinks([
        { type: ' GitHub ', url: ' https://github.com/a ' },
        { type: '', url: 'x' },
        null,
      ]),
      [{ type: 'github', url: 'https://github.com/a' }],
    )
  })
})
