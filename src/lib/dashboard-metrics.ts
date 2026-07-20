import type { HeatmapItem } from '@shared/api'
import { ymdToDateKey } from '@/lib/format'

/** 对 heatmap 求和（本期范围内总次数） */
export function sumHeatmap(heat: HeatmapItem[]): number {
  return heat.reduce((acc, h) => acc + h.count, 0)
}

/** 计算某日期范围内的活跃天数（有任何提交的天数） */
export function computeActiveDays(submitHeat: HeatmapItem[]): number {
  return submitHeat.filter((h) => h.count > 0).length
}

/** 日均提交 = 总提交 / 天数（天数=0 时返回 0） */
export function computeDailyAvg(total: number, days: number): number {
  if (days <= 0) return 0
  return Math.round((total / days) * 10) / 10
}

/** 通过率 = ac / submit（分母=0 时返回 0） */
export function computePassRate(ac: number, submit: number): number {
  if (submit <= 0) return 0
  return Math.round((ac / submit) * 1000) / 10
}

/**
 * 本期活跃成员数 = rankTotal（有 AC 记录的总人数）clamp 到 memberTotal。
 * rankTotal 来自 rank API 的 raw.total 字段。
 */
export function computeActiveMembers(rankTotal: number, memberTotal: number): number {
  return Math.min(Math.max(rankTotal, 0), memberTotal)
}

/** 参与率 = 活跃成员 / 总成员（分母=0 时返回 0） */
export function computeParticipationRate(active: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((active / total) * 1000) / 10
}

/** 峰值日：提交量最高的日期 */
export function computePeakDay(heat: HeatmapItem[]): { date: string; count: number } | null {
  if (heat.length === 0) return null
  let peak = heat[0]
  for (const h of heat) {
    if (h.count > peak.count) peak = h
  }
  return { date: ymdToDateKey(peak.date.slice(0, 10)), count: peak.count }
}

/** 最长连续活跃天数（有提交的连续天数） */
export function computeConsecutiveDays(heat: HeatmapItem[]): number {
  if (heat.length === 0) return 0
  const sorted = [...heat]
    .filter((h) => h.count > 0)
    .map((h) => ({ ...h, date: ymdToDateKey(h.date.slice(0, 10)) }))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return 0

  let maxStreak = 1
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1].date}T00:00:00`)
    const curr = new Date(`${sorted[i].date}T00:00:00`)
    const diff = (curr.getTime() - prev.getTime()) / 86400000
    if (diff === 1) {
      streak++
      if (streak > maxStreak) maxStreak = streak
    } else {
      streak = 1
    }
  }
  return maxStreak
}

/** 本地 YYYY-MM-DD 格式化（避免 toISOString 时区偏移） */
function localYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 最近 7 日 vs 前 7 日趋势比较。
 * 使用本地日期格式化，不依赖 toISOString（避免 Asia/Shanghai 时区偏移）。
 * @param endDate 截止日期 YYYY-MM-DD（含），向前推 14 天
 */
export function compareRecent7vsPrev7(
  heat: HeatmapItem[],
  endDate?: string,
): { recent: number; prev: number; delta: number; direction: 'up' | 'down' | 'flat' } {
  // 兼容 YYYY-MM-DD 与 YYYYMMDD；禁止 Invalid Date 导致洞察全 0
  const endKey = endDate ? ymdToDateKey(endDate) : localYmd(new Date())
  const end = new Date(`${endKey}T00:00:00`)
  if (Number.isNaN(end.getTime())) {
    return { recent: 0, prev: 0, delta: 0, direction: 'flat' }
  }
  const map = new Map(
    heat.map((h) => [ymdToDateKey(h.date.slice(0, 10)), h.count]),
  )

  let recent = 0
  let prev = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    recent += map.get(localYmd(d)) ?? 0
  }
  for (let i = 7; i < 14; i++) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    prev += map.get(localYmd(d)) ?? 0
  }
  const delta = recent - prev
  return {
    recent,
    prev,
    delta,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
  }
}

/**
 * 本期暂无 AC 的成员数 = max(memberTotal - rankTotal, 0)。
 * rankTotal 是有 AC 记录的总人数（来自 rank API raw.total）。
 */
export function computeNoAcMembers(memberTotal: number, rankTotal: number): number {
  return Math.max(memberTotal - Math.max(rankTotal, 0), 0)
}

/**
 * 按星期分布（0=周日 … 6=周六）。
 * 返回长度 7 的数组，每个元素为该星期的总提交数。
 */
export function computeWeekdayDistribution(heat: HeatmapItem[]): number[] {
  const dist = [0, 0, 0, 0, 0, 0, 0]
  for (const h of heat) {
    if (h.count <= 0) continue
    const d = new Date(`${ymdToDateKey(h.date.slice(0, 10))}T00:00:00`)
    if (Number.isNaN(d.getTime())) continue
    const day = d.getDay()
    dist[day] += h.count
  }
  return dist
}

/** 星期中文名 */
export const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const
