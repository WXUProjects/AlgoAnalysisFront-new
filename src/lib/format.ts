import { num } from '@/lib/http'

/**
 * 后台统计用紧凑数字：≤1000 原样；超过 1000 为 1.xk / 1.xM（一位小数）。
 * 后台看板不需要精确到个位，避免大数撑破卡片。
 */
export function formatCompactNumber(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '-'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs <= 1000) {
    return sign + String(Math.round(abs))
  }
  if (abs < 1_000_000) {
    const k = Math.round((abs / 1000) * 10) / 10
    return `${sign}${k.toFixed(1)}k`
  }
  const m = Math.round((abs / 1_000_000) * 10) / 10
  return `${sign}${m.toFixed(1)}M`
}

/** unix 秒或毫秒 → 本地时间字符串 */
export function formatTime(value: unknown): string {
  const n = num(value, 0)
  if (!n) return '-'
  const ms = n > 1e12 ? n : n * 1000
  try {
    return new Date(ms).toLocaleString('zh-CN')
  } catch {
    return '-'
  }
}

/** 题目标题：去掉 AtCoder 页头夹带的 Editorial / 换行空白 */
export function cleanProblemTitle(title?: string | null, fallback = ''): string {
  const raw = (title || '').replace(/\r/g, '\n')
  for (const line of raw.split('\n')) {
    let t = line.trim()
    if (!t) continue
    if (/^editorial$/i.test(t) || t === '解説') continue
    t = t.replace(/\s*Editorial\s*$/i, '').replace(/\s*解説\s*$/, '').trim()
    t = t.replace(/\s+/g, ' ')
    if (t) return t
  }
  const one = raw.replace(/\s+/g, ' ').trim()
  return one || fallback
}

/** 题库处理阶段 status → 中文 */
export function formatPipelineStage(stage?: string | null): string {
  const s = (stage || '').trim()
  if (!s) return '-'
  const map: Record<string, string> = {
    fetch: '获取题面中',
    analyze: '分析中',
    PENDING: '待获取题面',
    FETCHING: '获取题面中',
    TAGGING: '待分析',
    COMPLETED: '已完成',
    FAILED: '失败（可重试）',
    FAILED_PERM: '永久失败',
    SKIPPED: '已跳过',
  }
  return map[s] || map[s.toUpperCase()] || map[s.toLowerCase()] || s
}

export function todayYmd(): string {
  return dateToYmd(new Date())
}

/** 相对今天往前 offsetDays 天的 YYYYMMDD（0=今天） */
export function daysAgoYmd(offsetDays: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - offsetDays)
  return dateToYmd(d)
}

function dateToYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export function ymdToDateKey(ymd: string): string {
  // 20250101 → 2025-01-01
  if (ymd.length === 8) {
    return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
  }
  return ymd
}

export function dateKeyToParts(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number)
  return { y: y || 0, m: m || 0, d: d || 0 }
}
