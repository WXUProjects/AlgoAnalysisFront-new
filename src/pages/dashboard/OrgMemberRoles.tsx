import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { listOrgMembers, removeOrgMember, setOrgMemberRole } from '@/api/org'
import { listAllGroups } from '@/api/group'
import { listSquads } from '@/api/squad'
import type { GroupInfo, OrgMemberInfo, SquadInfo } from '@shared/api'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  OrgRole,
  orgRoleName,
  roleNeedsScope,
} from '@/lib/roles'

const DEFAULT_MEMBER_PAGE_SIZE = 10

/** 组织成员任命：设置成员角色 / 移出组织（/admin/user?tab=member-roles） */
export function DashboardOrgMemberRoles() {
  const { currentOrg, user, can, isSiteAdmin } = useAuth()
  const orgId = currentOrg?.id || user?.orgId || 0
  const canSetMemberRole = can(Perm.OrgMemberRole)
  const canRemoveMember = can(Perm.OrgMemberRemove)
  const canViewMembers = canSetMemberRole || canRemoveMember
  const isSystemOrg = Boolean(currentOrg?.isSystem)
  const myUserId = user?.userId || 0
  // 站管 / 组织管理员可任命全部五档（含 org_admin）；其余严格低于自己
  const actorRole = isSiteAdmin
    ? OrgRole.OrgAdmin
    : user?.orgRole || OrgRole.Member

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
  const membersRequestId = useRef(0)

  const [roleConfirm, setRoleConfirm] = useState<{
    userId: number
    name: string
    from: string
    to: string
  } | null>(null)
  const [scopeGroupId, setScopeGroupId] = useState<string>('')
  const [scopeSquadId, setScopeSquadId] = useState<string>('')
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [squads, setSquads] = useState<SquadInfo[]>([])
  const [scopeLoading, setScopeLoading] = useState(false)

  const [removeConfirm, setRemoveConfirm] = useState<{
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

  // 打开任命确认时加载分组/分队
  useEffect(() => {
    if (!roleConfirm || !orgId) return
    const need = roleNeedsScope(roleConfirm.to)
    if (!need) {
      setScopeGroupId('')
      setScopeSquadId('')
      return
    }
    setScopeLoading(true)
    setScopeGroupId('')
    setScopeSquadId('')
    void Promise.all([listAllGroups(), listSquads({ orgId })]).then(
      ([g, s]) => {
        setScopeLoading(false)
        if (g.success && g.data) setGroups(g.data.list)
        if (s.success && s.data) setSquads(s.data)
      },
    )
  }, [roleConfirm, orgId])

  const squadsInGroup = useMemo(() => {
    if (!scopeGroupId) return squads
    const gid = Number(scopeGroupId)
    return squads.filter((s) => s.groupId === gid)
  }, [squads, scopeGroupId])

  const scopeLabel = useMemo(() => {
    if (!roleConfirm) return ''
    if (roleConfirm.to === OrgRole.GroupLeader) {
      const g = groups.find((x) => String(x.id) === scopeGroupId)
      return g?.name || ''
    }
    if (roleConfirm.to === OrgRole.Captain) {
      const sq = squads.find((x) => String(x.id) === scopeSquadId)
      const g = groups.find((x) => x.id === sq?.groupId)
      if (sq && g) return `${g.name} · ${sq.name}`
      return sq?.name || ''
    }
    return ''
  }, [roleConfirm, groups, squads, scopeGroupId, scopeSquadId])

  if (!canViewMembers) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">
          需要「设置成员角色」或「移除成员」权限才能访问这里。
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell className="gap-3">
      <div>
        <h3 className="font-semibold">成员与角色</h3>
        <p className="text-sm text-muted-foreground">
          权限从高到低：组织管理员 → 教练 → 组长 → 队长 → 成员。一人可兼任多组组长与多队队长。也可在「分组 / 分队」页就地任命。
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
                  <TableHead className="w-48">角色</TableHead>
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
                  const scopes = m.scopes || []
                  const scopeHint =
                    scopes.length > 0
                      ? scopes
                          .map((s) => {
                            if (s.label) return s.label
                            if (s.scopeType === 'group') {
                              return `组长 · ${s.scopeName || `分组 #${s.scopeId}`}`
                            }
                            const g = s.groupName ? `${s.groupName} / ` : ''
                            return `队长 · ${g}${s.scopeName || `分队 #${s.scopeId}`}`
                          })
                          .join('；')
                      : ''
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
                            {scopeHint ? (
                              <span className="text-xs text-muted-foreground">
                                {scopeHint}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canSetMemberRole ? (
                          <OrgRoleSelect
                            value={m.role || 'member'}
                            actorRole={actorRole}
                            isSiteAdmin={isSiteAdmin}
                            triggerClassName="w-36"
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
          if (!o) {
            setRoleConfirm(null)
            setScopeGroupId('')
            setScopeSquadId('')
          }
        }}
        title="修改成员角色？"
        description={
          roleConfirm ? (
            <div className="space-y-3">
              <p>
                将「{roleConfirm.name}」从「{orgRoleName(roleConfirm.from)}」改为「
                {orgRoleName(roleConfirm.to)}」。对方的管理权限会立即变化。
              </p>
              {roleNeedsScope(roleConfirm.to) ? (
                scopeLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <div className="space-y-3 text-foreground">
                    {(roleConfirm.to === OrgRole.GroupLeader ||
                      roleConfirm.to === OrgRole.Captain) && (
                      <div className="space-y-1.5">
                        <Label>
                          {roleConfirm.to === OrgRole.GroupLeader
                            ? '管理哪个分组'
                            : '所属分组（可选，便于筛选分队）'}
                        </Label>
                        <Select
                          value={scopeGroupId}
                          onValueChange={(v) => {
                            setScopeGroupId(v || '')
                            setScopeSquadId('')
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择分组" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((g) => (
                              <SelectItem key={g.id} value={String(g.id)}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {roleConfirm.to === OrgRole.Captain && (
                      <div className="space-y-1.5">
                        <Label>管理哪支分队</Label>
                        <Select
                          value={scopeSquadId}
                          onValueChange={(v) => setScopeSquadId(v || '')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择分队" />
                          </SelectTrigger>
                          <SelectContent>
                            {squadsInGroup.length === 0 ? (
                              <SelectItem value="__empty" disabled>
                                暂无分队，请先在「分组」页创建
                              </SelectItem>
                            ) : (
                              squadsInGroup.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.name}
                                  {s.groupId
                                    ? `（${groups.find((g) => g.id === s.groupId)?.name || `组#${s.groupId}`}）`
                                    : ''}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )
              ) : null}
            </div>
          ) : (
            ''
          )
        }
        confirmLabel="确认修改"
        disabled={
          !!roleConfirm &&
          ((roleConfirm.to === OrgRole.GroupLeader && !scopeGroupId) ||
            (roleConfirm.to === OrgRole.Captain && !scopeSquadId) ||
            scopeLoading)
        }
        onConfirm={() => {
          if (!roleConfirm || !orgId) return
          const target = roleConfirm
          const need = roleNeedsScope(target.to)
          let scope:
            | { scopeType: 'group' | 'squad'; scopeId: number }
            | undefined
          if (need === 'group') {
            if (!scopeGroupId) {
              toast.error('请选择要管理的分组')
              return
            }
            scope = { scopeType: 'group', scopeId: Number(scopeGroupId) }
          } else if (need === 'squad') {
            if (!scopeSquadId) {
              toast.error('请选择要管理的分队')
              return
            }
            scope = { scopeType: 'squad', scopeId: Number(scopeSquadId) }
          }
          const labelSnap = scopeLabel
          setRoleConfirm(null)
          void setOrgMemberRole(orgId, target.userId, target.to, scope).then(
            async (r) => {
              if (r.success) {
                const extra = labelSnap ? `（${labelSnap}）` : ''
                toast.success(`已更新为${orgRoleName(target.to)}${extra}`)
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
