/**
 * Discover Feed pure helpers — unit-tested, no React.
 * Collapse rules, cursor page merge, chip filters.
 */

/** Feed secondary chip keys mapped onto real activity kinds */
export type FeedChipKey =
  | 'all'
  | 'submit'
  | 'solution'
  | 'comment'
  | 'share'

export const FEED_CHIPS: ReadonlyArray<{ key: FeedChipKey; label: string }> = [
  { key: 'all', label: '#全部' },
  { key: 'submit', label: '#算法提交' },
  { key: 'solution', label: '#算法题解' },
  { key: 'comment', label: '#代码求助' },
  { key: 'share', label: '#经验分享' },
] as const

export type DiscoverTabKey = 'recommend' | 'feed' | 'orgs'

/** Normalize ?tab= ; legacy rank → recommend（排行改右侧挂件） */
export function normalizeDiscoverTab(raw: string | null): DiscoverTabKey {
  if (raw === 'feed' || raw === 'orgs' || raw === 'recommend') {
    return raw
  }
  // 旧排行榜 Tab 并入推荐（右侧仍有热门榜）
  if (raw === 'rank') return 'recommend'
  // 兼容旧「搜用户」Tab / 缺省
  if (raw === 'users' || raw === 'discover') return 'recommend'
  return 'recommend'
}

export type UnifiedFeedKind = 'submit' | 'solution' | 'comment' | 'share'

export interface UnifiedFeedItemBase {
  /** Stable unique key for list merge / virtual row */
  uid: string
  kind: UnifiedFeedKind
  /** Sort / cursor time in unix seconds */
  timeSec: number
}

const DEFAULT_COLLAPSE_LINES = 6

/**
 * Decide whether preview body should collapse.
 * - more than maxLines lines → collapse
 * - fenced code block longer than maxLines → collapse
 */
export function shouldCollapseContent(
  text: string,
  maxLines = DEFAULT_COLLAPSE_LINES,
): boolean {
  if (!text) return false
  const normalized = text.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  if (lines.length > maxLines) return true
  // long single-line dumps (e.g. minified logs)
  if (normalized.length > 480) return true
  const fence = normalized.match(/```[\s\S]*?```/g)
  if (fence) {
    for (const block of fence) {
      if (block.split('\n').length > maxLines) return true
    }
  }
  return false
}

/**
 * Split content into preview (≤ maxLines) + remainder flag.
 * Preserves leading lines; does not re-implement markdown rendering.
 */
export function excerptContent(
  text: string,
  maxLines = DEFAULT_COLLAPSE_LINES,
): { preview: string; collapsed: boolean; totalLines: number } {
  const normalized = (text || '').replace(/\r\n/g, '\n')
  const lines = normalized.length ? normalized.split('\n') : []
  const collapsed = shouldCollapseContent(normalized, maxLines)
  if (!collapsed) {
    return { preview: normalized, collapsed: false, totalLines: lines.length }
  }
  return {
    preview: lines.slice(0, maxLines).join('\n'),
    collapsed: true,
    totalLines: lines.length,
  }
}

/**
 * Append a cursor page without duplicate ids.
 * `getId` defaults to `item.uid` then `item.id`.
 */
export function mergeCursorPage<T>(
  prev: T[],
  next: T[],
  getId: (item: T) => string | number = defaultId,
): T[] {
  if (!next.length) return prev
  const seen = new Set(prev.map(getId))
  const appended: T[] = []
  for (const item of next) {
    const id = getId(item)
    if (seen.has(id)) continue
    seen.add(id)
    appended.push(item)
  }
  return appended.length ? [...prev, ...appended] : prev
}

function defaultId(item: unknown): string | number {
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>
    if (o.uid != null && o.uid !== '') return String(o.uid)
    if (o.id != null) return o.id as string | number
  }
  return String(item)
}

/** Normalize chip query param */
export function normalizeFeedChip(raw: string | null | undefined): FeedChipKey {
  if (
    raw === 'all' ||
    raw === 'submit' ||
    raw === 'solution' ||
    raw === 'comment' ||
    raw === 'share'
  ) {
    return raw
  }
  return 'all'
}

/**
 * Filter unified feed items by secondary chip.
 * - all: keep everything
 * - submit / solution / comment: exact kind
 * - share: soft map → solution (经验分享 ≈ 题解长文), no invented kinds
 */
export function filterFeedByChip<T extends { kind: string }>(
  items: T[],
  chip: FeedChipKey,
): T[] {
  if (chip === 'all') return items
  if (chip === 'share') {
    return items.filter((i) => i.kind === 'solution' || i.kind === 'share')
  }
  return items.filter((i) => i.kind === chip)
}

/** Parse submit log time (unix sec/ms or numeric string) → seconds */
export function toTimeSec(value: unknown): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n > 1e12 ? Math.floor(n / 1000) : Math.floor(n)
}

/** Relative time for F-pattern row1 (e.g. 「2 小时前」) */
export function formatRelativeTime(
  value: unknown,
  nowMs: number = Date.now(),
): string {
  const sec = toTimeSec(value)
  if (!sec) return ''
  const diff = Math.max(0, Math.floor(nowMs / 1000) - sec)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`
  try {
    return new Date(sec * 1000).toLocaleDateString('zh-CN')
  } catch {
    return ''
  }
}

export function submitActionLabel(status?: string): string {
  const s = (status || '').toLowerCase()
  if (s.includes('accept') || s === 'ac' || s.includes('通过')) return '通过了题目'
  if (s.includes('wrong') || s.includes('答案错误')) return '提交了代码'
  return '提交了代码'
}

export function activityActionLabel(type: string): string {
  if (type === 'solution' || type === 'share') return '发表了题解'
  if (type === 'comment') return '参与了讨论'
  return '发布了动态'
}

/**
 * Whether chronological Feed may start a network load.
 * following-only requires login; callers must clear loading flags on deny.
 */
export function canLoadFeedStream(opts: {
  followingOnly: boolean
  isLogin: boolean
}): { allow: true } | { allow: false; reason: 'login_required_following' } {
  if (opts.followingOnly && !opts.isLogin) {
    return { allow: false, reason: 'login_required_following' }
  }
  return { allow: true }
}

/**
 * Combine per-source exhaustion into a single hasMore for mixed chips.
 * - chip=all (submit + activity both active): either source still has pages
 * - submit-only / activity-only: that source alone
 * - activity not loaded this round (e.g. followingOnly): treat activity as exhausted
 */
export function computeFeedHasMore(opts: {
  needsSubmit: boolean
  needsActivity: boolean
  /** true if submit page returned a full page (more may exist) */
  submitMore: boolean
  /** true if activity page indicates more */
  activityMore: boolean
  /** whether activity was actually requested this load */
  activityLoaded: boolean
}): boolean {
  const {
    needsSubmit,
    needsActivity,
    submitMore,
    activityMore,
    activityLoaded,
  } = opts

  if (needsSubmit && needsActivity) {
    if (!activityLoaded) return submitMore
    return submitMore || activityMore
  }
  if (needsSubmit) return submitMore
  if (needsActivity) return activityLoaded ? activityMore : false
  return false
}

/** Page-size heuristic: short page ⇒ exhausted */
export function pageHasMore(received: number, pageSize: number): boolean {
  return received >= pageSize
}

/** Activity page-based more flag (mirrors FeedStream server contract) */
export function activityPageHasMore(opts: {
  listLength: number
  pageSize: number
  page: number
  total: number
}): boolean {
  return (
    opts.listLength >= opts.pageSize || opts.page * opts.pageSize < opts.total
  )
}
