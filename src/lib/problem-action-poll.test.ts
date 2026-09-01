import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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

test('confirms a successful reanalysis request before polling', () => {
  const source = readFileSync(new URL('../pages/QuestionBankDetail.tsx', import.meta.url), 'utf8')
  const successToast = source.indexOf("toast.success('已进入分析队列，请稍等')")
  const startPolling = source.indexOf("startActionPolling('reanalyze'")

  assert.notEqual(successToast, -1)
  assert.ok(successToast < startPolling)
})
