import { useCallback, useEffect, useState } from 'react'
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
  setSiteAdmin,
  setSyncExempt,
  setSyncIntervals,
  setUserDisabled,
} from '@/api/profile'
import { updateSpider } from '@/api/spider'
import type { GroupInfo, UserListItem } from '@shared/api'
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
  const { isAdmin, isStaff, currentOrg } = useAuth()
  const isSite = scope === 'site'
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
    setLoading(true)
    const res = await listProfiles(page, pageSize, scope, keyword || undefined, {
      dormantOnly: inactiveDaysParam > 0 ? false : dormantOnly,
      inactiveDays: inactiveDaysParam > 0 ? inactiveDaysParam : undefined,
    })
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '用户列表加载失败，请稍后重试')
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
    void listAllGroups().then((r) => {
      if (r.success && r.data) setGroups(r.data.list)
    })
  }, [isSite, currentOrg?.id])

  if (isSite && !isAdmin) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">仅站点管理员可查看全站用户。</p>
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
    } else toast.error(res.message || '更新失败，请稍后重试')
  }

  async function handleToggleSiteAdmin(u: UserListItem) {
    const next = !u.isSiteAdmin
    const res = await setSiteAdmin(u.userId, next)
    if (res.success) {
      toast.success(next ? '已设为站点管理员' : '已取消站点管理员')
      setList((prev) =>
        prev.map((row) =>
          row.userId === u.userId ? { ...row, isSiteAdmin: next } : row,
        ),
      )
      setDetailUser((cur) =>
        cur && cur.userId === u.userId ? { ...cur, isSiteAdmin: next } : cur,
      )
      void load()
    } else toast.error(res.message || '操作未完成，请稍后重试')
  }

  async function handleToggleSyncExempt(u: UserListItem) {
    if (!isAdmin) return
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
    } else toast.error(res.message || '操作未完成，请稍后重试')
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
    if (!isAdmin) return
    const ids = Array.from(new Set(userIds.filter((id) => id > 0)))
    if (!ids.length) {
      toast.error('请先勾选要解除的用户')
      return
    }
    setClearingDormant(true)
    const res = await clearDormant(ids)
    setClearingDormant(false)
    if (!res.success) {
      toast.error(res.message || '解除失败，请稍后重试')
      return
    }
    const n = res.data?.updated ?? ids.length
    toast.success(res.data?.message || res.message || `已解除 ${n} 人的不活跃状态`)
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
    if (!isAdmin) return
    const ids = Array.from(
      new Set((opts.userIds || []).filter((id) => id > 0)),
    )
    const days = Math.floor(Number(opts.inactiveDays) || 0)
    if (!ids.length && days <= 0) {
      toast.error('请勾选用户，或填写未登录天数')
      return
    }
    setFreezingDormant(true)
    const res = await forceDormant(
      ids.length ? { userIds: ids } : { inactiveDays: days },
    )
    setFreezingDormant(false)
    if (!res.success) {
      toast.error(res.message || '冻结失败，请稍后重试')
      return
    }
    toast.success(
      res.data?.message ||
        res.message ||
        `已冻结 ${res.data?.updated ?? 0} 人`,
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
    if (userId === 2) {
      toast.error('该账号为系统保留，无法删除')
      return
    }
    const res = await deleteUser(userId)
    if (res.success) {
      toast.success(res.message || '已移除该用户')
      void load()
    } else toast.error(res.message || '删除失败，请稍后重试')
  }

  async function handleSetDisabled(u: UserListItem, disabled: boolean) {
    if (!isAdmin) return
    if (u.isSiteAdmin) {
      toast.error('不能禁用站点管理员账号')
      return
    }
    setTogglingDisabled(true)
    const res = await setUserDisabled(u.userId, disabled)
    setTogglingDisabled(false)
    if (!res.success) {
      toast.error(res.message || (disabled ? '禁用失败，请稍后重试' : '启用失败，请稍后重试'))
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
    else toast.error(res.message || '同步失败，请稍后重试')
  }

  function openDetail(u: UserListItem) {
    setDetailUser(u)
    setSpiderIntervalDraft(String(u.spiderIntervalMin ?? 60))
  }

  async function saveSyncIntervals(mode: 'save' | 'clearSpider') {
    if (!detailUser || !isAdmin) return
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
      toast.error(res.message || '同步间隔保存失败，请稍后重试')
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
      toast.error(res.message || '设置失败，请稍后重试')
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
      toast.error(res.message || '设置失败，请稍后重试')
    }
  }

  const canToggleEmail = isStaff || isAdmin
  const title = isSite
    ? '站点用户'
    : currentOrg?.name
      ? `${currentOrg.name} · 成员`
      : '组织成员'
  const desc = isSite
    ? '管理全站用户与所属组织。站管可冻结任意用户（不按组织约定跳过），也可禁用账号使其无法登录。'
    : '当前组织成员。长期未登录会暂停自动同步；组织永不冻结或个人始终同步的成员不受自动暂停影响。'

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
                <SelectItem value="dormant">已冻结</SelectItem>
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
              {isAdmin && isSite && (
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
                  一键冻结不活跃
                </Button>
              )}
              {isAdmin && selectedIds.size > 0 && (
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
                          : `解除不活跃（${selectedIds.size}）`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          解除 {selectedIds.size} 人的不活跃状态？
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          会把这些人的「最近活跃」更新为现在，后台同步会恢复。这只是一次性操作：之后如果长时间不再登录，仍会再次被标记为不活跃。不会设为「始终同步」。
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
                          : `冻结（${selectedIds.size}）`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          冻结 {selectedIds.size} 人的自动同步？
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          将暂停这些人的后台同步，不按组织约定或「始终同步」跳过。对方再次登录或你手动「解除不活跃」后会恢复。
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
                          确认冻结
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
                    ? `没有找到与「${keyword}」相关的已冻结用户`
                    : dormantOnly
                      ? '当前没有已冻结的用户'
                      : keyword
                        ? `没有找到与「${keyword}」相关的用户`
                        : isSite
                          ? '暂无用户'
                          : '暂无成员'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && (
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
                  <TableHead className="w-12 hidden sm:table-cell" />
                  <TableHead>{isSite ? '昵称' : '组织内名称'}</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>{isSite ? '所属组织' : '分组'}</TableHead>
                  <TableHead className="w-[7.5rem] hidden md:table-cell">日报</TableHead>
                  <TableHead className="w-[7.5rem] hidden md:table-cell">周报</TableHead>
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
                      {isAdmin && (
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
                      <TableCell className="hidden sm:table-cell">
                        <Avatar className="size-8">
                          <AvatarImage src={u.avatar || undefined} />
                          <AvatarFallback>
                            {(u.name || u.username || '?').slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{u.name}</span>
                          {u.isSiteAdmin && (
                            <Badge variant="default" className="text-[10px]">
                              站点管理员
                            </Badge>
                          )}
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
                              title="后台已暂停自动同步"
                            >
                              已冻结
                            </Badge>
                          ) : !u.lastLoginAt ? (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                              title="尚未记录最近活跃时间，筛选「最近未登录」时会列出"
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
                      </TableCell>
                      <TableCell>{u.username}</TableCell>
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
                        <div className="flex flex-col gap-1">
                          {canToggleEmail ? (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={dailyOn}
                                disabled={dailyBusy || (!dailyCanOpen && !dailyOn)}
                                onCheckedChange={(v) =>
                                  void handleEmailToggle(u, 'daily', v)
                                }
                                aria-label={`${u.name} 日报`}
                              />
                              <span className="text-xs text-muted-foreground">
                                {dailyOn ? '接收中' : '已关闭'}
                              </span>
                            </div>
                          ) : (
                            <Badge
                              variant={dailyOn ? 'default' : 'secondary'}
                              className="w-fit font-normal"
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
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          {canToggleEmail ? (
                            <div className="flex items-center gap-2">
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
                              <span className="text-xs text-muted-foreground">
                                {weeklyOn ? '接收中' : '已关闭'}
                              </span>
                            </div>
                          ) : (
                            <Badge
                              variant={weeklyOn ? 'default' : 'secondary'}
                              className="w-fit font-normal"
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
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isSite && isAdmin && (
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
                          <Button type="button" size="sm" variant="ghost" asChild>
                            <Link
                              to={
                                u.username
                                  ? `/profile/${u.username}`
                                  : `/profile?id=${u.userId}`
                              }
                            >
                              资料
                            </Link>
                          </Button>
                          {isAdmin && !isSite && (
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              用户详情 · {detailUser?.name || detailUser?.username}
            </DialogTitle>
            <DialogDescription>
              站点级操作与题面自动识别开关。默认仅非公共域组织成员会同步题面与
              AI 标签；可对个人强制开/关。
            </DialogDescription>
          </DialogHeader>
          {detailUser ? (
            <div className="flex flex-col gap-4">
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
                        title="后台已暂停自动同步"
                      >
                        已冻结
                      </Badge>
                    ) : !detailUser.lastLoginAt ? (
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        title="尚未记录最近活跃时间"
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
                      : '暂无记录'}
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
                      : '暂无记录'}
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

              <Separator />

              <FieldGroup className="gap-4">
                {isAdmin && (
                  <Field orientation="horizontal">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <FieldLabel htmlFor="sync-exempt">始终同步</FieldLabel>
                      <FieldDescription>
                        即使长时间未登录，也继续自动同步与后台任务
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
                {isAdmin && (detailUser.dormant || !detailUser.lastLoginAt) && (
                  <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">解除不活跃</p>
                      <p className="text-xs text-muted-foreground">
                        把最近活跃刷新为现在，同步会恢复。只解除这一次，之后长时间未登录仍会再次暂停。
                      </p>
                    </div>
                    <div>
                      <ConfirmDialog
                        title="解除不活跃状态？"
                        description={`确定解除「${detailUser.name || detailUser.username}」的不活跃状态？同步会恢复；之后若长时间未登录仍可能再次暂停。`}
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
                {isAdmin && !detailUser.dormant && (
                  <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">冻结自动同步</p>
                      <p className="text-xs text-muted-foreground">
                        暂停此人的后台同步，不按组织约定或「始终同步」跳过。对方再次登录或你手动解除后会恢复。
                      </p>
                    </div>
                    <div>
                      <ConfirmDialog
                        title="冻结自动同步？"
                        description={`确定冻结「${detailUser.name || detailUser.username}」的自动同步？对方再次登录或你手动解除后会恢复。`}
                        confirmLabel="确认冻结"
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
                          {freezingDormant ? '处理中…' : '立即冻结'}
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </div>
                )}
                {isAdmin && !detailUser.isSiteAdmin && (
                  <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">
                        {detailUser.disabled ? '启用账号' : '禁用账号'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {detailUser.disabled
                          ? '启用后对方可重新登录。若此前被冻结同步，仍可按规则恢复。'
                          : '禁用后对方无法登录，后台同步也会暂停。可随时在此重新启用。'}
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
              </FieldGroup>

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

              <div className="flex flex-wrap gap-2">
                <ConfirmDialog
                  title={
                    detailUser.isSiteAdmin
                      ? '取消站点管理员？'
                      : '设为站点管理员？'
                  }
                  description={
                    detailUser.isSiteAdmin
                      ? `确定取消「${detailUser.name || detailUser.username}」的站点管理员权限？对方将无法再使用站点级管理功能。`
                      : `确定将「${detailUser.name || detailUser.username}」设为站点管理员？对方将获得全站管理权限。`
                  }
                  confirmLabel={
                    detailUser.isSiteAdmin ? '取消权限' : '确认任命'
                  }
                  destructive={detailUser.isSiteAdmin}
                  onConfirm={() => void handleToggleSiteAdmin(detailUser)}
                >
                  <Button type="button" size="sm" variant="outline">
                    {detailUser.isSiteAdmin
                      ? '取消站点管理员'
                      : '设为站点管理员'}
                  </Button>
                </ConfirmDialog>
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
              </div>
            </div>
          ) : null}
          <DialogFooter>
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
              ? `关闭后，「${syncExemptConfirmUser.name || syncExemptConfirmUser.username}」若长时间未登录，后台可能暂停自动同步。`
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

      <Dialog open={freezeDialogOpen} onOpenChange={setFreezeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>一键冻结不活跃用户</DialogTitle>
            <DialogDescription>
              冻结最近若干天未登录的用户，不按组织约定或「始终同步」跳过。冻结后对方登录或你手动解除即可恢复。
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
                范围 1–365。可先用上方筛选预览名单，再在此一键冻结；也可勾选后点「冻结」。
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
              {freezingDormant ? '处理中…' : '确认冻结'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
