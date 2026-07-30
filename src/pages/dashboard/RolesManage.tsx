import { PageShell } from '@/components/page-shell'
import { RoleManager } from '@/components/rbac/role-manager'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/** 站点级角色与权限管理（/admin/roles，需相应管理权限） */
export function DashboardRolesManage() {
  return (
    <PageShell className="gap-3">
      <div>
        <h3 className="font-semibold">角色与权限</h3>
        <p className="text-sm text-muted-foreground">
          管理全站角色，或新建角色并勾选权限。
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">站点角色</CardTitle>
          <CardDescription>
            这里的角色对全站生效。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoleManager scope="site" />
        </CardContent>
      </Card>
    </PageShell>
  )
}
