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
const OrgMemberRoles = lazy(() =>
  import('./OrgMemberRoles').then((m) => ({
    default: m.DashboardOrgMemberRoles,
  })),
)
const OrgRoles = lazy(() =>
  import('./OrgRoles').then((m) => ({ default: m.DashboardOrgRoles })),
)

/**
 * 成员与分组：组织成员 + 组织分组 + 成员任命 + 组织角色 融合页
 * （组织人员管理统一入口）。页签按权限显隐；旧路径 /admin/group
 * 重定向到 ?tab=group，成员任命/角色管理原在组织设置页，现迁到这里。
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
        {
          value: 'member-roles',
          label: '成员与角色',
          show: can(Perm.OrgMemberRole) || can(Perm.OrgMemberRemove),
          content: <OrgMemberRoles />,
        },
        {
          value: 'roles',
          label: '角色与权限',
          show: can(Perm.OrgRoleManage),
          content: <OrgRoles />,
        },
      ]}
    />
  )
}
