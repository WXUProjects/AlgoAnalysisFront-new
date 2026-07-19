import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { captureDomainFromSearch } from '@/lib/domain-hint'

/**
 * 挂在各布局下：路由 search 变化时捕获 ?domain=，写入本地标记。
 * 前台 AppLayout / 后台 AdminLayout 都挂，保证进管理台也吃到 URL。
 */
export function DomainHintSync() {
  const { search } = useLocation()

  useEffect(() => {
    captureDomainFromSearch(search)
  }, [search])

  return null
}
