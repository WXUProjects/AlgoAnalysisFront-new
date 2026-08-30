import assert from 'node:assert/strict'
import { test } from 'node:test'
import { auditDateRange, filtersForTab, isCurrentPluginRequest, platformLabel } from './PluginsManage'

test('uses the backend platform value while keeping the Luogu label', () => {
  assert.equal(platformLabel('luogu'), '洛谷')
  assert.equal(platformLabel('LuoGu'), '洛谷')
})

test('converts local calendar dates to inclusive start and exclusive next-day timestamps', () => {
  assert.deepEqual(auditDateRange('2026-08-30', '2026-08-31'), {
    from: new Date(2026, 7, 30, 0, 0, 0, 0).getTime() / 1000,
    to: new Date(2026, 8, 1, 0, 0, 0, 0).getTime() / 1000,
  })
})

test('clears audit-only filters when switching to authorizations', () => {
  const params = new URLSearchParams('tab=audits&status=completed&from=10&to=20&keyword=alice')
  assert.equal(filtersForTab(params, 'authorizations').get('status'), null)
  assert.equal(filtersForTab(params, 'authorizations').get('from'), null)
  assert.equal(filtersForTab(params, 'authorizations').get('to'), null)
  assert.equal(filtersForTab(params, 'authorizations').get('keyword'), 'alice')
})

test('only the latest plugin request is allowed to update state', () => {
  assert.equal(isCurrentPluginRequest(2, 2), true)
  assert.equal(isCurrentPluginRequest(1, 2), false)
})
