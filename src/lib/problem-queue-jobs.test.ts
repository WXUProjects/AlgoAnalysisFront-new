import assert from 'node:assert/strict'
import test from 'node:test'

import { queuedProblemJobs } from './problem-queue-jobs'

test('derives pending fetch and analysis rows without calling them queued', () => {
  const rows = queuedProblemJobs(
    [
      { id: 1, status: 'FETCHING', title: 'fetch' },
      { id: 2, status: 'TAGGING', title: 'analyze' },
      { id: 3, status: 'FAILED', title: 'failed' },
    ],
    [],
  )
  assert.deepEqual(
    rows.map((row) => [row.id, row.queueLabel, row.queued]),
    [
      [1, '题面获取 · 待处理', true],
      [2, 'AI 分析 · 待处理', true],
    ],
  )
})

test('excludes jobs already running in a worker', () => {
  const rows = queuedProblemJobs(
    [
      { id: 1, status: 'FETCHING' },
      { id: 2, status: 'TAGGING' },
    ],
    [
      { problemId: 1, stage: 'fetch' },
      { problemId: 2, stage: 'analyze' },
    ],
  )
  assert.deepEqual(rows, [])
})
