import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { listGroups } from '@/api/group'
import {
  deleteUser,
  listProfiles,
  moveGroup,
  setSiteAdmin,
} from '@/api/profile'
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

  const groupName = useCallback(
    (id: number) => groups.find((g) => g.id === id)?.name || (id ? `分组${id}` : '默认分组'),
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
      toast.error('该账号受保护，无法删除')
      return
    }
    const res = await deleteUser(userId)
    if (res.success) {
      toast.success(res.message || '已移除该用户')
      void load()
    } else toast.error(res.message || '删除失败')
  }

  const title = isSite
    ? '站点用户'
    : currentOrg?.name
      ? `${currentOrg.name} · 成员`
      : '组织成员'
  const desc = isSite
    ? '全站用户与所属组织，可任命站点管理员'
    : '当前组织成员，可调整分组'

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
                  <TableHead>姓名</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>{isSite ? '所属组织' : '分组'}</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((u) => (
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
                        groupName(u.groupId)
                      )}
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
                            {u.isSiteAdmin ? '取消站管' : '设为站管'}
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
                        {isSite && isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button type="button" size="sm" variant="destructive">
                                删除
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>移除用户？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确认移除用户「{u.username}」？移除后该用户将无法继续使用本站。
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
                ))}
                {!list.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
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
