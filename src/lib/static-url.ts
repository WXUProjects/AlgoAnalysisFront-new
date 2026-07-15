/** 边缘 CDN 会对 .png/.jpg 等扩展名做静态加速，不反代到 user 服务。
 *  上传 URL 已改为无后缀；历史配置里若仍带后缀，访问时剥掉。 */

const STATIC_PREFIX = '/api/user/static/'
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|ico|bin)$/i

export function normalizeStaticUrl(url?: string | null): string {
  const u = (url || '').trim()
  if (!u) return ''
  try {
    if (u.startsWith('http://') || u.startsWith('https://')) {
      const parsed = new URL(u)
      if (!parsed.pathname.startsWith(STATIC_PREFIX)) return u
      parsed.pathname = parsed.pathname.replace(IMAGE_EXT, '')
      return parsed.pathname + parsed.search
    }
  } catch {
    /* ignore */
  }
  if (u.startsWith(STATIC_PREFIX) || u.includes('/user/static/')) {
    return u.replace(IMAGE_EXT, '')
  }
  return u
}
