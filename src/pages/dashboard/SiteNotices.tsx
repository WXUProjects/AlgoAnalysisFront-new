import { lazy } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { AdminTabPage } from '@/components/admin-tab-page'
import { Perm } from '@/lib/permissions'

const SiteBulletin = lazy(() =>
  import('./BulletinManage').then((m) => ({
    default: m.DashboardSiteBulletinManage,
  })),
)
const Emergency = lazy(() =>
  import('./EmergencyManage').then((m) => ({
    default: m.DashboardEmergencyManage,
  })),
)

/**
 * 通知与公告：站点公告 + 重要通知 融合页（全站触达统一入口）。
 * 页签按权限过滤；旧路径 /admin/emergency 重定向到 ?tab=emergency。
 */
export function DashboardSiteNotices() {
  const { can } = useAuth()
  return (
    <AdminTabPage
      tabs={[
        {
          value: '',
          label: '站点公告',
          show: can(Perm.SiteBulletin),
          content: <SiteBulletin />,
        },
        {
          value: 'emergency',
          label: '重要通知',
          show: can(Perm.SiteEmergency),
          content: <Emergency />,
        },
      ]}
    />
  )
}
