import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { listOrgMembers, removeOrgMember, setOrgMemberRole } from '@/api/org'
import type { OrgMemberInfo } from '@shared/api'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { OrgRoleSelect } from '@/components/rbac/org-role-select'
import { useListQueryState } from '@/hooks/use-list-query-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Perm } from '@/lib/permissions'
import { orgRoleName } from '@/lib/roles'
import { ScopeGrantDialog } from '@/components/scope-grant-dialog'

const DEFAULT_MEMBER_PAGE_SIZE = 10

/** 组织成员任命：设置成员角色 / 移出组织（/admin/user?tab=member-roles） */
export function DashboardOrgMemberRoles() {
  const { currentOrg, user, can } = useAuth()
  const orgId = currentOrg?.id || user?.orgId || 0
  const canSetMemberRole = can(Perm.OrgMemberRole)
  const canRemoveMember = can(Perm.OrgMemberRemove)
  const canViewMembers = canSetMemberRole || canRemoveMember
  const isSystemOrg = Boolean(currentOrg?.isSystem)
  const myUserId = user?.userId || 0

  // mpage/mpageSize 与「成员」页签的 page/pageSize 区分，避免同一 URL 上互相覆盖
  const {
    page: memberPage,
    pageSize: memberPageSize,
    setPage: setMemberPage,
    setPageSize: setMemberPageSize,
  } = useListQueryState({
    pageKey: 'mpage',
    pageSizeKey: 'mpageSize',
    defaultPageSize: DEFAULT_MEMBER_PAGE_SIZE,
  })

  const [members, setMembers] = useState<OrgMemberInfo[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [memberKeyword, setMemberKeyword] = useState('')
  const [memberKeywordDraft, setMemberKeywordDraft] = useState('')
  const [membersLoading, setMembersLoading] = useState(false)
  /** 竞态守卫：丢弃过期的成员列表响应 */
  const membersRequestId = useRef(0)
  /** 修改成员角色前二次确认 */
  const [roleConfirm, setRoleConfirm] = useState<{
    userId: number
    name: string
    from: string
    to: string
  } | null>(null)
  /** 移除成员前二次确认 */
  const [removeConfirm, setRemoveConfirm] = useState<{
    userId: number
    name: string
  } | null>(null)
  const [scopeEdit, setScopeEdit] = useState<{
    userId: number
    name: string
  } | null>(null)

  const loadMembers = useCallback(async () => {
    if (!orgId || !canViewMembers) return
    const rid = ++membersRequestId.current
    setMembersLoading(true)
    const r = await listOrgMembers(orgId, {
      page: memberPage,
      pageSize: memberPageSize,
      keyword: memberKeyword,
    })
    // 快速翻页/搜索时丢弃旧响应
    if (rid !== membersRequestId.current) return
    setMembersLoading(false)
    if (r.success) {
      setMembers(r.list)
      setMemberTotal(r.total)
    }
  }, [orgId, canViewMembers, memberPage, memberPageSize, memberKeyword])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  if (!canViewMembers) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">
          需要「设置成员角色」或「移除成员」权限才能访问这里。
        </p>
            <ScopeGrantDialog
        open={scopeEdit != null}
        onOpenChange={(o) => {
          if (!o) setScopeEdit(null)
        }}
        orgId={orgId}
        userId={scopeEdit?.userId || 0}
        userName={scopeEdit?.name || ''}
      />
    </PageShell>
    )
  }

  return (
    <PageShell className="gap-3">
      <div>
        <h3 className="font-semibold">成员与角色</h3>
        <p className="text-sm text-muted-foreground">
          可设为成员、队长、教练或团队管理员；也可将成员移出本组织。支持分页与模糊搜索。
        </p>
      </div>

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b space-y-3">
          <CardTitle className="text-base">成员列表</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              className="sm:max-w-xs"
              placeholder="搜索组织内名称或用户名"
              value={memberKeywordDraft}
              onChange={(e) => setMemberKeywordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setMemberPage(1)
                  setMemberKeyword(memberKeywordDraft.trim())
                }
              }}
              aria-label="搜索成员"
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMemberPage(1)
                  setMemberKeyword(memberKeywordDraft.trim())
                }}
              >
                搜索
              </Button>
              {(memberKeyword || memberKeywordDraft) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMemberKeywordDraft('')
                    setMemberKeyword('')
                    setMemberPage(1)
                  }}
                >
                  清空
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {membersLoading ? (
            <div className="p-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {memberKeyword
                ? `没有找到与「${memberKeyword}」相关的成员`
                : '暂时还没有成员'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成员</TableHead>
                  <TableHead className="w-40">角色</TableHead>
                  {canRemoveMember && (
                    <TableHead className="w-20 text-right">操作</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const label =
                    m.name || m.orgDisplayName || m.username || String(m.userId)
                  const canRemove =
                    canRemoveMember && !isSystemOrg && m.userId !== myUserId
                  return (
                    <TableRow key={m.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="hidden size-8 sm:flex">
                            <AvatarImage src={m.avatar || undefined} />
                            <AvatarFallback>{label.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <Link
                              to={
                                m.username
                                  ? `/profile/${m.username}`
                                  : `/profile?id=${m.userId}`
                              }
                              className="w-fit font-medium hover:underline"
                            >
                              {label}
                            </Link>
                            {m.username ? (
                              <span className="truncate text-xs text-muted-foreground">
                                @{m.username}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canSetMemberRole ? (
                          <OrgRoleSelect
                            value={m.role || 'member'}
                            triggerClassName="w-32"
                            ariaLabel={`设置「${label}」的角色`}
                            onRoleChange={(role) =>
                              setRoleConfirm({
                                userId: m.userId,
                                name: label,
                                from: m.role || 'member',
                                to: role,
                              })
                            }
                          />
                        ) : (
                          <Badge variant="outline">{orgRoleName(m.role)}</Badge>
                        )}
                        {canSetMemberRole &&
                        (m.role === 'coach' || m.role === 'captain') ? (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto px-0"
                            onClick={() =>
                              setScopeEdit({ userId: m.userId, name: label })
                            }
                          >
                            管理范围
                          </Button>
                        ) : null}
                      </TableCell>
                      {canRemoveMember && (
                        <TableCell className="text-right">
                          {canRemove ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setRemoveConfirm({
                                  userId: m.userId,
                                  name: label,
                                })
                              }
                            >
                              移除
                            </Button>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        page={memberPage}
        total={memberTotal}
        pageSize={memberPageSize}
        onChange={setMemberPage}
        onPageSizeChange={setMemberPageSize}
        disabled={membersLoading}
      />

      <ConfirmDialog
        open={roleConfirm != null}
        onOpenChange={(o) => {
          if (!o) setRoleConfirm(null)
        }}
        title="修改成员角色？"
        description={
          roleConfirm
            ? `确定将「${roleConfirm.name}」从「${orgRoleName(roleConfirm.from)}」改为「${orgRoleName(roleConfirm.to)}」？对方的后台权限会立即变化。`
            : ''
        }
        confirmLabel="确认修改"
        onConfirm={() => {
          if (!roleConfirm || !orgId) return
          const target = roleConfirm
          setRoleConfirm(null)
          void setOrgMemberRole(orgId, target.userId, target.to).then(
            async (r) => {
              if (r.success) {
                toast.success('已更新角色')
                await loadMembers()
              } else toast.error(r.message)
            },
          )
        }}
      />

      <ConfirmDialog
        open={removeConfirm != null}
        onOpenChange={(o) => {
          if (!o) setRemoveConfirm(null)
        }}
        title="移出组织？"
        description={
          removeConfirm
            ? `确定将「${removeConfirm.name}」移出本组织？对方将无法再访问本组织内容，可随时用邀请链接重新加入。`
            : ''
        }
        confirmLabel="确认移除"
        destructive
        onConfirm={() => {
          if (!removeConfirm || !orgId) return
          const target = removeConfirm
          setRemoveConfirm(null)
          void removeOrgMember(orgId, target.userId).then(async (r) => {
            if (r.success) {
              toast.success(r.message || '已移除成员')
              await loadMembers()
            } else toast.error(r.message || '移除失败，请稍后重试')
          })
        }}
      />
    </PageShell>
  )
}
