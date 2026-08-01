import type { SpiderBinding } from '@shared/api'

/** 默认同步间隔约 60 分钟；超过 2× 视为偏旧 */
export const SPIDER_STALE_SECONDS = 2 * 60 * 60

export type SpiderHealthKind = 'ok' | 'never' | 'failed' | 'stale'

/** 失败归因：用户可修（用户名） vs 系统/站点侧 */
export type SpiderFault = 'user' | 'system' | 'unknown'

export type SpiderHealth = {
  kind: SpiderHealthKind
  /** 短标签，用于 Badge */
  label: string
  /** 更完整说明 */
  detail: string
  /** 仅 failed 时有意义 */
  fault?: SpiderFault
  /** 涉及的平台展示名（如 Codeforces、牛客） */
  platforms?: string[]
}

const PLATFORM_LABEL: Record<string, string> = {
  AtCoder: 'AtCoder',
  NowCoder: '牛客',
  CodeForces: 'Codeforces',
  Codeforces: 'Codeforces',
  LuoGu: '洛谷',
  Luogu: '洛谷',
  LeetCode: '力扣',
  QOJ: 'QOJ',
  LOJ: 'LOJ',
  UOJ: 'UOJ',
}

export function spiderPlatformLabel(platform?: string): string {
  const p = (platform || '').trim()
  if (!p) return 'OJ'
  return PLATFORM_LABEL[p] || p
}

/**
 * 把 lastError（后端短文案或历史原始堆栈）收成用户可读说明，并判断该怪谁。
 * 后端新版已写「Codeforces：…一般不是账号问题」；仍兼容旧 Redis 里的 HTML/all platforms failed。
 */
export function explainSpiderError(raw: string, platform?: string): {
  fault: SpiderFault
  summary: string
  detail: string
} {
  const name = spiderPlatformLabel(platform)
  const err = (raw || '').trim()
  if (!err) {
    return {
      fault: 'unknown',
      summary: '同步失败',
      detail: `${name} 最近同步失败，请稍后再试。`,
    }
  }

  // 后端已格式化：直接用，并识别 fault
  if (err.includes('一般不是账号问题')) {
    return {
      fault: 'system',
      summary: err.replace(/。一般不是账号问题.*$/, ''),
      detail: err.endsWith('。') ? err : `${err}`,
    }
  }
  if (err.includes('请检查绑定的用户名') || err.includes('请检查用户名')) {
    return {
      fault: 'user',
      summary: err.replace(/。请检查绑定的用户名.*$/, '').replace(/。请检查用户名.*$/, ''),
      detail: err,
    }
  }

  const lower = err.toLowerCase()

  // 用户侧
  const userHints = [
    'not found',
    'handle 为空',
    'username 为空',
    '用户不存在',
    '用户名不存在',
    'unknown handle',
    'no such user',
    'invalid handle',
    '找不到用户',
    '未找到该用户',
  ]
  if (userHints.some((h) => lower.includes(h))) {
    return {
      fault: 'user',
      summary: '未找到该用户',
      detail: `${name} 未找到绑定的用户，请检查用户名后重新绑定。`,
    }
  }

  // 系统侧
  if (
    lower.includes('403') ||
    lower.includes('forbidden') ||
    lower.includes('拒绝访问') ||
    lower.includes('nginx') ||
    lower.includes('<html') ||
    lower.includes('cloudflare')
  ) {
    return {
      fault: 'system',
      summary: '对方站点暂时拒绝访问',
      detail: `${name} 暂时拉不到数据（对方站点拦截或网络异常），一般不是你的账号问题，请稍后再试。`,
    }
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('限流')) {
    return {
      fault: 'system',
      summary: '请求过于频繁',
      detail: `${name} 同步过于频繁被限流，请稍后再试。`,
    }
  }
  if (
    lower.includes('timeout') ||
    lower.includes('deadline') ||
    lower.includes('超时') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504')
  ) {
    return {
      fault: 'system',
      summary: '站点暂时不可用',
      detail: `${name} 同步超时或对方站点异常，请稍后再试。`,
    }
  }
  if (
    lower.includes('connection') ||
    lower.includes('network') ||
    lower.includes('tls') ||
    lower.includes('x509') ||
    lower.includes('no such host')
  ) {
    return {
      fault: 'system',
      summary: '网络连接失败',
      detail: `${name} 同步时网络异常，请稍后再试。`,
    }
  }
  if (lower.includes('all platforms failed') || lower.includes('platforms failed')) {
    return {
      fault: 'system',
      summary: '同步失败',
      detail: `${name} 同步失败，一般不是账号问题，请稍后再试。`,
    }
  }

  // 未知：不甩 HTML，不默认怪用户名
  let cleaned = err
  const htmlAt = cleaned.toLowerCase().search(/<html|<!doctype/)
  if (htmlAt >= 0) cleaned = cleaned.slice(0, htmlAt).trim()
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  if (cleaned.length > 60) cleaned = `${cleaned.slice(0, 60)}…`
  // 去掉无信息前缀
  cleaned = cleaned
    .replace(/^all platforms failed for user \d+:\s*/i, '')
    .replace(/^\d+\/\d+ platforms failed user=\d+:\s*/i, '')
    .replace(/^[A-Za-z]+ sync failed user=\d+:\s*/i, '')
    .trim()
  if (!cleaned || cleaned.startsWith('<')) {
    return {
      fault: 'system',
      summary: '同步失败',
      detail: `${name} 同步失败，请稍后再试。`,
    }
  }
  return {
    fault: 'system',
    summary: cleaned,
    detail: `${name}：${cleaned}。若反复出现且账号无误，请稍后再试。`,
  }
}

