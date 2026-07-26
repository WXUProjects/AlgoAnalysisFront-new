import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { RoleManager } from '@/components/rbac/role-manager'

/** 组织级角色与权限管理（/admin/user?tab=roles，需组织角色管理权限） */
export function DashboardOrgRoles() {
  const { currentOrg, user } = useAuth()
  const orgId = currentOrg?.id || user?.orgId || 0
  return (
    <PageShell className="gap-3">
      <div>
        <h3 className="font-semibold">角色与权限</h3>
        <p className="text-sm text-muted-foreground">
          内置角色（成员 / 队长 / 教练 / 团队管理员）的权限固定；也可以新建角色、自由勾选权限，并把组织成员加进来。
        </p>
      </div>
      {orgId > 0 ? (
        <RoleManager scope="org" orgId={orgId} />
      ) : (
        <p className="text-sm text-muted-foreground">请先选择组织。</p>
      )}
    </PageShell>
  )
}
