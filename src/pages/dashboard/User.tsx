import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { listGroups } from '@/api/group'
import {
  deleteUser,
  listProfiles,
  moveGroup,
  setEmailEnabled,
  setSiteAdmin,
} from '@/api/profile'
import { updateSpider } from '@/api/spider'
import type { GroupInfo, UserListItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const PAGE_SIZE = 10

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
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<UserListItem[]>([])
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [loading, setLoading] = useState(true)

  const [editUser, setEditUser] = useState<UserListItem | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)

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
    const res = await listProfiles(page, PAGE_SIZE, scope)
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '加载用户失败')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
  }, [page, scope])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (isSite) return
    void listGroups(1, 100).then((r) => {
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
    } else toast.error(res.message || '更新失败')
  }

  async function handleToggleSiteAdmin(u: UserListItem) {
    const next = !u.isSiteAdmin
    const res = await setSiteAdmin(u.userId, next)
    if (res.success) {
      toast.success(next ? '已设为站点管理员' : '已取消站点管理员')
      void load()
    } else toast.error(res.message || '操作失败')
  }

  async function handleDelete(userId: number) {
    if (userId === 2) {
      toast.error('该账号为系统保留账号，无法删除')
      return
    }
    const res = await deleteUser(userId)
    if (res.success) {
      toast.success(res.message || '已移除该用户')
      void load()
    } else toast.error(res.message || '删除失败')
  }

  async function handleSyncOj(userId: number) {
    setSyncingId(userId)
    const res = await updateSpider(userId)
    setSyncingId(null)
    if (res.success) toast.success(res.message || '已开始同步该用户的 OJ 数据')
    else toast.error(res.message || '同步失败')
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
      toast.error(res.message || '设置失败')
    }
  }

  const canToggleEmail = isStaff || isAdmin
  const title = isSite
    ? '站点用户'
    : currentOrg?.name
      ? `${currentOrg.name} · 成员`
      : '组织成员'
  const desc = isSite
    ? '全站用户与所属组织；可查看日报/周报接收情况，站点管理员可开关'
    : '当前组织成员；可查看并在权限允许时开关日报/周报接收'

  return (
    <PageShell className="gap-3">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base">{isSite ? '用户列表' : '成员列表'}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>{isSite ? '昵称' : '组织内名称'}</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>{isSite ? '所属组织' : '分组'}</TableHead>
                  <TableHead className="w-[7.5rem]">日报</TableHead>
                  <TableHead className="w-[7.5rem]">周报</TableHead>
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
                  return (
                    <TableRow key={u.userId}>
                      <TableCell>
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
                      <TableCell>
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
                      <TableCell>
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
                              onClick={() => void handleToggleSiteAdmin(u)}
                            >
                              {u.isSiteAdmin ? '取消站点管理员' : '设为站点管理员'}
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
                            <Link to={`/profile?id=${u.userId}`}>资料</Link>
                          </Button>
                          {isAdmin && (
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
                          {isSite && isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button type="button" size="sm" variant="destructive">
                                  删除
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>彻底删除用户？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确认删除用户「{u.username}」？将清空其组织关系、粘贴板、OJ
                                  绑定、提交与比赛记录，且无法恢复。
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleDelete(u.userId)}
                                  >
                                    确认删除
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
                {!list.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      暂无用户
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onChange={setPage}
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
    </PageShell>
  )
}
