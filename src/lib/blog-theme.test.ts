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
  it('defaults to mizuki', () => {
    assert.equal(DEFAULT_BLOG_THEME_ID, 'mizuki')
    assert.equal(normalizeBlogThemeId(undefined), 'mizuki')
    assert.equal(normalizeBlogThemeId(''), 'mizuki')
    assert.equal(normalizeBlogThemeId('SIMPLE'), 'simple')
    assert.equal(normalizeBlogThemeId('chirpy'), 'chirpy')
    assert.equal(normalizeBlogThemeId('CHIRPY'), 'chirpy')
    assert.equal(normalizeBlogThemeId('mizuki'), 'mizuki')
    assert.equal(normalizeBlogThemeId('MIZUKI'), 'mizuki')
  })

  it('resolves mizuki with social links by default', () => {
    const t = resolveBlogTheme({
      socialLinks: [{ type: 'github', url: 'https://github.com/x' }],
    })
    assert.equal(t.themeId, 'mizuki')
    assert.equal(t.useMainSiteTokens, false)
    assert.equal(t.socialLinks.length, 1)
    assert.equal(t.socialLinks[0].type, 'github')
  })

  it('simple theme uses main-site tokens', () => {
    const t = resolveBlogTheme({ themeId: 'simple' })
    assert.equal(t.themeId, 'simple')
    assert.equal(t.useMainSiteTokens, true)
  })

  it('chirpy remains available as optional theme', () => {
    const t = resolveBlogTheme({ themeId: 'chirpy' })
    assert.equal(t.themeId, 'chirpy')
    assert.equal(t.useMainSiteTokens, false)
    assert.equal(DEFAULT_BLOG_THEME_ID, 'mizuki')
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
