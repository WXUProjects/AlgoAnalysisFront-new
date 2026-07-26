import { lazy } from 'react'
import { AdminTabPage } from '@/components/admin-tab-page'

const SiteStatistics = lazy(() =>
  import('./Statistics').then((m) => ({ default: m.DashboardSiteStatistics })),
)
const AccessAnalytics = lazy(() =>
  import('./AccessAnalytics').then((m) => ({
    default: m.DashboardAccessAnalytics,
  })),
)

/**
 * 站点数据：数据概览 + 访问分析 融合页（同一权限 site.stats.read）。
 * 旧路径 /admin/access 重定向到 ?tab=access。
 */
export function DashboardSiteData() {
  return (
    <AdminTabPage
      tabs={[
        { value: '', label: '数据概览', content: <SiteStatistics /> },
        { value: 'access', label: '访问分析', content: <AccessAnalytics /> },
      ]}
    />
  )
}
