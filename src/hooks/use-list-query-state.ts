import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface UseListQueryStateOptions {
  /** URL 中的页码参数名，默认 page */
  pageKey?: string
  /** URL 中的每页条数参数名，默认 pageSize */
  pageSizeKey?: string
  /** 默认每页条数 */
  defaultPageSize?: number
  /** 合法的每页条数；不在列表中则回退 defaultPageSize */
  pageSizeOptions?: number[]
  /** setSearchParams 是否 replace，默认 true */
  replace?: boolean
}

export interface ListQueryState {
  page: number
  pageSize: number
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  /** 写回任意 query；page 默认重置为 1（传 null 表示删除） */
  patch: (patch: Record<string, string | null>, opts?: { resetPage?: boolean }) => void
  searchParams: URLSearchParams
}

/**
 * 将列表分页状态同步到 URL search params，离开再返回可恢复。
 */
export function useListQueryState(
  options: UseListQueryStateOptions = {},
): ListQueryState {
  const {
    pageKey = 'page',
    pageSizeKey = 'pageSize',
    defaultPageSize = 10,
    pageSizeOptions,
    replace = true,
  } = options

  const [searchParams, setSearchParams] = useSearchParams()

  const page = useMemo(() => {
    const n = Number(searchParams.get(pageKey) || 1)
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
  }, [searchParams, pageKey])

  const pageSize = useMemo(() => {
    const raw = Number(searchParams.get(pageSizeKey) || defaultPageSize)
    const n = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : defaultPageSize
    if (pageSizeOptions && pageSizeOptions.length > 0 && !pageSizeOptions.includes(n)) {
      return defaultPageSize
    }
    return n
  }, [searchParams, pageSizeKey, defaultPageSize, pageSizeOptions])

  const write = useCallback(
    (mutator: (next: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          mutator(next)
          return next
        },
        { replace },
      )
    },
    [setSearchParams, replace],
  )

  const setPage = useCallback(
    (p: number) => {
      const n = Math.max(1, Math.floor(p) || 1)
      write((next) => {
        if (n <= 1) next.delete(pageKey)
        else next.set(pageKey, String(n))
      })
    },
    [write, pageKey],
  )

  const setPageSize = useCallback(
    (size: number) => {
      const n = Math.max(1, Math.floor(size) || defaultPageSize)
      write((next) => {
        if (n === defaultPageSize) next.delete(pageSizeKey)
        else next.set(pageSizeKey, String(n))
        // 改每页条数回到第一页
        next.delete(pageKey)
      })
    },
    [write, pageKey, pageSizeKey, defaultPageSize],
  )

  const patch = useCallback(
    (patchObj: Record<string, string | null>, opts?: { resetPage?: boolean }) => {
      const resetPage = opts?.resetPage !== false
      write((next) => {
        for (const [k, v] of Object.entries(patchObj)) {
          if (v === null || v === '') next.delete(k)
          else next.set(k, v)
        }
        if (resetPage) next.delete(pageKey)
      })
    },
    [write, pageKey],
  )

  return { page, pageSize, setPage, setPageSize, patch, searchParams }
}
