import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/** sessionStorage：同一会话只自动硬刷新一次，避免死循环 */
export const CHUNK_RELOAD_KEY = 'goalgo:chunk-reload'

/**
 * 判断是否为「动态 import / chunk 加载失败」。
 * 常见于：刚部署后旧入口引用了已删除的 hash 资源、弱网、CDN 短暂 404。
 */
export function isChunkLoadError(err: unknown): boolean {
  if (err == null) return false
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as {
      name?: string
      message?: string
      stack?: string
      cause?: unknown
    }
    if (anyErr.name === 'ChunkLoadError') return true
    const text = [anyErr.message, anyErr.stack, String(anyErr.cause ?? '')]
      .filter(Boolean)
      .join(' ')
    if (matchChunkMessage(text)) return true
    // React Router 可能包一层
    if (anyErr.cause && isChunkLoadError(anyErr.cause)) return true
  }
  return matchChunkMessage(String(err))
}

function matchChunkMessage(msg: string): boolean {
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Unable to preload CSS/i.test(msg) ||
    /Loading CSS chunk/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  )
}

/**
 * 带一次自动硬刷新的 React.lazy。
 * 部署后外链/深链进站时，旧 chunk 404 可自动恢复，无需用户手动点刷新。
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory()
      try {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      } catch {
        /* private mode */
      }
      return mod
    } catch (err) {
      if (isChunkLoadError(err) && typeof window !== 'undefined') {
        let already = false
        try {
          already = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1'
        } catch {
          /* ignore */
        }
        if (!already) {
          try {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
          } catch {
            /* ignore */
          }
          window.location.reload()
          // 刷新过程中挂起，避免再抛到错误页闪一下
          return new Promise(() => {})
        }
      }
      throw err
    }
  }) as LazyExoticComponent<T>
}
