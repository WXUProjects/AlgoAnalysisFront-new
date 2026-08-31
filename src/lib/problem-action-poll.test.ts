import assert from 'node:assert/strict'
import test from 'node:test'

import { isFreshReanalysisCompletion } from './problem-action-poll'

test('rejects a cached completion from before the reanalysis request', () => {
  assert.equal(isFreshReanalysisCompletion({ status: 'COMPLETED', analyzedAt: 100 }, 0, 200), false)
})

test('accepts only a completion newer than the prior analysis and current request', () => {
  assert.equal(isFreshReanalysisCompletion({ status: 'COMPLETED', analyzedAt: 201 }, 100, 200), true)
  assert.equal(isFreshReanalysisCompletion({ status: 'COMPLETED', analyzedAt: 100 }, 100, 200), false)
  assert.equal(isFreshReanalysisCompletion({ status: 'TAGGING', analyzedAt: 201 }, 100, 200), false)
})
