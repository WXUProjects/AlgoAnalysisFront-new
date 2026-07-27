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
          组织管理员与成员权限固定。教练、组长、队长的默认权限不同：教练管全组织，组长管指定分组，队长管指定分队；可在下方「调整权限」按本组织需要勾选。一人可兼任多组组长与多队队长。
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
