import { useEffect } from 'react'
import { applyDocumentTitle } from '@/lib/page-title'

/**
 * 路由变化时同步浏览器标签标题：`页面名 - 站点品牌`。
 */
export function useDocumentTitle(pageTitle: string, brand?: string) {
  useEffect(() => {
    applyDocumentTitle(pageTitle, brand || 'GoAlgo')
  }, [pageTitle, brand])
}
