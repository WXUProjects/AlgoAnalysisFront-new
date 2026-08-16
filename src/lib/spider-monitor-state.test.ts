import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { SpiderPlatformStat } from '@/api/ops'
import {
	canViewSpiderUsers,
  getSpiderMonitorView,
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
