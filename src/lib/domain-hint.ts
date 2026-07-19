/**
 * URL `?domain=<slug|id>` 域偏好标记。
 * - 访问带 domain 的链接时写入 localStorage，之后进前台/后台都生效
 * - 登录后自动切到该组织（须已是成员）；否则保持公共域/用户默认，不强制加入
 * - 用户手动切换组织后清除标记
 * - 不是邀请链接，不自动加组织
 */

const STORAGE_KEY = 'goalgo.domainHint'
export const DOMAIN_HINT_EVENT = 'goalgo:domain-hint-change'

export function normalizeDomainHint(raw: string): string {
  return raw.trim()
}

export function getDomainHint(): string | null {
  try {
    const v = normalizeDomainHint(localStorage.getItem(STORAGE_KEY) || '')
    return v || null
  } catch {
    return null
  }
}

export function setDomainHint(raw: string): string | null {
  const slug = normalizeDomainHint(raw)
  if (!slug) return null
  try {
    const prev = getDomainHint()
    localStorage.setItem(STORAGE_KEY, slug)
    if (prev !== slug && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(DOMAIN_HINT_EVENT, { detail: { slug, prev } }),
      )
    }
  } catch {
    /* private mode 等：忽略持久化失败 */
  }
  return slug
}

export function clearDomainHint(): void {
  try {
    const prev = getDomainHint()
    if (!prev) return
    localStorage.removeItem(STORAGE_KEY)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(DOMAIN_HINT_EVENT, { detail: { slug: null, prev } }),
      )
    }
  } catch {
    /* ignore */
  }
}

/** 从当前 URL 或给定 search 捕获 domain 并持久化；无则返回 null */
export function captureDomainFromSearch(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  try {
    const q = search.startsWith('?') ? search.slice(1) : search
    const params = new URLSearchParams(q)
    const raw = params.get('domain')
    if (raw == null || !String(raw).trim()) return null
    return setDomainHint(String(raw))
  } catch {
    return null
  }
}

export function captureDomainFromLocation(
  href: string = typeof window !== 'undefined' ? window.location.href : '',
): string | null {
  try {
    return captureDomainFromSearch(new URL(href).search)
  } catch {
    return captureDomainFromSearch()
  }
}

/** 在「我的组织」里按 slug（忽略大小写）或数字 id 查找 */
export function findOrgByDomainHint<
  T extends { id: number; slug?: string | null },
>(list: T[], hint: string): T | undefined {
  const key = normalizeDomainHint(hint)
  if (!key || !list.length) return undefined
  const lower = key.toLowerCase()
  const bySlug = list.find((o) => (o.slug || '').toLowerCase() === lower)
  if (bySlug) return bySlug
  if (/^\d+$/.test(key)) {
    const id = Number(key)
    return list.find((o) => o.id === id)
  }
  return undefined
}

/** 本域入口 path：`/?domain=<slug|id>`（非邀请） */
export function buildDomainSharePath(domain: string): string {
  const key = normalizeDomainHint(domain)
  if (!key) return '/'
  return `/?domain=${encodeURIComponent(key)}`
}

/** 本域入口完整 URL，供组织管理员复制分享 */
export function buildDomainShareUrl(domain: string): string {
  const path = buildDomainSharePath(domain)
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}
