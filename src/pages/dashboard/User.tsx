import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { listGroups } from '@/api/group'
import {
  deleteUser,
  getProfileById,
  listProfiles,
  moveGroup,
} from '@/api/profile'
import { listRoles, setUserRole } from '@/api/role'
import type { GroupInfo, RoleInfo, UserListItem } from '@shared/api'
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
import { formatTime } from '@/lib/format'

const PAGE_SIZE = 10

export function DashboardUser() {
  const { isAdmin, isCoach } = useAuth()
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<UserListItem[]>([])
  const [roles, setRoles] = useState<RoleInfo[]>([])
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [loading, setLoading] = useState(true)

  const [editUser, setEditUser] = useState<UserListItem | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const groupName = useCallback(
    (id: number) => groups.find((g) => g.id === id)?.name || `组${id}`,
    [groups],
  )
  const roleName = useCallback(
    (id?: number) => roles.find((r) => r.roleId === id)?.name || `角色${id ?? '-'}`,
    [roles],
  )

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listProfiles(page, PAGE_SIZE)
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '加载用户失败')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void listRoles().then((r) => {
      if (r.success && r.data) setRoles(r.data)
    })
    void listGroups(1, 100).then((r) => {
      if (r.success && r.data) setGroups(r.data.list)
    })
  }, [])

  async function openEdit(u: UserListItem) {
    setEditUser(u)
    if (isAdmin) {
      const full = await getProfileById(u.userId)
      setEditValue(String(full.data?.roleId ?? u.roleId ?? 0))
    } else {
      setEditValue(String(u.groupId))
    }
  }

  async function handleSaveEdit() {
    if (!editUser) return
    setSaving(true)
    let res
    if (isAdmin) {
      res = await setUserRole({
        userId: editUser.userId,
        roleId: Number(editValue),
      })
    } else {
      res = await moveGroup({
        userId: editUser.userId,
        groupId: Number(editValue),
      })
    }
    setSaving(false)
    if (res.success) {
      toast.success(res.message || '已更新')
      setEditUser(null)
      void load()
    } else toast.error(res.message || '更新失败')
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

  return (
    <PageShell className="gap-3">
      <div>
        <h3 className="font-semibold">{isAdmin ? '用户管理' : '队员管理'}</h3>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? '调整角色或移除用户' : '调整队员所在分组'}
        </p>
      </div>

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base">用户列表</CardTitle>
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
                  <TableHead>{isAdmin ? '角色' : '分组'}</TableHead>
                  <TableHead>最后提交</TableHead>
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
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>
                      {isAdmin ? roleName(u.roleId) : groupName(u.groupId)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.lastSubmit ? formatTime(u.lastSubmit) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {(isAdmin || isCoach) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void openEdit(u)}
                          >
                            {isAdmin ? '调整角色' : '调整分组'}
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="ghost" asChild>
                          <Link to={`/profile?id=${u.userId}`}>资料</Link>
                        </Button>
                        {isAdmin && (
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
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
            <DialogTitle>
              {isAdmin ? '修改角色' : '修改分组'} · {editUser?.name}
            </DialogTitle>
          </DialogHeader>
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {isAdmin
                ? roles.map((r) => (
                    <SelectItem key={r.roleId} value={String(r.roleId)}>
                      {r.name}
                    </SelectItem>
                  ))
                : groups.map((g) => (
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
            <Button type="button" disabled={saving} onClick={() => void handleSaveEdit()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
