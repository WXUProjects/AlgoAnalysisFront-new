/** 静态资源 URL 规范化：保留真实扩展名，仅做路径清洗。 */

const STATIC_PREFIX = '/api/user/static/'

export function normalizeStaticUrl(url?: string | null): string {
  const u = (url || '').trim()
  if (!u) return ''
  try {
    if (u.startsWith('http://') || u.startsWith('https://')) {
      const parsed = new URL(u)
      if (!parsed.pathname.startsWith(STATIC_PREFIX) && !parsed.pathname.includes('/user/static/')) {
        return u
      }
      return parsed.pathname + parsed.search
    }
  } catch {
    /* ignore */
  }
  return u
}
