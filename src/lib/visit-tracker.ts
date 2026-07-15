import { visitPing } from '@/api/site'

const VISITOR_KEY = 'goalgo_visitor_id'
const lastPing = new Map<string, number>()
const THROTTLE_MS = 25_000

function ensureVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (id && id.length >= 8) return id
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(VISITOR_KEY, id)
    return id
  } catch {
    return `s_${Date.now().toString(36)}`
  }
}

/** 路由变化时上报访问；同 path 约 25s 内只打一次（与后端 30s 对齐） */
export function trackPageVisit(pathname: string) {
  const path = pathname || '/'
  const now = Date.now()
  const prev = lastPing.get(path) ?? 0
  if (now - prev < THROTTLE_MS) return
  lastPing.set(path, now)
  const visitorId = ensureVisitorId()
  void visitPing(path, visitorId).catch(() => {
    /* 静默失败，不影响浏览 */
  })
}