/**
 * 单平台同步健康：失败新于成功 → 异常；从未成功 → 尚未同步；
 * 成功过久 → 偏旧；否则正常。
 */
export function spiderPlatformHealth(
  s: Pick<SpiderBinding, 'lastSyncAt' | 'lastFailAt' | 'lastError'> & {
    platform?: string
  },
  nowSec = Math.floor(Date.now() / 1000),
): SpiderHealth {
  const ok = Number(s.lastSyncAt) || 0
  const fail = Number(s.lastFailAt) || 0
  const err = (s.lastError || '').trim()
  const name = spiderPlatformLabel(s.platform)

  if (fail > 0 && fail >= ok) {
    const explained = explainSpiderError(err, s.platform)
    return {
      kind: 'failed',
      label: '同步异常',
      detail: explained.detail,
      fault: explained.fault,
      platforms: [name],
    }
  }
  if (ok <= 0) {
    return {
      kind: 'never',
      label: '尚未同步',
      detail: '已绑定，做题数据通常几分钟内开始同步。',
      platforms: [name],
    }
  }
  if (nowSec - ok > SPIDER_STALE_SECONDS) {
    return {
      kind: 'stale',
      label: '同步偏旧',
      detail: '数据可能不是最新，可稍后刷新或检查绑定。',
      platforms: [name],
    }
  }
  return {
    kind: 'ok',
    label: '已同步',
    detail: '近期同步正常。',
    platforms: [name],
  }
}

/** 用户级：已绑定但从未成功 / 整体过旧 / 有平台失败 */
export function userSyncHealth(
  spiders: SpiderBinding[] | undefined,
  lastSyncAt?: number,
  nowSec = Math.floor(Date.now() / 1000),
): SpiderHealth | null {
  const list = spiders || []
  if (list.length === 0) return null

  const failed = list.filter((s) => spiderPlatformHealth(s, nowSec).kind === 'failed')
  if (failed.length > 0) {
    const names = failed.map((s) => spiderPlatformLabel(s.platform))
    const faults = failed.map((s) => spiderPlatformHealth(s, nowSec).fault || 'unknown')
    const allUser = faults.every((f) => f === 'user')
    const anySystem = faults.some((f) => f === 'system')
    const nameStr = names.join('、')

    if (failed.length === 1) {
      // 单平台：直接用该平台 detail（已含平台名与归因）
      return spiderPlatformHealth(failed[0], nowSec)
    }

    if (allUser) {
      return {
        kind: 'failed',
        label: '同步异常',
        detail: `${nameStr} 未找到对应用户，请检查绑定用户名。`,
        fault: 'user',
        platforms: names,
      }
    }
    if (anySystem || faults.some((f) => f === 'unknown')) {
      return {
        kind: 'failed',
        label: '同步异常',
        detail: `${nameStr} 暂时同步失败，一般不是账号问题，请稍后再试。`,
        fault: 'system',
        platforms: names,
      }
    }
    return {
      kind: 'failed',
      label: '同步异常',
      detail: `${nameStr} 同步异常，请稍后再试或检查绑定。`,
      fault: 'unknown',
      platforms: names,
    }
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
