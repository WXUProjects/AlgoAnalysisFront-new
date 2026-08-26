import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { SpiderPlatformStat } from '@/api/ops'
import {
	canViewSpiderUsers,
  getSpiderMonitorView,
  acknowledgeSpiderError,
  isSpiderErrorAcknowledged,
  parseSpiderErrorAcknowledgements,
  spiderErrorFingerprint,
  spiderToggleFailureMessage,
} from './spider-monitor-state'

function platform(overrides: Partial<SpiderPlatformStat> = {}): SpiderPlatformStat {
  return {
    platform: 'AtCoder',
    boundUsers: 1,
    submitCount: 1,
    todayEnqueued: 0,
    todayRows: 0,
    todayOk: 0,
    todayFail: 0,
    lastOkAt: 100,
    lastFailAt: 0,
    lastError: '',
    problemCount: 1,
    contestCount: 1,
    hasSubmitFetcher: true,
    hasProblemFetch: true,
    hasContestCalendar: true,
    hasAccount: false,
    accountStatus: '',
    accountAt: 0,
    accountErr: '',
    submitPaused: false,
    problemPaused: false,
    paused: false,
    ...overrides,
  }
}

test('只有站点配置读取权限可查看平台绑定用户', () => {
  assert.equal(canViewSpiderUsers((permission) => permission === 'site.config.read'), true)
  assert.equal(canViewSpiderUsers((permission) => permission === 'site.spider.ops'), false)
})

test('暂停不覆盖平台整体失败状态', () => {
  const view = getSpiderMonitorView(platform({
    submitPaused: true,
    lastFailAt: 200,
    lastError: 'timeout',
  }))

  assert.equal(view.paused, true)
  assert.equal(view.overall, 'fail')
  assert.equal(view.overallLabel, '异常')
})

test('不支持题面获取时状态行明确显示不支持', () => {
  const view = getSpiderMonitorView(platform({
    hasProblemFetch: false,
    problemCount: 0,
  }))

  assert.equal(view.problem.label, '不支持')
  assert.equal(view.problem.display, '不支持')
})

test('开关失败兜底文案包含平台、模块和动作', () => {
  assert.equal(
    spiderToggleFailureMessage('AtCoder', 'problem', false),
    'AtCoder题面获取暂停失败，请稍后重试',
  )
  assert.equal(
    spiderToggleFailureMessage('洛谷', 'submit', true),
    '洛谷提交记录同步恢复失败，请稍后重试',
  )
})

test('同一条错误确认后隐藏，更新失败时间后重新出现', () => {
  const failed = platform({ lastFailAt: 200, lastError: 'timeout' })
  const acknowledgements = acknowledgeSpiderError({}, failed)

  assert.notEqual(spiderErrorFingerprint(failed), '')
  assert.equal(isSpiderErrorAcknowledged(failed, acknowledgements), true)
  assert.equal(
    isSpiderErrorAcknowledged(platform({ lastFailAt: 201, lastError: 'timeout' }), acknowledgements),
    false,
  )
  assert.equal(
    spiderErrorFingerprint(platform({ lastOkAt: 300, lastFailAt: 200, lastError: 'timeout' })),
    '',
  )
})

test('未暂停平台确认同步和账号错误后分别隐藏两个模块的失败状态', () => {
  const failed = platform({
    lastFailAt: 200,
    lastError: 'timeout',
    hasAccount: true,
    accountStatus: 'fail',
    accountAt: 200,
    accountErr: 'login timeout',
  })

  const view = getSpiderMonitorView(failed, true)

  assert.equal(view.submit.label, '正常')
  assert.equal(view.statuses[3].label, '未验证')
})

test('确认记录解析会拒绝损坏数据和非字符串值', () => {
  assert.deepEqual(parseSpiderErrorAcknowledgements('{bad'), {})
  assert.deepEqual(
    parseSpiderErrorAcknowledgements('{"LuoGu":"fingerprint","QOJ":1}'),
    { LuoGu: 'fingerprint' },
  )
})

test('暂停平台的旧错误确认后整体显示已暂停', () => {
  const view = getSpiderMonitorView(platform({
    submitPaused: true,
    problemPaused: true,
    lastFailAt: 200,
    lastError: 'timeout',
    hasAccount: true,
    accountStatus: 'fail',
    accountAt: 200,
    accountErr: 'timeout',
  }), true)

  assert.equal(view.overall, 'paused')
  assert.equal(view.overallLabel, '已暂停')
})
