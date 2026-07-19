import type { NavigateFunction } from 'react-router-dom'

/**
 * 移动端返回目标：优先浏览器/SPA 历史，否则落到逻辑上级路由。
 * 主 Tab / 入口页视为「根」，不显示返回。
 */

const TOP_LEVEL = new Set([
  '/',
  '/about',
  '/discover',
  '/blog-plaza',
  '/contest',
  '/bulletin',
  '/question-bank',
  '/problemset',
  '/tools',
  '/all-activities',
  '/org',
  '/admin',
  '/login',
  '/register',
  '/forgot-password',
  '/profile',
  '/social',
])

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/'
}

/** 当前是否为侧栏主入口（移动端不显示返回） */
export function isMobileNavRoot(pathname: string): boolean {
  const path = normalizePath(pathname)
  if (TOP_LEVEL.has(path)) return true
  // /profile 自己的资料是入口；/profile/xxx 是别人资料，可返回
  if (path === '/profile') return true
  return false
}

/**
 * 逻辑上级路径（无历史栈时使用）。
 * 保证「能进能出」：详情 → 列表 → 首页。
 */
export function resolveParentPath(pathname: string): string {
  const path = normalizePath(pathname)

  // —— 后台 ——
  if (path === '/admin') return '/'
  if (path.startsWith('/admin/')) return '/admin'

  // —— 比赛 ——
  if (/^\/contest\/[^/]+/.test(path)) return '/contest'

  // —— 题库 / 题解 ——
  if (path === '/question-bank/add-problem') return '/question-bank'
  if (path.includes('/edit-content')) {
    const base = path.replace(/\/edit-content.*$/, '')
    return base || '/question-bank'
  }
  if (path.includes('/solution/')) {
    const m = path.match(/^(.*\/detail\/[^/]+)/)
    if (m) return m[1]
    return '/question-bank'
  }
  if (path.startsWith('/question-bank/detail/')) return '/question-bank'

  // —— 题单 ——
  if (path.includes('/add-problem') && path.startsWith('/problemset/')) {
    return path.replace(/\/add-problem.*$/, '') || '/problemset'
  }
  if (path.startsWith('/problemset/') && path !== '/problemset') return '/problemset'

  // —— 资料 / 社交 ——
  if (
    path === '/change-profile' ||
    path === '/privacy' ||
    path === '/change-password'
  ) {
    return '/profile'
  }
  if (path.startsWith('/profile/')) return '/discover'
  if (path.startsWith('/social/')) return '/social'

  // —— 工具 / 粘贴板 ——
  if (path.startsWith('/p/')) return '/tools/paste'
  if (path.startsWith('/tools/') && path !== '/tools') return '/tools'

  // —— 组织邀请 ——
  if (path.startsWith('/join')) return '/'

  // —— 博客管理 ——
  if (/^\/blog\/[^/]+\/manage/.test(path)) {
    if (
      /\/manage\/(new|edit|analytics|categories|settings)/.test(path)
    ) {
      return path.replace(/\/manage\/.*$/, '/manage')
    }
    return '/blog-plaza'
  }

  // —— 博客阅读 ——
  if (/^\/blog\/[^/]+/.test(path)) {
    if (/^\/blog\/[^/]+$/.test(path)) return '/blog-plaza'
    const user = path.split('/')[2]
    return user ? `/blog/${user}` : '/blog-plaza'
  }

  if (isMobileNavRoot(path)) return '/'
  return '/'
}

/** React Router 会在 history.state 写入 idx */
function historyIndex(): number | null {
  try {
    const idx = (window.history.state as { idx?: unknown } | null)?.idx
    return typeof idx === 'number' && idx >= 0 ? idx : null
  } catch {
    return null
  }
}

/**
 * 执行返回：有站内历史则 go(-1)，否则进逻辑上级。
 */
export function goNavBack(navigate: NavigateFunction, pathname: string): void {
  const idx = historyIndex()
  if (idx !== null && idx > 0) {
    // POP: RR reuses view transitions when the forward path pair was VT-enabled
    navigate(-1)
    return
  }
  // 无可靠历史时落到上级，避免点返回直接离开站点
  const parent = resolveParentPath(pathname)
  if (parent && parent !== normalizePath(pathname)) {
    navigate(parent)
    return
  }
  navigate('/')
}
