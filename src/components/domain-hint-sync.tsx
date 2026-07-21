import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { captureDomainFromSearch } from '@/lib/domain-hint'

/**
 * 挂在各布局下：路由 search 变化时捕获 ?domain=，写入本地标记。
 * 挂在 AppLayout（管理页已并入前台壳），保证域名提示同步。
 */
export function DomainHintSync() {
  const { search } = useLocation()

  useEffect(() => {
    captureDomainFromSearch(search)
  }, [search])

  return null
}
