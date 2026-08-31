import assert from 'node:assert/strict'
import test from 'node:test'

import { formatTime } from './format'

test('formatTime accepts RFC3339 timestamps', () => {
  const result = formatTime('2026-09-01T00:05:43+08:00')
  assert.notEqual(result, '-')
  assert.match(result, /2026/)
  assert.doesNotMatch(result, /1\/1\/1/)
})

test('formatTime accepts unix seconds and milliseconds', () => {
  const seconds = formatTime(1_788_192_343)
  const milliseconds = formatTime(1_788_192_343_000)
  assert.equal(seconds, milliseconds)
})
