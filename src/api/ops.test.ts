import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildTogglePlatformBody, parseSpiderPlatformStat } from './ops'

const basePlatform = {
  platform: 'AtCoder',
  paused: false,
}

test('旧响应 paused 回退为提交记录暂停状态', () => {
  const stat = parseSpiderPlatformStat({ ...basePlatform, paused: true })

  assert.equal(stat.submitPaused, true)
  assert.equal(stat.problemPaused, false)
})

test('新响应的两个模块暂停状态相互独立', () => {
  const stat = parseSpiderPlatformStat({
    ...basePlatform,
    paused: true,
    submitPaused: false,
    problemPaused: true,
  })

  assert.equal(stat.submitPaused, false)
  assert.equal(stat.problemPaused, true)
})

test('题面暂停状态由 problemPaused 表达', () => {
  const stat = parseSpiderPlatformStat({
    ...basePlatform,
    submitPaused: false,
    problemPaused: true,
  })

  assert.equal(stat.problemPaused, true)
})

test('平台开关请求 body 包含平台、动作和模块', () => {
  assert.deepEqual(buildTogglePlatformBody('AtCoder', false, 'problem'), {
    platform: 'AtCoder',
    enabled: false,
    module: 'problem',
  })
})
