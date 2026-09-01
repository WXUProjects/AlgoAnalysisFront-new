import assert from 'node:assert/strict'
import test from 'node:test'

import { paginateProblemJobs, queuedProblemJobs } from './problem-queue-jobs'

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

test('does not infer pending jobs when the real queues are empty', () => {
  const rows = queuedProblemJobs(
    [
      { id: 1, status: 'FETCHING' },
      { id: 2, status: 'TAGGING' },
    ],
    [],
    { fetch: 0, analyze: 0 },
  )

  assert.deepEqual(rows, [])
})

test('limits inferred rows to each real queue count', () => {
  const rows = queuedProblemJobs(
    [
      { id: 1, status: 'FETCHING' },
      { id: 2, status: 'FETCHING' },
      { id: 3, status: 'TAGGING' },
      { id: 4, status: 'TAGGING' },
    ],
    [],
    { fetch: 1, analyze: 1 },
  )

  assert.deepEqual(rows.map((row) => row.id), [1, 3])
})

test('paginates processing jobs eight rows at a time', () => {
  const rows = Array.from({ length: 18 }, (_, index) => ({ id: index + 1 }))

  assert.deepEqual(
    paginateProblemJobs(rows, 2).map((row) => row.id),
    [9, 10, 11, 12, 13, 14, 15, 16],
  )
})
