import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  colorSchemeControlLabel,
  colorSchemeCycleHint,
  colorSchemeLabel,
  nextColorScheme,
  normalizeColorScheme,
  resolveBlogColorScheme,
  resolveColorScheme,
} from './color-scheme.ts'

describe('color scheme', () => {
  it('normalizes known modes and defaults to system', () => {
    assert.equal(normalizeColorScheme('light'), 'light')
    assert.equal(normalizeColorScheme('DARK'), 'dark')
    assert.equal(normalizeColorScheme('system'), 'system')
    assert.equal(normalizeColorScheme('auto'), 'system')
    assert.equal(normalizeColorScheme(undefined), 'system')
    assert.equal(normalizeColorScheme(''), 'system')
  })

  it('cycles light → dark → system → light', () => {
    assert.equal(nextColorScheme('light'), 'dark')
    assert.equal(nextColorScheme('dark'), 'system')
    assert.equal(nextColorScheme('system'), 'light')
    assert.equal(nextColorScheme(undefined), 'light')
  })

  it('exposes Chinese labels for all three modes', () => {
    assert.equal(colorSchemeLabel('light'), '浅色')
    assert.equal(colorSchemeLabel('dark'), '深色')
    assert.equal(colorSchemeLabel('system'), '跟随系统')
    assert.equal(colorSchemeControlLabel('system'), '外观：跟随系统')
    assert.match(colorSchemeCycleHint('light'), /深色/)
  })

  it('resolves system against explicit flag', () => {
    assert.equal(resolveColorScheme('light'), 'light')
    assert.equal(resolveColorScheme('dark'), 'dark')
    assert.equal(resolveColorScheme('system', true), 'dark')
    assert.equal(resolveColorScheme('system', false), 'light')
  })

  it('blog effective mode falls back to author default then system', () => {
    assert.equal(
      resolveBlogColorScheme({ authorDefault: 'dark' }),
      'dark',
    )
    assert.equal(
      resolveBlogColorScheme({ authorDefault: undefined }),
      'system',
    )
  })
})
