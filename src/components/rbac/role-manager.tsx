import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDownIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PermGroup, RbacRole, RbacRoleMember, UserProfile } from '@shared/api'
import {
  assignRole,
  createRole,
  deleteRole,
  listPermissionGroups,
  listRoleMembers,
  listRoles,
  unassignRole,
  updateRole,
} from '@/api/rbac'
import { getProfileByName } from '@/api/profile'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Pagination } from '@/components/pagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MEMBER_PAGE_SIZE = 10
const ROLE_NAME_MAX = 32

/**
 * 权限勾选矩阵：按分组渲染，组可折叠、支持组级全选。
 * readOnly 时仅展示勾选态（内置角色 / 详情预览）。
 */
function PermMatrix({
  groups,
  selected,
  onToggle,
  readOnly = false,
}: {
  groups: PermGroup[]
  selected: Set<string>
  onToggle?: (codes: string[], checked: boolean) => void
  readOnly?: boolean
}) {
  if (!groups.length) {
    return (
      <p className="text-sm text-muted-foreground">权限列表加载中，请稍候…</p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {groups.map((g) => {
        const codes = g.perms.map((p) => p.code)
        const selectedCount = codes.filter((c) => selected.has(c)).length
        const allChecked = codes.length > 0 && selectedCount === codes.length
        const someChecked = selectedCount > 0 && !allChecked
        return (
          <Collapsible key={g.key} defaultOpen className="rounded-lg border">
            <div className="flex items-center gap-2 px-3 py-2">
              <Checkbox
                checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                disabled={readOnly}
                onCheckedChange={(v) => onToggle?.(codes, v === true)}
                aria-label={`全选「${g.label}」`}
              />
              <CollapsibleTrigger className="group flex flex-1 items-center justify-between gap-2 text-left">
                <span className="text-sm font-medium">{g.label}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {selectedCount}/{codes.length}
                  <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                </span>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="grid gap-1 border-t px-3 py-2 sm:grid-cols-2">
                {g.perms.map((p) => (
                  <label
                    key={p.code}
                    className={cn(
                      'flex items-start gap-2 rounded-md p-2',
                      !readOnly && 'cursor-pointer hover:bg-muted/50',
                    )}
                  >
                    <Checkbox
                      checked={selected.has(p.code)}
                      disabled={readOnly}
                      onCheckedChange={(v) => onToggle?.([p.code], v === true)}
                      className="mt-0.5"
                      aria-label={p.label}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm">{p.label}</span>
                      {p.desc ? (
                        <span className="text-xs text-muted-foreground">
                          {p.desc}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}

/**
 * 角色与权限管理（站点级 / 组织级共用）。
 * 左侧角色列表，右侧详情（权限矩阵 + 成员）；
 * 内置角色只读，自定义角色可新建 / 编辑 / 删除并添加成员。
 */
export function RoleManager({
  scope,
  orgId,
}: {
  scope: 'site' | 'org'
  orgId?: number
}) {
  const scopeOrgId = scope === 'org' ? orgId : undefined

  const [groups, setGroups] = useState<PermGroup[]>([])
  const [roles, setRoles] = useState<RbacRole[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  /** 竞态守卫：丢弃过期的角色列表响应 */
  const rolesRequestId = useRef(0)

  const [members, setMembers] = useState<RbacRoleMember[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [memberPage, setMemberPage] = useState(1)
  const [memberSearchDraft, setMemberSearchDraft] = useState('')
  const [memberKeyword, setMemberKeyword] = useState('')
  const [membersLoading, setMembersLoading] = useState(false)
  /** 竞态守卫：丢弃过期的成员列表响应 */
  const membersRequestId = useRef(0)
  const [removeTarget, setRemoveTarget] = useState<RbacRoleMember | null>(null)
  const [removing, setRemoving] = useState(false)

  const [addSearch, setAddSearch] = useState('')
  const [addCandidates, setAddCandidates] = useState<UserProfile[]>([])
  const [addSearching, setAddSearching] = useState(false)
  const [assigningId, setAssigningId] = useState<number | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorRole, setEditorRole] = useState<RbacRole | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [draftPerms, setDraftPerms] = useState<Set<string>>(() => new Set())
  const [savingRole, setSavingRole] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const scopedGroups = useMemo(
    () => groups.filter((g) => g.scope === scope),
    [groups, scope],
  )
  const selectedRole = useMemo(
    () => roles.find((r) => r.roleId === selectedRoleId) || null,
    [roles, selectedRoleId],
  )
  const selectedPermSet = useMemo(
    () => new Set(selectedRole?.permissions || []),
    [selectedRole],
  )

  useEffect(() => {
    let cancelled = false
    void listPermissionGroups().then((res) => {
      if (cancelled) return
      if (res.success) setGroups(res.groups)
      else toast.error(res.message || '权限目录加载失败，请稍后重试')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const loadRoles = useCallback(
    async (preferId?: number) => {
      const rid = ++rolesRequestId.current
      setRolesLoading(true)
      const res = await listRoles(scope, scopeOrgId)
      if (rid !== rolesRequestId.current) return
      setRolesLoading(false)
      if (!res.success) {
        toast.error(res.message || '角色列表加载失败，请稍后重试')
        return
      }
      setRoles(res.list)
      setSelectedRoleId((prev) => {
        const want = preferId ?? prev
        if (want != null && res.list.some((r) => r.roleId === want)) return want
        return res.list[0]?.roleId ?? null
      })
    },
    [scope, scopeOrgId],
  )

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  // 切换角色时重置成员区的搜索 / 分页 / 添加成员状态
  useEffect(() => {
    setMemberSearchDraft('')
    setMemberKeyword('')
    setMemberPage(1)
    setAddSearch('')
    setAddCandidates([])
  }, [selectedRoleId])

  // 成员搜索防抖
  useEffect(() => {
    const next = memberSearchDraft.trim()
    if (next === memberKeyword) return
    const t = window.setTimeout(() => {
      setMemberKeyword(next)
      setMemberPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [memberSearchDraft, memberKeyword])

  const loadMembers = useCallback(async () => {
    if (selectedRoleId == null) {
      setMembers([])
      setMemberTotal(0)
      return
    }
    const rid = ++membersRequestId.current
    setMembersLoading(true)
    const res = await listRoleMembers({
      roleId: selectedRoleId,
      orgId: scopeOrgId,
      page: memberPage,
      pageSize: MEMBER_PAGE_SIZE,
      keyword: memberKeyword || undefined,
    })
    // 快速切换角色 / 搜索时丢弃旧响应
    if (rid !== membersRequestId.current) return
    setMembersLoading(false)
    if (res.success) {
      setMembers(res.list)
      setMemberTotal(res.total)
    } else {
      toast.error(res.message || '成员列表加载失败，请稍后重试')
    }
  }, [selectedRoleId, scopeOrgId, memberPage, memberKeyword])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  // 添加成员：用户搜索防抖
  useEffect(() => {
    if (!addSearch.trim()) {
      setAddCandidates([])
      return
    }
    let cancelled = false
    const t = window.setTimeout(async () => {
      setAddSearching(true)
      const res = await getProfileByName(addSearch.trim())
      if (cancelled) return
      setAddSearching(false)
      if (res.success) setAddCandidates(res.data || [])
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [addSearch])

  function toggleDraftPerms(codes: string[], checked: boolean) {
    setDraftPerms((prev) => {
      const next = new Set(prev)
      for (const c of codes) {
        if (checked) next.add(c)
        else next.delete(c)
      }
      return next
    })
  }

  function openCreate() {
    setEditorRole(null)
    setDraftName('')
    setDraftDesc('')
    setDraftPerms(new Set())
    setEditorOpen(true)
  }

  function openEdit(role: RbacRole) {
    if (role.isSystem && !role.permsEditable) return
    setEditorRole(role)
    setDraftName(role.name)
    setDraftDesc(role.description || '')
    setDraftPerms(new Set(role.permissions || []))
    setEditorOpen(true)
  }

  async function saveEditor() {
    const name = draftName.trim()
    const systemPermsOnly = Boolean(editorRole?.isSystem)
    if (!systemPermsOnly) {
      if (!name) {
        toast.error('请填写角色名称')
        return
      }
      if (name.length > ROLE_NAME_MAX) {
        toast.error(`角色名称最多 ${ROLE_NAME_MAX} 个字`)
        return
      }
    }
    const permissions = Array.from(draftPerms)
    setSavingRole(true)
    if (editorRole) {
      // 内置角色只改本组织权限：名称与说明由系统固定
      const res = await updateRole(
        editorRole.isSystem
          ? {
              roleId: editorRole.roleId,
              orgId: scopeOrgId,
              permissions,
            }
          : {
              roleId: editorRole.roleId,
              name,
              description: draftDesc.trim(),
              permissions,
            },
      )
      setSavingRole(false)
      if (!res.success) {
        toast.error(res.message || '保存失败，请稍后重试')
        return
      }
      toast.success(res.message || '已保存修改')
      setEditorOpen(false)
      await loadRoles(editorRole.roleId)
    } else {
      const res = await createRole({
        scope,
        orgId: scopeOrgId,
        name,
        description: draftDesc.trim(),
        permissions,
      })
      setSavingRole(false)
      if (!res.success) {
        toast.error(res.message || '创建失败，请稍后重试')
        return
      }
      toast.success(res.message || '已创建角色')
      setEditorOpen(false)
      await loadRoles(res.data?.roleId)
    }
  }

  /** 内置角色：清除本组织的权限覆盖，恢复系统默认 */
  async function handleResetRolePerms() {
    if (!editorRole?.isSystem) return
    setSavingRole(true)
    const res = await updateRole({
      roleId: editorRole.roleId,
      orgId: scopeOrgId,
      resetPermissions: true,
    })
    setSavingRole(false)
    if (!res.success) {
      toast.error(res.message || '恢复失败，请稍后重试')
      return
    }
    toast.success(res.message || '已恢复默认权限')
    setEditorOpen(false)
    await loadRoles(editorRole.roleId)
  }

  async function handleDeleteRole() {
    if (!selectedRole || selectedRole.isSystem) return
    setDeleting(true)
    const res = await deleteRole(selectedRole.roleId)
    setDeleting(false)
    if (!res.success) {
      toast.error(res.message || '删除失败，请稍后重试')
      return
    }
    toast.success(res.message || '已删除角色')
    await loadRoles()
  }

  async function handleAssign(u: UserProfile) {
    if (!selectedRole || selectedRole.isSystem) return
    setAssigningId(u.userId)
    const res = await assignRole(selectedRole.roleId, [u.userId])
    setAssigningId(null)
    if (!res.success) {
      toast.error(res.message || '添加失败，请稍后重试')
      return
    }
    if (res.added === 0 && res.skipped.includes(u.userId)) {
      toast.error(
        scope === 'org'
          ? '该用户不在本组织，请先邀请对方加入组织'
          : res.message || '该用户已拥有此角色，或暂时无法添加',
      )
      return
    }
    toast.success(res.message || '已添加成员')
    setAddSearch('')
    setAddCandidates([])
    await Promise.all([loadMembers(), loadRoles(selectedRole.roleId)])
  }

  async function handleUnassign() {
    if (!selectedRole || selectedRole.isSystem || !removeTarget) return
    const target = removeTarget
    setRemoving(true)
    const res = await unassignRole(selectedRole.roleId, [target.userId])
    setRemoving(false)
    setRemoveTarget(null)
    if (!res.success) {
      toast.error(res.message || '移除失败，请稍后重试')
      return
    }
    toast.success(res.message || '已移除成员')
    await Promise.all([loadMembers(), loadRoles(selectedRole.roleId)])
  }

  const isSystemRole = Boolean(selectedRole?.isSystem)
  // 内置角色里只有教练/队长允许本组织改权限（后端 permsEditable 下发）
  const canEditPerms = Boolean(
    selectedRole && (!selectedRole.isSystem || selectedRole.permsEditable),
  )

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* 角色列表 */}
      <div className="flex w-full flex-col gap-2 lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">角色</span>
          <Button type="button" size="sm" variant="outline" onClick={openCreate}>
            <PlusIcon data-icon="inline-start" />
            新建角色
          </Button>
        </div>
        {rolesLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : roles.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            暂时还没有角色，点上方「新建角色」创建一个。
          </p>
        ) : (
          roles.map((r) => (
            <button
              key={r.roleId}
              type="button"
              onClick={() => setSelectedRoleId(r.roleId)}
              className={cn(
                'flex w-full flex-col gap-0.5 rounded-lg border p-3 text-left text-sm transition hover:bg-muted/50',
                selectedRoleId === r.roleId && 'border-primary bg-muted/40',
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="min-w-0 truncate font-medium">{r.name}</span>
                {r.isSystem ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    <LockIcon />
                    内置
                  </Badge>
                ) : null}
              </span>
              {r.description ? (
                <span className="truncate text-xs text-muted-foreground">
                  {r.description}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {r.memberCount} 名成员
              </span>
            </button>
          ))
        )}
      </div>

      {/* 角色详情 */}
      <div className="min-w-0 flex-1">
        {!selectedRole ? (
          rolesLoading ? null : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>还没有可管理的角色</EmptyTitle>
                <EmptyDescription>
                  新建一个角色，勾选权限后即可把成员加进来。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{selectedRole.name}</span>
                  {isSystemRole ? (
                    <Badge variant="secondary" className="text-[10px]">
                      <LockIcon />
                      内置
                    </Badge>
                  ) : null}
                  {selectedRole.customized ? (
                    <Badge variant="outline" className="text-[10px]">
                      已按本组织调整
                    </Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {selectedRole.memberCount} 名成员
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedRole.description ||
                    (isSystemRole
                      ? canEditPerms
                        ? '系统预设角色，名称固定、不能删除；权限可按本组织需要调整。'
                        : '系统预设角色，权限组合固定，不能修改或删除。'
                      : '还没有填写角色说明。')}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {canEditPerms ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(selectedRole)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    {isSystemRole ? '调整权限' : '编辑'}
                  </Button>
                ) : null}
                {!isSystemRole ? (
                  <ConfirmDialog
                    title={`删除角色「${selectedRole.name}」？`}
                    description={
                      scope === 'org'
                        ? '删除后，持有该角色的成员会失去该角色带来的权限，退回普通成员，此操作无法撤销。'
                        : '删除后，持有该角色的成员会失去该角色带来的权限，退回普通用户，此操作无法撤销。'
                    }
                    confirmLabel="确认删除"
                    destructive
                    loading={deleting}
                    onConfirm={() => void handleDeleteRole()}
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={deleting}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      删除
                    </Button>
                  </ConfirmDialog>
                ) : null}
              </div>
            </div>

            <Tabs defaultValue="perms">
              <TabsList>
                <TabsTrigger value="perms">权限</TabsTrigger>
                <TabsTrigger value="members">成员</TabsTrigger>
              </TabsList>
              <TabsContent value="perms" className="flex flex-col gap-2 pt-2">
                {isSystemRole ? (
                  <p className="text-xs text-muted-foreground">
                    {canEditPerms
                      ? `本组织可自行调整「${selectedRole.name}」的权限，点「调整权限」修改；只影响本组织。${
                          selectedRole.customized ? '当前已按本组织自定义。' : ''
                        }`
                      : '这是基本角色，权限固定，不能修改也不能删除。'}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    以下为该角色当前拥有的权限，点「编辑」可调整。
                  </p>
                )}
                <PermMatrix
                  groups={scopedGroups}
                  selected={selectedPermSet}
                  readOnly
                />
              </TabsContent>
              <TabsContent value="members" className="flex flex-col gap-3 pt-2">
                {isSystemRole ? (
                  <p className="text-xs text-muted-foreground">
                    内置角色的成员请在「成员管理」或「全站用户」中任命，这里仅供查看。
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 rounded-lg border p-3">
                    <p className="text-sm font-medium">添加成员</p>
                    <Input
                      placeholder="搜索站内昵称或用户名"
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                      aria-label="搜索用户以添加"
                    />
                    {addSearching ? (
                      <p className="text-xs text-muted-foreground">搜索中…</p>
                    ) : null}
                    {addCandidates.map((c) => (
                      <div
                        key={c.userId}
                        className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate">
                          {c.name}
                          {c.username ? (
                            <span className="ml-1 text-muted-foreground">
                              @{c.username}
                            </span>
                          ) : null}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          disabled={assigningId === c.userId}
                          onClick={() => void handleAssign(c)}
                        >
                          {assigningId === c.userId ? '添加中…' : '添加'}
                        </Button>
                      </div>
                    ))}
                    {scope === 'org' ? (
                      <p className="text-xs text-muted-foreground">
                        只能添加本组织成员；还没加入的用户请先通过邀请链接加入。
                      </p>
                    ) : null}
                  </div>
                )}

                <Input
                  placeholder="搜索成员昵称或用户名"
                  value={memberSearchDraft}
                  onChange={(e) => setMemberSearchDraft(e.target.value)}
                  aria-label="搜索角色成员"
                />
                {membersLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : members.length === 0 ? (
                  <p className="py-1 text-sm text-muted-foreground">
                    {memberKeyword
                      ? `没有找到与「${memberKeyword}」相关的成员`
                      : '该角色暂时还没有成员'}
                  </p>
                ) : (
                  members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="size-8">
                          <AvatarImage src={m.avatar || undefined} />
                          <AvatarFallback>
                            {(m.name || m.username || '?').slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm">
                            {m.name || m.username}
                          </span>
                          {m.username ? (
                            <span className="truncate text-xs text-muted-foreground">
                              @{m.username}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {!isSystemRole ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setRemoveTarget(m)}
                        >
                          移除
                        </Button>
                      ) : null}
                    </div>
                  ))
                )}
                {memberTotal > MEMBER_PAGE_SIZE ? (
                  <Pagination
                    page={memberPage}
                    total={memberTotal}
                    pageSize={MEMBER_PAGE_SIZE}
                    onChange={setMemberPage}
                    disabled={membersLoading}
                  />
                ) : null}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* 新建 / 编辑角色 */}
      <Dialog
        open={editorOpen}
        onOpenChange={(o) => {
          if (!o) setEditorOpen(false)
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,44rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
            <DialogTitle>
              {editorRole
                ? `${editorRole.isSystem ? '调整权限' : '编辑角色'} · ${editorRole.name}`
                : '新建角色'}
            </DialogTitle>
            <DialogDescription>
              {editorRole?.isSystem
                ? '这是内置角色，名称固定；这里勾选的权限只对本组织生效，保存后成员重新进入或刷新页面即可生效。'
                : '为角色勾选权限；保存后，持有该角色的成员重新进入或刷新页面即可生效。'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
            {editorRole?.isSystem ? null : (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor={`rbac-${scope}-role-name`}>
                  角色名称
                </FieldLabel>
                <Input
                  id={`rbac-${scope}-role-name`}
                  value={draftName}
                  maxLength={ROLE_NAME_MAX}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="例如：题库维护员"
                />
                <FieldDescription>最多 {ROLE_NAME_MAX} 个字</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={`rbac-${scope}-role-desc`}>
                  角色说明（可选）
                </FieldLabel>
                <Textarea
                  id={`rbac-${scope}-role-desc`}
                  value={draftDesc}
                  rows={2}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  placeholder="写一句话，说明这个角色是做什么的"
                />
              </Field>
            </FieldGroup>
            )}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">权限</p>
              <PermMatrix
                groups={scopedGroups}
                selected={draftPerms}
                onToggle={toggleDraftPerms}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            {editorRole?.isSystem && editorRole.customized ? (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto"
                disabled={savingRole}
                onClick={() => void handleResetRolePerms()}
              >
                恢复默认
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={savingRole}
              onClick={() => setEditorOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={savingRole}
              onClick={() => void saveEditor()}
            >
              {savingRole
                ? '保存中…'
                : editorRole
                  ? editorRole.isSystem
                    ? '保存权限'
                    : '保存修改'
                  : '创建角色'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移除成员确认 */}
      <ConfirmDialog
        open={removeTarget != null}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null)
        }}
        title="移除该成员？"
        description={
          removeTarget
            ? `确定将「${removeTarget.name || removeTarget.username}」从角色「${selectedRole?.name || ''}」中移除？对方将失去该角色带来的权限。`
            : ''
        }
        confirmLabel="确认移除"
        destructive
        loading={removing}
        onConfirm={() => void handleUnassign()}
      />
    </div>
  )
}
