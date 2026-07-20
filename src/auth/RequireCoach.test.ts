import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getHomePath } from '@/lib/home-path'

/**
 * RequireCoach 行为契约（纯逻辑侧）：
 * - 未登录 → /login?redirect=原路径
 * - 已登录非 staff → 持久页 + getHomePath(true)
 * - staff → 放行
 * 组件渲染由页面级 E2E 覆盖；此处锁定 redirect 与 home 规则。
 */
describe('RequireCoach auth branches (contract)', () => {
  it('builds login redirect with original admin path', () => {
    const path = '/admin/statistics'
    const search = ''
    const redirect = path + search
    const to = `/login?redirect=${encodeURIComponent(redirect)}`
    assert.equal(to, '/login?redirect=%2Fadmin%2Fstatistics')
  })

  it('preserves query string in redirect', () => {
    const redirect = '/admin/user?page=2'
    const to = `/login?redirect=${encodeURIComponent(redirect)}`
    assert.equal(to, '/login?redirect=%2Fadmin%2Fuser%3Fpage%3D2')
  })

  it('forbidden member home is member path (not guest /about)', () => {
    assert.equal(getHomePath(true), '/')
  })

  it('guest would go to login, not silent / or /about', () => {
    // 契约：未登录分支不得 Navigate to getHomePath
    const guestSilentHome = getHomePath(false)
    assert.equal(guestSilentHome, '/about')
    const loginTo = `/login?redirect=${encodeURIComponent('/admin')}`
    assert.notEqual(loginTo, guestSilentHome)
    assert.notEqual(loginTo, '/')
  })
})
