import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  cleanSubmitProblem,
  formatActivityProblemTitle,
} from './activity-title'

describe('cleanSubmitProblem', () => {
  it('strips leetcode kebab slug', () => {
    assert.equal(cleanSubmitProblem('two-sum 1. 两数之和'), '1. 两数之和')
    assert.equal(
      cleanSubmitProblem('daily-temperatures 739. 每日温度'),
      '739. 每日温度',
    )
  })

  it('strips leetcode LCR mixed-case slug', () => {
    assert.equal(
      cleanSubmitProblem('iIQa4I LCR 038. 每日温度'),
      'LCR 038. 每日温度',
    )
    assert.equal(cleanSubmitProblem('iIQa4I 每日温度'), '每日温度')
    assert.equal(cleanSubmitProblem('8Zf90G 逆波兰表达式求值'), '逆波兰表达式求值')
  })

  it('keeps CF style index-title', () => {
    assert.equal(cleanSubmitProblem('B-Nikita and Books'), 'B-Nikita and Books')
  })
})

describe('formatActivityProblemTitle', () => {
  it('prefers bank title', () => {
    assert.equal(
      formatActivityProblemTitle('iIQa4I 每日温度', 'LCR 038. 每日温度'),
      'LCR 038. 每日温度',
    )
  })

  it('falls back to cleaned submit problem', () => {
    assert.equal(
      formatActivityProblemTitle('iIQa4I LCR 038. 每日温度'),
      'LCR 038. 每日温度',
    )
  })
})
