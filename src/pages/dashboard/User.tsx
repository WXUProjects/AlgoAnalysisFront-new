import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { listAllGroups } from '@/api/group'
import {
  clearDormant,
  deleteUser,
  forceDormant,
  listProfiles,
  moveGroup,
  setEmailEnabled,
  setProblemPipeline,
  setRefreshQuota,
  setSiteAdmin,
  setSyncExempt,
  setSyncIntervals,
  setUserDisabled,
} from '@/api/profile'
import { assignRole, listRoles, listUserRoles, unassignRole } from '@/api/rbac'
import { grantSubscription, revokeSubscription } from '@/api/subscription'
import { updateSpider } from '@/api/spider'
import type { GroupInfo, RbacRole, UserListItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { useListQueryState } from '@/hooks/use-list-query-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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

const DEFAULT_PAGE_SIZE = 10

type UserScope = 'org' | 'site'

/** 组织成员管理：当前组织 */
export function DashboardOrgUser() {
  return <UserListPage scope="org" />
}

/** 站点用户管理：全站（仅站点管理员） */
export function DashboardSiteUser() {
  return <UserListPage scope="site" />
}

/** @deprecated 兼容旧 import */
export function DashboardUser() {
  return <UserListPage scope="org" />
}

function UserListPage({ scope }: { scope: UserScope }) {
  const { isAdmin, isStaff, currentOrg, can } = useAuth()
  const isSite = scope === 'site'
  // 细粒度权限（站管默认全有；自定义站点角色按勾选生效）
  const canSiteList = can(Perm.SiteUserList)
  const canSiteSync = can(Perm.SiteUserSync)
  const canSiteDisable = can(Perm.SiteUserDisable)
  const canSiteDelete = can(Perm.SiteUserDelete)
  const canAppointAdmin = can(Perm.SiteAppointAdmin)
  const canSiteRoles = can(Perm.SiteRoleManage)
  const { page, pageSize, setPage, setPageSize, patch, searchParams } =
    useListQueryState({
      defaultPageSize: DEFAULT_PAGE_SIZE,
    })
  const keyword = (searchParams.get('keyword') || '').trim()
  const dormantOnly =
    searchParams.get('dormant') === '1' ||
    searchParams.get('dormant') === 'true'
  /** 最近 N 天未登录筛选（>0 时优先于 dormantOnly） */
  const inactiveDaysParam = (() => {
    const raw = Number(searchParams.get('inactiveDays') || 0)
    if (!Number.isFinite(raw) || raw <= 0) return 0
    return Math.max(1, Math.min(365, Math.floor(raw)))
  })()
  const [keywordDraft, setKeywordDraft] = useState(keyword)
  const [inactiveDaysDraft, setInactiveDaysDraft] = useState(
    String(inactiveDaysParam || 14),
  )
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<UserListItem[]>([])
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [loading, setLoading] = useState(true)
  /** 竞态守卫：丢弃过期的用户列表响应 */
  const requestId = useRef(0)

  useEffect(() => {
    setKeywordDraft(keyword)
  }, [keyword])

  useEffect(() => {
    if (inactiveDaysParam > 0) {
      setInactiveDaysDraft(String(inactiveDaysParam))
    }
  }, [inactiveDaysParam])

  const [editUser, setEditUser] = useState<UserListItem | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [detailUser, setDetailUser] = useState<UserListItem | null>(null)
  const [spiderIntervalDraft, setSpiderIntervalDraft] = useState('')
  const [savingIntervals, setSavingIntervals] = useState(false)
  const [refreshQuotaDraft, setRefreshQuotaDraft] = useState('')
  const [savingQuota, setSavingQuota] = useState(false)
  /** C 端会员编辑（详情 Dialog） */
  const [subTierDraft, setSubTierDraft] = useState('')
  const [subDaysDraft, setSubDaysDraft] = useState('30')
  const [savingSub, setSavingSub] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [clearingDormant, setClearingDormant] = useState(false)
  const [freezingDormant, setFreezingDormant] = useState(false)
  const [togglingDisabled, setTogglingDisabled] = useState(false)
  /** 一键冻结对话框 */
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false)
  const [freezeDaysDraft, setFreezeDaysDraft] = useState('14')
  /** 「始终同步」开关二次确认目标 */
  const [syncExemptConfirmUser, setSyncExemptConfirmUser] =
    useState<UserListItem | null>(null)
  /** 详情内「站点角色」：自建站点角色列表与该用户持有集合 */
  const [siteRoles, setSiteRoles] = useState<RbacRole[]>([])
  const [heldRoleIds, setHeldRoleIds] = useState<Set<number>>(() => new Set())
  const [siteRolesLoading, setSiteRolesLoading] = useState(false)
  /** 竞态守卫：丢弃过期的站点角色持有查询 */
  const siteRolesRequestId = useRef(0)
  /** 站点角色列表缓存（同一会话内不重复拉取） */
  const siteRolesCacheRef = useRef<RbacRole[] | null>(null)
  /** 已加载持有角色的用户，避免详情对象更新时反复拉取 */
  const siteRolesLoadedForRef = useRef<number | null>(null)
  /** 添加 / 移除站点角色前二次确认（内置站点管理员与自建角色同一套交互） */
  const [roleToggleTarget, setRoleToggleTarget] = useState<{
    kind: 'siteAdmin' | 'custom'
    /** kind==='custom' 时为对应自建角色 */
    role?: RbacRole
    name: string
    assign: boolean
  } | null>(null)
  const [roleToggling, setRoleToggling] = useState(false)
  const [identitySaving, setIdentitySaving] = useState(false)

  const groupName = useCallback(
    (u: UserListItem) => {
      if (u.groupName) return u.groupName
      const fromList = groups.find((g) => g.id === u.groupId)?.name
      if (fromList) return fromList === '未分组' ? '默认分组' : fromList
      return '默认分组'
    },
    [groups],
  )

  const load = useCallback(async () => {
    const rid = ++requestId.current
    setLoading(true)
    const res = await listProfiles(page, pageSize, scope, keyword || undefined, {
      dormantOnly: inactiveDaysParam > 0 ? false : dormantOnly,
      inactiveDays: inactiveDaysParam > 0 ? inactiveDaysParam : undefined,
    })
    // 快速切换筛选/翻页时丢弃旧响应
    if (rid !== requestId.current) return
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '用户列表加载失败，稍后重试')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
  }, [page, pageSize, scope, keyword, dormantOnly, inactiveDaysParam])

  useEffect(() => {
    void load()
  }, [load])

  // 筛选/范围变化时清空勾选，避免误操作跨筛选用户
  useEffect(() => {
    setSelectedIds(new Set())
  }, [scope, keyword, dormantOnly, inactiveDaysParam])

  useEffect(() => {
    if (isSite) return
    let cancelled = false
    void listAllGroups().then((r) => {
      if (cancelled) return
      if (r.success && r.data) setGroups(r.data.list)
    })
    return () => {
      cancelled = true
    }
  }, [isSite, currentOrg?.id])

  // 打开详情时加载自建站点角色，并逐个查询该用户是否持有
  useEffect(() => {
    if (!isSite || !canSiteRoles) return
    if (!detailUser) {
      siteRolesLoadedForRef.current = null
      return
    }
    if (siteRolesLoadedForRef.current === detailUser.userId) return
    siteRolesLoadedForRef.current = detailUser.userId
    const rid = ++siteRolesRequestId.current
    const { userId } = detailUser
    setSiteRolesLoading(true)
    setHeldRoleIds(new Set())
    void (async () => {
      let all = siteRolesCacheRef.current
      if (!all) {
        const r = await listRoles('site')
        if (rid !== siteRolesRequestId.current) return
        if (!r.success) {
          setSiteRolesLoading(false)
          return
        }
        all = r.list
        siteRolesCacheRef.current = r.list
      }
      // 权限从大到小；同权限数按名称稳定排序（站点管理员是内置角色，恒排最前）
      const custom = all
        .filter((x) => !x.isSystem)
        .sort(
          (a, b) =>
            (b.permissions?.length || 0) - (a.permissions?.length || 0) ||
            a.name.localeCompare(b.name),
        )
      setSiteRoles(custom)
      const held = new Set<number>()
      const ur = await listUserRoles({ userId, scope: 'site' })
      if (ur.success) {
        for (const id of ur.roleIds) held.add(id)
      }
      // 快速切换详情时丢弃旧响应
      if (rid !== siteRolesRequestId.current) return
      setHeldRoleIds(held)
      setSiteRolesLoading(false)
    })()
  }, [detailUser, isSite, canSiteRoles])

  if (isSite && !canSiteList) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">
          需要站点管理员或获得相应授权后才能查看全站用户。
        </p>
      </PageShell>
    )
  }

  function openGroupEdit(u: UserListItem) {
    setEditUser(u)
    setEditValue(String(u.groupId))
  }

  async function handleSaveGroup() {
    if (!editUser) return
    setSaving(true)
    const res = await moveGroup({
      userId: editUser.userId,
      groupId: Number(editValue),
    })
    setSaving(false)
    if (res.success) {
      toast.success(res.message || '已更新分组')
      setEditUser(null)
      void load()
    } else toast.error(res.message || '更新失败，稍后重试')
  }

  /** 内置「站点管理员」角色的增删（与自建站点角色同一套交互） */
  async function handleToggleSiteAdminRole(u: UserListItem, wantAdmin: boolean) {
    const userId = u.userId
    setIdentitySaving(true)
    const res = await setSiteAdmin(userId, wantAdmin)
    setIdentitySaving(false)
    if (!res.success) {
      toast.error(res.message || '操作没完成，稍后重试')
      void load()
      return
    }
    toast.success(
      wantAdmin
        ? '已添加站点管理员角色'
        : '已移除站点管理员角色，对方将不再拥有站点级管理权限',
    )
    const patchRow = <T extends UserListItem>(row: T): T => ({
      ...row,
      isSiteAdmin: wantAdmin,
    })
    setList((prev) =>
      prev.map((row) => (row.userId === userId ? patchRow(row) : row)),
    )
    setDetailUser((cur) => (cur && cur.userId === userId ? patchRow(cur) : cur))
    void load()
  }

  /** 为详情用户添加 / 移除自建站点角色（内置身份走上方「站点身份」下拉） */
  async function handleToggleSiteRole() {
    if (!roleToggleTarget?.role || !detailUser || !canSiteRoles) return
    const { role, assign } = roleToggleTarget
    const userId = detailUser.userId
    setRoleToggling(true)
    if (assign) {
      const res = await assignRole(role.roleId, [userId])
      setRoleToggling(false)
      setRoleToggleTarget(null)
      if (!res.success) {
        toast.error(res.message || '操作没完成，稍后重试')
        return
      }
      if (res.added === 0 && res.skipped.includes(userId)) {
        toast.error(res.message || '该用户已拥有此角色，或暂时无法添加')
        return
      }
      toast.success(res.message || '已添加角色，对方重新进入后生效')
      setHeldRoleIds((prev) => {
        const next = new Set(prev)
        next.add(role.roleId)
        return next
      })
    } else {
      const res = await unassignRole(role.roleId, [userId])
      setRoleToggling(false)
      setRoleToggleTarget(null)
      if (!res.success) {
        toast.error(res.message || '操作没完成，稍后重试')
        return
      }
      toast.success(res.message || '已移除角色，对方重新进入后生效')
      setHeldRoleIds((prev) => {
        const next = new Set(prev)
        next.delete(role.roleId)
        return next
      })
    }
  }

  async function handleToggleSyncExempt(u: UserListItem) {
    if (!canSiteSync) return
    const next = !u.syncExempt
    const key = `${u.userId}:sync-exempt`
    setTogglingKey(key)
    const res = await setSyncExempt(u.userId, next)
    setTogglingKey(null)
    if (res.success) {
      toast.success(next ? '已设为始终同步' : '已取消始终同步')
      setList((prev) =>
        prev.map((row) =>
          row.userId === u.userId
            ? { ...row, syncExempt: next, dormant: next ? false : row.dormant }
            : row,
        ),
      )
      setDetailUser((cur) =>
        cur && cur.userId === u.userId
          ? { ...cur, syncExempt: next, dormant: next ? false : cur.dormant }
          : cur,
      )
    } else toast.error(res.message || '操作没完成，稍后重试')
  }

  function toggleSelected(userId: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(userId)
      else next.delete(userId)
      return next
    })
  }

  function toggleSelectAllOnPage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const u of list) {
        if (checked) next.add(u.userId)
        else next.delete(u.userId)
      }
      return next
    })
  }

  async function handleClearDormant(userIds: number[]) {
    if (!canSiteSync) return
    const ids = Array.from(new Set(userIds.filter((id) => id > 0)))
    if (!ids.length) {
      toast.error('先勾选要解除的用户')
      return
    }
    setClearingDormant(true)
    const res = await clearDormant(ids)
    setClearingDormant(false)
    if (!res.success) {
      toast.error(res.message || '解除失败，稍后重试')
      return
    }
    const n = res.data?.updated ?? ids.length
    toast.success(res.data?.message || res.message || `已恢复 ${n} 人的同步`)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
    const nowSec = Math.floor(Date.now() / 1000)
    setList((prev) =>
      prev.map((row) =>
        ids.includes(row.userId)
          ? {
              ...row,
              dormant: false,
              adminForceDormant: false,
              lastLoginAt: nowSec,
            }
          : row,
      ),
    )
    setDetailUser((cur) =>
      cur && ids.includes(cur.userId)
        ? {
            ...cur,
            dormant: false,
            adminForceDormant: false,
            lastLoginAt: nowSec,
          }
        : cur,
    )
    // 在「仅不活跃」筛选下刷新，让已解除的人从列表消失
    if (dormantOnly || inactiveDaysParam > 0) void load()
  }

  async function handleForceDormant(opts: {
    userIds?: number[]
    inactiveDays?: number
  }) {
    if (!canSiteSync) return
    const ids = Array.from(
      new Set((opts.userIds || []).filter((id) => id > 0)),
    )
    const days = Math.floor(Number(opts.inactiveDays) || 0)
    if (!ids.length && days <= 0) {
      toast.error('勾选用户，或填写未登录天数')
      return
    }
    setFreezingDormant(true)
    const res = await forceDormant(
      ids.length ? { userIds: ids } : { inactiveDays: days },
    )
    setFreezingDormant(false)
    if (!res.success) {
      toast.error(res.message || '暂停同步失败，稍后重试')
      return
    }
    toast.success(
      res.data?.message ||
        res.message ||
        `已暂停 ${res.data?.updated ?? 0} 人的同步`,
    )
    setFreezeDialogOpen(false)
    if (ids.length) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.delete(id)
        return next
      })
    } else {
      setSelectedIds(new Set())
    }
    void load()
  }

  function applyInactiveDaysFilter() {
    const days = Math.max(
      1,
      Math.min(365, Math.floor(Number(inactiveDaysDraft) || 14)),
    )
    setInactiveDaysDraft(String(days))
    patch({ dormant: null, inactiveDays: String(days) })
  }

  const pageAllSelected =
    list.length > 0 && list.every((u) => selectedIds.has(u.userId))
  const pageSomeSelected =
    list.some((u) => selectedIds.has(u.userId)) && !pageAllSelected

  async function handleDelete(userId: number) {
    if (!canSiteDelete) return
    if (userId === 2) {
      toast.error('该账号为系统保留，无法删除')
      return
    }
    const res = await deleteUser(userId)
    if (res.success) {
      toast.success(res.message || '已移除该用户')
      void load()
    } else toast.error(res.message || '删除失败，稍后重试')
  }

  async function handleSetDisabled(u: UserListItem, disabled: boolean) {
    if (!canSiteDisable) return
    if (u.isSiteAdmin) {
      toast.error('不能禁用站点管理员账号')
      return
    }
    setTogglingDisabled(true)
    const res = await setUserDisabled(u.userId, disabled)
    setTogglingDisabled(false)
    if (!res.success) {
      toast.error(res.message || (disabled ? '禁用失败，稍后重试' : '启用失败，稍后重试'))
      return
    }
    toast.success(
      res.message ||
        (disabled ? '已禁用该账号，对方将无法登录' : '已启用该账号'),
    )
    setList((prev) =>
      prev.map((row) =>
        row.userId === u.userId
          ? {
              ...row,
              disabled,
              dormant: disabled ? true : row.dormant,
              adminForceDormant: disabled ? true : row.adminForceDormant,
            }
          : row,
      ),
    )
    setDetailUser((cur) =>
      cur && cur.userId === u.userId
        ? {
            ...cur,
            disabled,
            dormant: disabled ? true : cur.dormant,
            adminForceDormant: disabled ? true : cur.adminForceDormant,
          }
        : cur,
    )
  }

  async function handleSyncOj(userId: number) {
    setSyncingId(userId)
    const res = await updateSpider(userId)
    setSyncingId(null)
    if (res.success) toast.success(res.message || '已开始同步该用户的 OJ 数据')
    else toast.error(res.message || '同步失败，稍后重试')
  }

  function openDetail(u: UserListItem) {
    setDetailUser(u)
    setSpiderIntervalDraft(String(u.spiderIntervalMin ?? 60))
    setRefreshQuotaDraft(String(u.dailyRefreshQuota ?? 2))
  }

  async function saveSyncIntervals(mode: 'save' | 'clearSpider') {
    if (!detailUser || !canSiteSync) return
    let spiderIntervalMin = Number(spiderIntervalDraft)
    if (mode === 'save') {
      if (
        !Number.isFinite(spiderIntervalMin) ||
        spiderIntervalMin < 5 ||
        spiderIntervalMin > 10080
      ) {
        toast.error('同步间隔须为 5–10080 分钟')
        return
      }
    } else {
      spiderIntervalMin = 0
    }
    setSavingIntervals(true)
    const res = await setSyncIntervals({
      userId: detailUser.userId,
      setSpider: true,
      spiderIntervalMin,
    })
    setSavingIntervals(false)
    if (!res.success) {
      toast.error(res.message || '同步间隔保存失败，稍后重试')
      return
    }
    toast.success(res.message || '已更新同步间隔')
    // 刷新列表以拿有效间隔
    const listRes = await listProfiles(page, pageSize, scope, keyword || undefined, {
      dormantOnly,
    })
    if (listRes.success && listRes.data) {
      setList(listRes.data.list)
      setTotal(listRes.data.total)
      const next = listRes.data.list.find((x) => x.userId === detailUser.userId)
      if (next) {
        setDetailUser(next)
        setSpiderIntervalDraft(String(next.spiderIntervalMin ?? 60))
      }
    }
  }

  async function saveRefreshQuota(mode: 'save' | 'clear') {
    if (!detailUser || !canSiteSync) return
    let quota = Number(refreshQuotaDraft)
    if (mode === 'save') {
      if (!Number.isInteger(quota) || quota < 0 || quota > 100) {
        toast.error('每日刷新配额须为 0（禁止）或 1–100 次')
        return
      }
    } else {
      quota = 0
    }
    setSavingQuota(true)
    const res =
      mode === 'clear'
        ? await setRefreshQuota({ userId: detailUser.userId, clear: true })
        : await setRefreshQuota({ userId: detailUser.userId, quota })
    setSavingQuota(false)
    if (!res.success) {
      toast.error(res.message || '配额保存失败，稍后重试')
      return
    }
    toast.success(res.message || '已更新每日刷新配额')
    // 刷新列表以拿有效配额
    const listRes = await listProfiles(page, pageSize, scope, keyword || undefined, {
      dormantOnly,
    })
    if (listRes.success && listRes.data) {
      setList(listRes.data.list)
      setTotal(listRes.data.total)
      const next = listRes.data.list.find((x) => x.userId === detailUser.userId)
      if (next) {
        setDetailUser(next)
        setRefreshQuotaDraft(String(next.dailyRefreshQuota ?? 2))
      }
    }
  }

  /** 会员：赋予/续期（从当前到期叠加）或取消订阅；成功后重拉列表回填详情 */
  async function handleGrantSub() {
    if (!detailUser || !canSiteSync) return
    if (!subTierDraft) {
      toast.error('请选择会员档位')
      return
    }
    const days = Number(subDaysDraft)
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      toast.error('天数须为 1–365 的整数')
      return
    }
    setSavingSub(true)
    const res = await grantSubscription(detailUser.userId, subTierDraft, days)
    setSavingSub(false)
    if (!res.success) {
      toast.error(res.message || '赋予失败，稍后重试')
      return
    }
    toast.success(res.message || '已赋予会员')
    const listRes = await listProfiles(page, pageSize, scope, keyword || undefined, {
      dormantOnly,
    })
    if (listRes.success && listRes.data) {
      setList(listRes.data.list)
      setTotal(listRes.data.total)
      const next = listRes.data.list.find((x) => x.userId === detailUser.userId)
      if (next) {
        setDetailUser(next)
        setSubTierDraft(next.subTier || '')
      }
    }
  }

  async function handleRevokeSub() {
    if (!detailUser || !canSiteSync) return
    setSavingSub(true)
    const res = await revokeSubscription(detailUser.userId)
    setSavingSub(false)
    if (!res.success) {
      toast.error(res.message || '取消失败，稍后重试')
      return
    }
    toast.success('已取消订阅')
    const listRes = await listProfiles(page, pageSize, scope, keyword || undefined, {
      dormantOnly,
    })
    if (listRes.success && listRes.data) {
      setList(listRes.data.list)
      setTotal(listRes.data.total)
      const next = listRes.data.list.find((x) => x.userId === detailUser.userId)
      if (next) {
        setDetailUser(next)
        setSubTierDraft(next.subTier || '')
      }
    }
  }

  async function handlePipelineToggle(
    u: UserListItem,
    kind: 'fetch' | 'ai',
    checked: boolean,
  ) {
    const key = `${u.userId}:pipeline:${kind}`
    setTogglingKey(key)
    setList((prev) =>
      prev.map((row) => {
        if (row.userId !== u.userId) return row
        return kind === 'fetch'
          ? { ...row, problemFetchEnabled: checked }
          : { ...row, problemAiEnabled: checked }
      }),
    )
    setDetailUser((cur) =>
      cur && cur.userId === u.userId
        ? kind === 'fetch'
          ? { ...cur, problemFetchEnabled: checked }
          : { ...cur, problemAiEnabled: checked }
        : cur,
    )
    const res = await setProblemPipeline(u.userId, checked, kind)
    setTogglingKey(null)
    if (res.success) {
      toast.success(
        res.message ||
          (kind === 'fetch'
            ? checked
              ? '已开启抓取题面'
              : '已关闭抓取题面'
            : checked
              ? '已开启题面 AI'
              : '已关闭题面 AI'),
      )
    } else {
      setList((prev) =>
        prev.map((row) => {
          if (row.userId !== u.userId) return row
          return kind === 'fetch'
            ? { ...row, problemFetchEnabled: !checked }
            : { ...row, problemAiEnabled: !checked }
        }),
      )
      setDetailUser((cur) =>
        cur && cur.userId === u.userId
          ? kind === 'fetch'
            ? { ...cur, problemFetchEnabled: !checked }
            : { ...cur, problemAiEnabled: !checked }
          : cur,
      )
      toast.error(res.message || '设置失败，稍后重试')
    }
  }

  async function handleEmailToggle(
    u: UserListItem,
    kind: 'daily' | 'weekly',
    checked: boolean,
  ) {
    if (checked) {
      if (kind === 'daily' && u.emailAllowedByOrg === false) {
        toast.error('该成员所在组织未开通日报邮件，无法开启')
        return
      }
      if (kind === 'weekly' && u.emailWeeklyAllowedByOrg === false) {
        toast.error(
          '该成员需为教练/队长/团队管理员，且组织已开通周报，才可开启',
        )
        return
      }
    }
    const key = `${u.userId}:${kind}`
    setTogglingKey(key)
    setList((prev) =>
      prev.map((row) => {
        if (row.userId !== u.userId) return row
        return kind === 'daily'
          ? { ...row, emailEnabled: checked }
          : { ...row, emailWeeklyEnabled: checked }
      }),
    )
    const res = await setEmailEnabled(u.userId, checked, kind)
    setTogglingKey(null)
    if (res.success) {
      toast.success(
        res.message ||
          (kind === 'daily'
            ? checked
              ? '已开启日报'
              : '已关闭日报'
            : checked
              ? '已开启周报'
              : '已关闭周报'),
      )
    } else {
      setList((prev) =>
        prev.map((row) => {
          if (row.userId !== u.userId) return row
          return kind === 'daily'
            ? { ...row, emailEnabled: !checked }
            : { ...row, emailWeeklyEnabled: !checked }
        }),
      )
      toast.error(res.message || '设置失败，稍后重试')
    }
  }

  const canToggleEmail = can(Perm.OrgMemberEmail)
  const title = isSite
    ? '站点用户'
    : currentOrg?.name
      ? `${currentOrg.name} · 成员`
      : '组织成员'
  const desc = isSite
    ? '管理全站用户与所属组织。站管可暂停任意用户的自动同步（不按组织约定跳过），也可禁用账号使其无法登录。'
    : '当前组织成员。长期未登录会暂停自动同步；组织「强制同步」或个人「始终同步」的成员不受自动暂停影响。'

  return (
    <PageShell className="gap-3">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b space-y-3">
          <CardTitle className="text-base">{isSite ? '用户列表' : '成员列表'}</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
            <Input
              className="sm:max-w-xs"
              placeholder={
                isSite ? '搜索昵称或用户名' : '搜索组织内名称或用户名'
              }
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  patch({ keyword: keywordDraft.trim() || null })
                }
              }}
              aria-label="搜索用户"
            />
            <Select
              value={
                inactiveDaysParam > 0
                  ? 'inactive'
                  : dormantOnly
                    ? 'dormant'
                    : 'all'
              }
              onValueChange={(v) => {
                const next = String(v ?? 'all')
                if (next === 'dormant') {
                  patch({ dormant: '1', inactiveDays: null })
                } else if (next === 'inactive') {
                  const days = Math.max(
                    1,
                    Math.min(365, Math.floor(Number(inactiveDaysDraft) || 14)),
                  )
                  setInactiveDaysDraft(String(days))
                  patch({ dormant: null, inactiveDays: String(days) })
                } else {
                  patch({ dormant: null, inactiveDays: null })
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[13rem]" size="sm" aria-label="活跃状态筛选">
                <SelectValue placeholder="全部用户" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部用户</SelectItem>
                <SelectItem value="dormant">已暂停同步</SelectItem>
                <SelectItem value="inactive">最近未登录</SelectItem>
              </SelectContent>
            </Select>
            {inactiveDaysParam > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  最近
                </span>
                <Input
                  className="w-16 h-8"
                  type="number"
                  min={1}
                  max={365}
                  value={inactiveDaysDraft}
                  onChange={(e) => setInactiveDaysDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyInactiveDaysFilter()
                  }}
                  aria-label="未登录天数"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  天未登录
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={applyInactiveDaysFilter}
                >
                  应用
                </Button>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => patch({ keyword: keywordDraft.trim() || null })}
              >
                搜索
              </Button>
              {(keyword || keywordDraft || dormantOnly || inactiveDaysParam > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setKeywordDraft('')
                    setInactiveDaysDraft('14')
                    patch({ keyword: null, dormant: null, inactiveDays: null })
                  }}
                >
                  清空
                </Button>
              )}
              {canSiteSync && isSite && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={freezingDormant}
                  onClick={() => {
                    setFreezeDaysDraft(
                      String(
                        inactiveDaysParam > 0
                          ? inactiveDaysParam
                          : Math.max(
                              1,
                              Math.min(
                                365,
                                Math.floor(Number(inactiveDaysDraft) || 14),
                              ),
                            ),
                      ),
                    )
                    setFreezeDialogOpen(true)
                  }}
                >
                  一键暂停不活跃同步
                </Button>
              )}
              {canSiteSync && selectedIds.size > 0 && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        disabled={clearingDormant || freezingDormant}
                      >
                        {clearingDormant
                          ? '处理中…'
                          : `恢复同步（${selectedIds.size}）`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          恢复 {selectedIds.size} 人的同步？
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          会把这些人的「最近活跃」更新为现在，自动同步会恢复。这只是一次性操作：之后如果长时间不再登录，仍可能再次暂停。不会设为「始终同步」。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            void handleClearDormant(Array.from(selectedIds))
                          }
                        >
                          确认解除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={freezingDormant || clearingDormant}
                      >
                        {freezingDormant
                          ? '处理中…'
                          : `暂停同步（${selectedIds.size}）`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          暂停 {selectedIds.size} 人的自动同步？
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          将暂停这些人的自动同步，不按组织约定或「始终同步」跳过。对方再次登录或你手动「恢复同步」后会继续。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            void handleForceDormant({
                              userIds: Array.from(selectedIds),
                            })
                          }
                        >
                          确认暂停
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : list.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {inactiveDaysParam > 0 && keyword
                ? `没有找到与「${keyword}」相关、且最近 ${inactiveDaysParam} 天未登录的用户`
                : inactiveDaysParam > 0
                  ? `最近 ${inactiveDaysParam} 天没有未登录用户`
                  : dormantOnly && keyword
                    ? `没有找到与「${keyword}」相关、已暂停同步的用户`
                    : dormantOnly
                      ? '当前没有已暂停同步的用户'
                      : keyword
                        ? `没有找到与「${keyword}」相关的用户`
                        : isSite
                          ? '还没有用户'
                          : '还没有成员'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canSiteSync && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          pageAllSelected
                            ? true
                            : pageSomeSelected
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={(v) =>
                          toggleSelectAllOnPage(v === true)
                        }
                        aria-label="全选本页"
                      />
                    </TableHead>
                  )}
                  <TableHead>成员</TableHead>
                  <TableHead>{isSite ? '所属组织' : '分组'}</TableHead>
                  <TableHead className="w-[10rem] hidden md:table-cell">报告邮件</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((u) => {
                  const dailyOn = !!u.emailEnabled
                  const weeklyOn = !!u.emailWeeklyEnabled
                  const dailyCanOpen = u.emailAllowedByOrg !== false
                  const weeklyCanOpen = u.emailWeeklyAllowedByOrg !== false
                  const dailyBusy = togglingKey === `${u.userId}:daily`
                  const weeklyBusy = togglingKey === `${u.userId}:weekly`
                  const selected = selectedIds.has(u.userId)
                  return (
                    <TableRow key={u.userId} data-state={selected ? 'selected' : undefined}>
                      {canSiteSync && (
                        <TableCell>
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(v) =>
                              toggleSelected(u.userId, v === true)
                            }
                            aria-label={`选择 ${u.name || u.username}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar className="hidden size-8 sm:flex">
                          <AvatarImage src={u.avatar || undefined} />
                          <AvatarFallback>
                            {(u.name || u.username || '?').slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            to={
                              u.username
                                ? `/profile/${u.username}`
                                : `/profile?id=${u.userId}`
                            }
                            className="w-fit font-medium hover:underline"
                          >
                            {u.name || u.username}
                          </Link>
                          {u.isSiteAdmin && (
                            <Badge variant="default" className="text-[10px]">
                              站点管理员
                            </Badge>
                          )}
                          {(u.siteRoles || []).map((r) => (
                            <Badge
                              key={r}
                              variant="secondary"
                              className="max-w-[8rem] truncate text-[10px]"
                            >
                              {r}
                            </Badge>
                          ))}
                          {u.disabled ? (
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                              title="账号已被禁用，无法登录"
                            >
                              已禁用
                            </Badge>
                          ) : null}
                          {u.dormant ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-destructive/40 text-destructive"
                              title="已暂停自动同步"
                            >
                              已暂停同步
                            </Badge>
                          ) : !u.lastLoginAt ? (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                              title="还没记录最近活跃时间，筛选「最近未登录」时会列出"
                            >
                              未记录活跃
                            </Badge>
                          ) : null}
                          {u.syncExempt && !u.disabled && !u.dormant && (
                            <Badge variant="secondary" className="text-[10px]">
                              始终同步
                            </Badge>
                          )}
                        </div>
                        {u.username ? (
                          <span className="truncate text-xs text-muted-foreground">
                            @{u.username}
                          </span>
                        ) : null}
                        </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isSite ? (
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {(u.orgs || []).map((o) => (
                              <Badge
                                key={o.orgId}
                                variant="secondary"
                                className="font-normal"
                              >
                                {o.name}
                                {o.role && o.role !== 'member' ? (
                                  <span className="ml-1 text-muted-foreground">
                                    · {orgRoleName(o.role)}
                                  </span>
                                ) : null}
                              </Badge>
                            ))}
                            {!(u.orgs || []).length && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        ) : (
                          groupName(u)
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-7 shrink-0 text-xs text-muted-foreground">
                              日报
                            </span>
                            {canToggleEmail ? (
                              <Switch
                                checked={dailyOn}
                                disabled={dailyBusy || (!dailyCanOpen && !dailyOn)}
                                onCheckedChange={(v) =>
                                  void handleEmailToggle(u, 'daily', v)
                                }
                                aria-label={`${u.name} 日报`}
                              />
                            ) : (
                              <Badge
                                variant={dailyOn ? 'default' : 'secondary'}
                                className="font-normal"
                              >
                                {dailyOn ? '接收中' : '已关闭'}
                              </Badge>
                            )}
                            {!dailyCanOpen && !dailyOn ? (
                              <span className="text-[10px] text-muted-foreground">
                                组织未授权
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-7 shrink-0 text-xs text-muted-foreground">
                              周报
                            </span>
                            {canToggleEmail ? (
                              <Switch
                                checked={weeklyOn}
                                disabled={
                                  weeklyBusy || (!weeklyCanOpen && !weeklyOn)
                                }
                                onCheckedChange={(v) =>
                                  void handleEmailToggle(u, 'weekly', v)
                                }
                                aria-label={`${u.name} 周报`}
                              />
                            ) : (
                              <Badge
                                variant={weeklyOn ? 'default' : 'secondary'}
                                className="font-normal"
                              >
                                {weeklyOn ? '接收中' : '已关闭'}
                              </Badge>
                            )}
                            {!weeklyCanOpen && !weeklyOn ? (
                              <span className="text-[10px] text-muted-foreground">
                                需教练角色
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isSite && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openDetail(u)}
                            >
                              详情
                            </Button>
                          )}
                          {!isSite && isStaff && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openGroupEdit(u)}
                            >
                              调整分组
                            </Button>
                          )}
                          {canSiteSync && !isSite && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={syncingId === u.userId}
                                >
                                  同步 OJ
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    同步「{u.name || u.username}」的 OJ 数据？
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    将从该用户已绑定的各平台重新同步提交与比赛记录，可能需要一些时间。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleSyncOj(u.userId)}
                                  >
                                    确认同步
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        onChange={setPage}
        onPageSizeChange={setPageSize}
        disabled={loading}
      />

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改分组 · {editUser?.name}</DialogTitle>
          </DialogHeader>
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
              取消
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSaveGroup()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!detailUser}
        onOpenChange={(o) => {
          if (!o) setDetailUser(null)
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
            <DialogTitle>
              用户详情 · {detailUser?.name || detailUser?.username}
            </DialogTitle>
            <DialogDescription>
              站点级操作与题面自动识别开关。默认仅非公共域组织成员会同步题面与
              AI 标签；可对个人强制开/关。
            </DialogDescription>
          </DialogHeader>
          {detailUser ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={detailUser.avatar || undefined} />
                  <AvatarFallback>
                    {(detailUser.name || detailUser.username || '?').slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium truncate">
                      {detailUser.name || detailUser.username}
                    </span>
                    {detailUser.isSiteAdmin && (
                      <Badge variant="default" className="text-[10px]">
                        站点管理员
                      </Badge>
                    )}
                    {(detailUser.siteRoles || []).map((r) => (
                      <Badge
                        key={r}
                        variant="secondary"
                        className="max-w-[8rem] truncate text-[10px]"
                      >
                        {r}
                      </Badge>
                    ))}
                    {detailUser.disabled ? (
                      <Badge
                        variant="destructive"
                        className="text-[10px]"
                        title="账号已被禁用，无法登录"
                      >
                        已禁用
                      </Badge>
                    ) : null}
                    {detailUser.dormant ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-destructive/40 text-destructive"
                        title="已暂停自动同步"
                      >
                        已暂停同步
                      </Badge>
                    ) : !detailUser.lastLoginAt ? (
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        title="还没记录最近活跃时间"
                      >
                        未记录活跃
                      </Badge>
                    ) : null}
                    {detailUser.syncExempt &&
                      !detailUser.disabled &&
                      !detailUser.dormant && (
                        <Badge variant="secondary" className="text-[10px]">
                          始终同步
                        </Badge>
                      )}
                  </div>
                  <span className="text-sm text-muted-foreground truncate">
                    @{detailUser.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    注册时间：
                    {detailUser.createdAt
                      ? new Date(detailUser.createdAt * 1000).toLocaleString(
                          'zh-CN',
                          {
                            hour12: false,
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )
                      : '还没有记录'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    最近活跃：
                    {detailUser.lastLoginAt
                      ? new Date(detailUser.lastLoginAt * 1000).toLocaleString(
                          'zh-CN',
                          {
                            hour12: false,
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )
                      : '还没有记录'}
                  </span>
                </div>
              </div>

              <div className="flex max-w-full flex-wrap gap-1">
                {(detailUser.orgs || []).map((o) => (
                  <Badge
                    key={o.orgId}
                    variant="secondary"
                    className="font-normal"
                  >
                    {o.name}
                    {o.role && o.role !== 'member' ? (
                      <span className="ml-1 text-muted-foreground">
                        · {orgRoleName(o.role)}
                      </span>
                    ) : null}
                  </Badge>
                ))}
                {!(detailUser.orgs || []).length && (
                  <span className="text-xs text-muted-foreground">暂时还没有组织信息</span>
                )}
              </div>

              {(canSiteSync || canSiteDisable || isAdmin) && (
              <>
              <Separator />

              <FieldGroup className="gap-4">
                {canSiteSync && (
                  <Field orientation="horizontal">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <FieldLabel htmlFor="sync-exempt">始终同步</FieldLabel>
                      <FieldDescription>
                        即使长时间未登录，也继续自动同步
                      </FieldDescription>
                    </div>
                    <Switch
                      id="sync-exempt"
                      checked={!!detailUser.syncExempt}
                      disabled={
                        togglingKey === `${detailUser.userId}:sync-exempt`
                      }
                      onCheckedChange={() =>
                        setSyncExemptConfirmUser(detailUser)
                      }
                    />
                  </Field>
                )}
                {canSiteSync && (detailUser.dormant || !detailUser.lastLoginAt) && (
                  <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">恢复同步</p>
                      <p className="text-xs text-muted-foreground">
                        把最近活跃刷新为现在，同步会恢复。只解除这一次，之后长时间未登录仍会再次暂停。
                      </p>
                    </div>
                    <div>
                      <ConfirmDialog
                        title="恢复同步？"
                        description={`确定恢复「${detailUser.name || detailUser.username}」的同步？之后若长时间未登录仍可能再次暂停。`}
                        confirmLabel="立即解除"
                        loading={clearingDormant}
                        onConfirm={() =>
                          void handleClearDormant([detailUser.userId])
                        }
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={clearingDormant}
                        >
                          {clearingDormant ? '处理中…' : '立即解除'}
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </div>
                )}
                {canSiteSync && !detailUser.dormant && (
                  <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">暂停自动同步</p>
                      <p className="text-xs text-muted-foreground">
                        暂停此人的自动同步，不按组织约定或「始终同步」跳过。对方再次登录或你手动恢复后会继续同步。
                      </p>
                    </div>
                    <div>
                      <ConfirmDialog
                        title="暂停自动同步？"
                        description={`确定暂停「${detailUser.name || detailUser.username}」的自动同步？对方再次登录或你手动恢复后会继续同步。`}
                        confirmLabel="确认暂停"
                        loading={freezingDormant}
                        onConfirm={() =>
                          void handleForceDormant({
                            userIds: [detailUser.userId],
                          })
                        }
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={freezingDormant}
                        >
                          {freezingDormant ? '处理中…' : '立即暂停同步'}
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </div>
                )}
                {canSiteDisable && !detailUser.isSiteAdmin && (
                  <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">
                        {detailUser.disabled ? '启用账号' : '禁用账号'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {detailUser.disabled
                          ? '启用后对方可重新登录。若此前已暂停同步，仍可按规则恢复。'
                          : '禁用后对方无法登录，自动同步也会暂停。可随时在此重新启用。'}
                      </p>
                    </div>
                    <div>
                      <ConfirmDialog
                        title={
                          detailUser.disabled
                            ? '启用该账号？'
                            : '禁用该账号？'
                        }
                        description={
                          detailUser.disabled
                            ? `确定启用「${detailUser.name || detailUser.username}」？对方将可以重新登录。`
                            : `确定禁用「${detailUser.name || detailUser.username}」？对方将无法登录，直到你重新启用。`
                        }
                        confirmLabel={
                          detailUser.disabled ? '确认启用' : '确认禁用'
                        }
                        destructive={!detailUser.disabled}
                        loading={togglingDisabled}
                        onConfirm={() =>
                          void handleSetDisabled(
                            detailUser,
                            !detailUser.disabled,
                          )
                        }
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            detailUser.disabled ? 'secondary' : 'destructive'
                          }
                          disabled={togglingDisabled}
                        >
                          {togglingDisabled
                            ? '处理中…'
                            : detailUser.disabled
                              ? '立即启用'
                              : '立即禁用'}
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </div>
                )}
                {isAdmin && (
                  <>
                    <Field orientation="horizontal">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <FieldLabel htmlFor="pipeline-fetch">抓取题面</FieldLabel>
                        <FieldDescription>
                          开启后，该用户近窗提交可触发抓取题面
                        </FieldDescription>
                      </div>
                      <Switch
                        id="pipeline-fetch"
                        checked={!!detailUser.problemFetchEnabled}
                        disabled={
                          togglingKey === `${detailUser.userId}:pipeline:fetch`
                        }
                        onCheckedChange={(v) =>
                          void handlePipelineToggle(detailUser, 'fetch', v)
                        }
                      />
                    </Field>
                    <Field orientation="horizontal">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <FieldLabel htmlFor="pipeline-ai">AI 分析题面</FieldLabel>
                        <FieldDescription>
                          开启后，该用户近窗提交可触发题面 AI（与爬取独立）
                        </FieldDescription>
                      </div>
                      <Switch
                        id="pipeline-ai"
                        checked={!!detailUser.problemAiEnabled}
                        disabled={
                          togglingKey === `${detailUser.userId}:pipeline:ai`
                        }
                        onCheckedChange={(v) =>
                          void handlePipelineToggle(detailUser, 'ai', v)
                        }
                      />
                    </Field>
                  </>
                )}
              </FieldGroup>
              </>
              )}

              {canSiteSync && (
              <>
              <Separator />

              <FieldGroup className="gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">个人同步间隔</p>
                  <p className="text-xs text-muted-foreground">
                    站点管理员指定后优先于组织设置；清除后回落组织最短间隔
                  </p>
                </div>
                <Field>
                  <FieldLabel htmlFor="spider-interval">
                    数据同步间隔（分钟）
                    {detailUser.spiderIntervalOverridden ? (
                      <Badge variant="secondary" className="ml-2 font-normal">
                        站管指定
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 font-normal">
                        组织默认
                      </Badge>
                    )}
                  </FieldLabel>
                  <Input
                    id="spider-interval"
                    type="number"
                    min={5}
                    max={10080}
                    value={spiderIntervalDraft}
                    onChange={(e) => setSpiderIntervalDraft(e.target.value)}
                    disabled={savingIntervals}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingIntervals}
                    onClick={() => void saveSyncIntervals('save')}
                  >
                    {savingIntervals ? '保存中…' : '保存间隔'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingIntervals || !detailUser.spiderIntervalOverridden}
                    onClick={() => void saveSyncIntervals('clearSpider')}
                  >
                    清除同步覆盖
                  </Button>
                </div>
              </FieldGroup>

              <Separator />

              <FieldGroup className="gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">每日刷新配额</p>
                  <p className="text-xs text-muted-foreground">
                    用户手动刷新 OJ 做题记录的次数上限（次/日）。站管指定后优先于全局默认；0 = 禁止手动刷新
                  </p>
                </div>
                <Field>
                  <FieldLabel htmlFor="refresh-quota">
                    每日手动刷新次数
                    {detailUser.dailyRefreshQuotaOverridden ? (
                      <Badge variant="secondary" className="ml-2 font-normal">
                        站管指定
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 font-normal">
                        全局默认
                      </Badge>
                    )}
                  </FieldLabel>
                  <Input
                    id="refresh-quota"
                    type="number"
                    min={0}
                    max={100}
                    value={refreshQuotaDraft}
                    onChange={(e) => setRefreshQuotaDraft(e.target.value)}
                    disabled={savingQuota}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingQuota}
                    onClick={() => void saveRefreshQuota('save')}
                  >
                    {savingQuota ? '保存中…' : '保存配额'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingQuota || !detailUser.dailyRefreshQuotaOverridden}
                    onClick={() => void saveRefreshQuota('clear')}
                  >
                    清除配额覆盖
                  </Button>
                </div>
              </FieldGroup>

              <Separator />

              <FieldGroup className="gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">会员（C 端订阅）</p>
                  <p className="text-xs text-muted-foreground">
                    人工赋予/更新 Plus/Pro 会员：从当前到期时间起叠加天数（已过期从今天起算）；
                    取消订阅立即回落免费。赞助入口在个人资料页（赞助支持）
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <Field>
                    <FieldLabel htmlFor="sub-tier-select">会员档位</FieldLabel>
                    <Select
                      value={subTierDraft}
                      onValueChange={setSubTierDraft}
                    >
                      <SelectTrigger id="sub-tier-select" className="w-40">
                        <SelectValue placeholder="无 / Plus / Pro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">无（取消订阅）</SelectItem>
                        <SelectItem value="plus">Plus 会员（2 元/月）</SelectItem>
                        <SelectItem value="pro">Pro 会员（7 元/月）</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="sub-days">天数（1–365）</FieldLabel>
                    <Input
                      id="sub-days"
                      type="number"
                      min={1}
                      max={365}
                      value={subDaysDraft}
                      onChange={(e) => setSubDaysDraft(e.target.value)}
                      disabled={savingSub}
                    />
                  </Field>
                </div>
                {detailUser.subTier ? (
                  <p className="text-xs text-muted-foreground">
                    当前：{detailUser.subTier === 'pro' ? 'Pro 会员' : 'Plus 会员'}
                    {detailUser.subExpireAt ? ` · 到期 ${new Date(detailUser.subExpireAt * 1000).toLocaleDateString('zh-CN')}` : ''}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingSub || !subTierDraft}
                    onClick={() => void handleGrantSub()}
                  >
                    {savingSub ? '处理中…' : detailUser.subTier ? '续期 / 更新' : '赋予会员'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingSub || !detailUser.subTier}
                    onClick={() => void handleRevokeSub()}
                  >
                    取消订阅
                  </Button>
                </div>
              </FieldGroup>
              </>
              )}

              {(canAppointAdmin || canSiteRoles) && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">站点角色</p>
                      <p className="text-xs text-muted-foreground">
                        点选可为该用户添加或移除站点角色，按权限从大到小排列，对方重新进入后生效。
                      </p>
                    </div>
                    {siteRolesLoading ? (
                      <p className="text-xs text-muted-foreground">加载中…</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {canAppointAdmin && (
                          <button
                            type="button"
                            disabled={identitySaving}
                            aria-pressed={Boolean(detailUser.isSiteAdmin)}
                            title="站点管理员：内置角色，拥有全站管理权限"
                            className="rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                            onClick={() =>
                              setRoleToggleTarget({
                                kind: 'siteAdmin',
                                name: '站点管理员',
                                assign: !detailUser.isSiteAdmin,
                              })
                            }
                          >
                            <Badge
                              variant={
                                detailUser.isSiteAdmin ? 'default' : 'outline'
                              }
                            >
                              站点管理员
                            </Badge>
                          </button>
                        )}
                        {canSiteRoles &&
                          siteRoles.map((role) => {
                            const held = heldRoleIds.has(role.roleId)
                            return (
                              <button
                                key={role.roleId}
                                type="button"
                                disabled={roleToggling}
                                aria-pressed={held}
                                title={role.description || role.name}
                                className="rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                onClick={() =>
                                  setRoleToggleTarget({
                                    kind: 'custom',
                                    role,
                                    name: role.name,
                                    assign: !held,
                                  })
                                }
                              >
                                <Badge variant={held ? 'default' : 'outline'}>
                                  {role.name}
                                </Badge>
                              </button>
                            )
                          })}
                      </div>
                    )}
                    {canSiteRoles && !siteRolesLoading && siteRoles.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        还没有自建的站点角色，可到「角色与权限」页新建。
                      </p>
                    ) : null}
                  </div>
                </>
              )}

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="ghost" asChild>
                  <Link
                    to={
                      detailUser.username
                        ? `/profile/${detailUser.username}`
                        : `/profile?id=${detailUser.userId}`
                    }
                  >
                    打开资料
                  </Link>
                </Button>
                {canSiteSync && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={syncingId === detailUser.userId}
                    >
                      同步 OJ
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        同步「{detailUser.name || detailUser.username}」的 OJ 数据？
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        将从该用户已绑定的各平台重新同步提交与比赛记录，可能需要一些时间。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleSyncOj(detailUser.userId)}
                      >
                        确认同步
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                )}
                {canSiteDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" size="sm" variant="destructive">
                      删除用户
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认彻底删除该用户？</AlertDialogTitle>
                      <AlertDialogDescription>
                        确认删除用户「{detailUser.username}」？将清空其组织关系、粘贴板、OJ
                        绑定、提交与比赛记录，且无法恢复。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          void handleDelete(detailUser.userId)
                          setDetailUser(null)
                        }}
                      >
                        确认删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setDetailUser(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={syncExemptConfirmUser != null}
        onOpenChange={(o) => {
          if (!o) setSyncExemptConfirmUser(null)
        }}
        title={
          syncExemptConfirmUser?.syncExempt
            ? '关闭始终同步？'
            : '开启始终同步？'
        }
        description={
          syncExemptConfirmUser
            ? syncExemptConfirmUser.syncExempt
              ? `关闭后，「${syncExemptConfirmUser.name || syncExemptConfirmUser.username}」若长时间未登录，可能暂停自动同步。`
              : `开启后，「${syncExemptConfirmUser.name || syncExemptConfirmUser.username}」即使长时间未登录也会继续自动同步。`
            : ''
        }
        confirmLabel={syncExemptConfirmUser?.syncExempt ? '关闭' : '开启'}
        loading={
          syncExemptConfirmUser
            ? togglingKey === `${syncExemptConfirmUser.userId}:sync-exempt`
            : false
        }
        onConfirm={() => {
          if (!syncExemptConfirmUser) return
          const target = syncExemptConfirmUser
          setSyncExemptConfirmUser(null)
          void handleToggleSyncExempt(target)
        }}
      />

      <ConfirmDialog
        open={roleToggleTarget != null}
        onOpenChange={(o) => {
          if (!o) setRoleToggleTarget(null)
        }}
        title={
          roleToggleTarget
            ? `${roleToggleTarget.assign ? '添加' : '移除'}站点角色「${roleToggleTarget.name}」？`
            : ''
        }
        description={
          roleToggleTarget && detailUser
            ? (() => {
                const who = detailUser.name || detailUser.username
                const role = roleToggleTarget.name
                if (roleToggleTarget.kind === 'siteAdmin') {
                  return roleToggleTarget.assign
                    ? `确定为「${who}」添加内置角色「${role}」？对方将获得全站管理权限，重新进入后生效。`
                    : `确定移除「${who}」的内置角色「${role}」？对方将无法再使用站点级管理功能，重新进入后生效。`
                }
                return roleToggleTarget.assign
                  ? `确定为「${who}」添加角色「${role}」？对方将获得该角色勾选的权限，重新进入后生效。`
                  : `确定移除「${who}」的角色「${role}」？对方将失去该角色带来的权限，重新进入后生效。`
              })()
            : ''
        }
        confirmLabel={roleToggleTarget?.assign ? '确认添加' : '确认移除'}
        destructive={roleToggleTarget ? !roleToggleTarget.assign : false}
        loading={roleToggling || identitySaving}
        onConfirm={() => {
          const target = roleToggleTarget
          if (!target || !detailUser) return
          if (target.kind === 'siteAdmin') {
            setRoleToggleTarget(null)
            void handleToggleSiteAdminRole(detailUser, target.assign)
            return
          }
          void handleToggleSiteRole()
        }}
      />

      <Dialog open={freezeDialogOpen} onOpenChange={setFreezeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>一键暂停不活跃用户的同步</DialogTitle>
            <DialogDescription>
              暂停最近若干天未登录用户的自动同步（不按组织约定或「始终同步」跳过）。对方登录或你手动恢复后即可继续同步。
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="freeze-inactive-days">
                最近多少天未登录
              </FieldLabel>
              <Input
                id="freeze-inactive-days"
                type="number"
                min={1}
                max={365}
                value={freezeDaysDraft}
                onChange={(e) => setFreezeDaysDraft(e.target.value)}
              />
              <FieldDescription>
                范围 1–365。可先用上方筛选预览名单，再在此一键暂停；也可勾选后点「暂停同步」。
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFreezeDialogOpen(false)}
              disabled={freezingDormant}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={freezingDormant}
              onClick={() => {
                const days = Math.max(
                  1,
                  Math.min(365, Math.floor(Number(freezeDaysDraft) || 14)),
                )
                setFreezeDaysDraft(String(days))
                void handleForceDormant({ inactiveDays: days })
              }}
            >
              {freezingDormant ? '处理中…' : '确认暂停'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
