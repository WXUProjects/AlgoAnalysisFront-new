import type { SpiderPlatformStat, SpiderSyncModule } from '@/api/ops'
import { formatCompactNumber } from '@/lib/format'
import { Perm } from '@/lib/permissions'

export type SpiderMonitorTone = 'ok' | 'warn' | 'fail' | 'muted' | 'paused'

export type SpiderModuleStatus = {
  tone: SpiderMonitorTone
  label: string
}

export function canViewSpiderUsers(can: (permission: string) => boolean) {
  return can(Perm.SiteConfigRead)
}

export function spiderToggleFailureMessage(
  platform: string,
  module: SpiderSyncModule,
  enabled: boolean,
) {
  const feature = module === 'submit' ? '提交记录同步' : '题面获取'
  const action = enabled ? '恢复' : '暂停'
  return `${platform}${feature}${action}失败，请稍后重试`
}

function worstTone(a: SpiderMonitorTone, b: SpiderMonitorTone): SpiderMonitorTone {
  const rank: Record<SpiderMonitorTone, number> = {
    muted: 0,
    paused: 1,
    ok: 2,
    warn: 3,
    fail: 4,
  }
  return rank[a] >= rank[b] ? a : b
}

function submitHealth(p: SpiderPlatformStat): SpiderModuleStatus {
  if (!p.hasSubmitFetcher) return { tone: 'muted', label: '不支持' }
  if (p.boundUsers <= 0) return { tone: 'muted', label: '无绑定' }
  if (p.lastFailAt > 0 && p.lastFailAt >= p.lastOkAt) {
    return { tone: 'fail', label: '同步异常' }
  }
  if (p.lastOkAt > 0) return { tone: 'ok', label: '正常' }
  return { tone: 'warn', label: '未同步' }
}

function problemHealth(p: SpiderPlatformStat): SpiderModuleStatus {
  if (!p.hasProblemFetch) return { tone: 'muted', label: '不支持' }
  if (p.problemCount > 0) return { tone: 'ok', label: '正常' }
  return { tone: 'muted', label: '还没有题目' }
}

function contestHealth(p: SpiderPlatformStat): SpiderModuleStatus {
  if (!p.hasContestCalendar) return { tone: 'muted', label: '不支持' }
  if (p.contestCount > 0) return { tone: 'ok', label: '正常' }
  return { tone: 'muted', label: '还没有赛程' }
}

function accountHealth(p: SpiderPlatformStat): SpiderModuleStatus {
  if (!p.hasAccount) return { tone: 'muted', label: '无需账号' }
  if (p.accountStatus === 'ok') return { tone: 'ok', label: '正常' }
  if (p.accountStatus === 'fail') return { tone: 'fail', label: '登录异常' }
  return { tone: 'muted', label: '未验证' }
}

export function getSpiderMonitorView(p: SpiderPlatformStat) {
  const healthStatuses = [
    submitHealth(p),
    problemHealth(p),
    contestHealth(p),
    accountHealth(p),
  ]
  const submit = p.submitPaused
    ? { tone: 'paused' as const, label: '已暂停' }
    : healthStatuses[0]
  const problem = p.problemPaused && p.hasProblemFetch
    ? { tone: 'paused' as const, label: '已暂停' }
    : healthStatuses[1]
  const statuses = [submit, problem, healthStatuses[2], healthStatuses[3]]
  const overall = healthStatuses.reduce<SpiderMonitorTone>(
    (current, status) => worstTone(current, status.tone),
    'muted',
  )

  return {
    statuses,
    submit,
    problem: {
      ...problem,
      display:
        !p.hasProblemFetch || p.problemPaused
          ? problem.label
          : formatCompactNumber(p.problemCount),
    },
    overall,
    overallLabel:
      overall === 'fail'
        ? '异常'
        : overall === 'warn'
          ? '待关注'
          : overall === 'ok'
            ? '正常'
            : '未使用',
    paused: p.submitPaused || p.problemPaused,
  }
}
