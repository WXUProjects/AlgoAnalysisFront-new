import { lazy } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { AdminTabPage } from '@/components/admin-tab-page'
import { Perm } from '@/lib/permissions'

const OrgUser = lazy(() =>
  import('./User').then((m) => ({ default: m.DashboardOrgUser })),
)
const Group = lazy(() =>
  import('./Group').then((m) => ({ default: m.DashboardGroup })),
)

/**
 * 成员与分组：组织成员 + 组织分组 融合页（组织人员管理统一入口）。
 * 分组页签需要分组管理权限；旧路径 /admin/group 重定向到 ?tab=group。
 */
export function DashboardOrgPeople() {
  const { can } = useAuth()
  return (
    <AdminTabPage
      tabs={[
        { value: '', label: '成员', content: <OrgUser /> },
        {
          value: 'group',
          label: '分组',
          show: can(Perm.OrgGroupManage),
          content: <Group />,
        },
      ]}
    />
  )
}
