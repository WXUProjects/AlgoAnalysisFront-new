import test from 'node:test'
import assert from 'node:assert/strict'
import { createScrollPositionStore, getScrollAction } from './route-scroll-restoration'

test('stores scroll positions independently for each history entry', () => {
  const store = createScrollPositionStore()
  store.set('list', { container: 840, window: 12 })
  store.set('detail', { container: 0, window: 0 })
  assert.deepEqual(store.get('list'), { container: 840, window: 12 })
  assert.deepEqual(store.get('detail'), { container: 0, window: 0 })
})

test('restores only on POP navigation', () => {
  assert.equal(getScrollAction('POP', { container: 840, window: 12 }), 'restore')
  assert.equal(getScrollAction('PUSH'), 'top')
  assert.equal(getScrollAction('REPLACE'), 'top')
})

test('returns to the top when a POP position is unavailable', () => {
  assert.equal(getScrollAction('POP'), 'top')
})

test('returns to the top for an unknown navigation type', () => {
  assert.equal(getScrollAction('UNKNOWN'), 'top')
})
