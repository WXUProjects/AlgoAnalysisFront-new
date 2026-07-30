import type { SpiderBinding } from '@shared/api'

/** 默认同步间隔约 60 分钟；超过 2× 视为偏旧 */
export const SPIDER_STALE_SECONDS = 2 * 60 * 60

export type SpiderHealthKind = 'ok' | 'never' | 'failed' | 'stale'

export type SpiderHealth = {
  kind: SpiderHealthKind
  /** 短标签，用于 Badge */
  label: string
  /** 更完整说明 */
  detail: string
}

/**
 * 单平台同步健康：失败新于成功 → 异常；从未成功 → 尚未同步；
 * 成功过久 → 偏旧；否则正常。
 */
export function spiderPlatformHealth(
  s: Pick<SpiderBinding, 'lastSyncAt' | 'lastFailAt' | 'lastError'>,
  nowSec = Math.floor(Date.now() / 1000),
): SpiderHealth {
  const ok = Number(s.lastSyncAt) || 0
  const fail = Number(s.lastFailAt) || 0
  const err = (s.lastError || '').trim()

  if (fail > 0 && fail >= ok) {
    return {
      kind: 'failed',
      label: '同步异常',
      detail: err
        ? `最近同步失败：${err}。请检查用户名后重新绑定。`
        : '最近同步失败。请检查用户名后重新绑定。',
    }
  }
  if (ok <= 0) {
    return {
      kind: 'never',
      label: '尚未同步',
      detail: '已绑定，做题数据通常几分钟内开始同步。',
    }
  }
  if (nowSec - ok > SPIDER_STALE_SECONDS) {
    return {
      kind: 'stale',
      label: '同步偏旧',
      detail: '数据可能不是最新，可稍后刷新或检查绑定。',
    }
  }
  return {
    kind: 'ok',
    label: '已同步',
    detail: '近期同步正常。',
  }
}

/** 用户级：已绑定但从未成功 / 整体过旧 */
export function userSyncHealth(
  spiders: SpiderBinding[] | undefined,
  lastSyncAt?: number,
  nowSec = Math.floor(Date.now() / 1000),
): SpiderHealth | null {
  const list = spiders || []
  if (list.length === 0) return null

  const anyFailed = list.some((s) => spiderPlatformHealth(s, nowSec).kind === 'failed')
  if (anyFailed) {
    const first = list.find((s) => spiderPlatformHealth(s, nowSec).kind === 'failed')
    return spiderPlatformHealth(first || list[0], nowSec)
  }

  const ok = Number(lastSyncAt) || 0
  if (ok <= 0) {
    return {
      kind: 'never',
      label: '尚未同步',
      detail: '已绑定 OJ，请稍后再看数据。',
    }
  }
  if (nowSec - ok > SPIDER_STALE_SECONDS) {
    return {
      kind: 'stale',
      label: '同步偏旧',
      detail: '数据有一段时间没更新了，可到「编辑资料」检查绑定。',
    }
  }
  return null
}
