import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { blogThemeStyle, resolveBlogTheme } from './blog-theme.ts'

describe('blog theme hooks', () => {
  it('defaults to main-site tokens when disabled', () => {
    const t = resolveBlogTheme({ enabled: false, customTheme: { cssVars: { '--x': '1' } } })
    assert.equal(t.enabled, false)
    assert.equal(t.customTheme, null)
    assert.equal(t.useMainSiteTokens, true)
    assert.equal(blogThemeStyle(t), undefined)
  })

  it('keeps main-site when enabled but no custom payload', () => {
    const t = resolveBlogTheme({ enabled: true })
    assert.equal(t.enabled, true)
    assert.equal(t.useMainSiteTokens, true)
  })

  it('exposes css vars only when enabled with payload', () => {
    const t = resolveBlogTheme({
      enabled: true,
      customTheme: { cssVars: { '--primary': 'oklch(0.5 0.1 200)' } },
    })
    assert.equal(t.useMainSiteTokens, false)
    assert.deepEqual(blogThemeStyle(t), { '--primary': 'oklch(0.5 0.1 200)' })
  })
})
