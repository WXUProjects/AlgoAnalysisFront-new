import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  createGroup,
  deleteGroup,
  getGroup,
  listGroups,
  updateGroup,
} from '@/api/group'
import { getProfileByName, moveGroup } from '@/api/profile'
import type { GroupInfo, UserListItem, UserProfile } from '@shared/api'
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
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
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
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

export function DashboardGroup() {
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<GroupInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create')
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    const res = await listGroups(page, PAGE_SIZE)
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '加载分组失败')
      return
    }
    setGroups(res.data.list)
    setTotal(res.data.total)
    setSelectedId((prev) => {
      if (prev !== null) return prev
      return res.data!.list[0]?.id ?? null
    })
  }, [page])

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true)
    const res = await getGroup(id)
    setDetailLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '加载成员失败')
      setDetail(null)
      return
    }
    setDetail(res.data)
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (selectedId !== null) void loadDetail(selectedId)
  }, [selectedId, loadDetail])

  useEffect(() => {
    if (!search.trim()) {
      setCandidates([])
      return
    }
    const t = window.setTimeout(async () => {
      setSearching(true)
      const res = await getProfileByName(search.trim())
      setSearching(false)
      if (res.success) setCandidates(res.data || [])
    }, 350)
    return () => window.clearTimeout(t)
  }, [search])

  function openCreate() {
    setEditMode('create')
    setFormName('')
    setFormDesc('')
    setEditOpen(true)
  }

  function openEdit(g: GroupInfo) {
    setEditMode('edit')
    setFormName(g.name)
    setFormDesc(g.describe)
    setSelectedId(g.id)
    setEditOpen(true)
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('分组名称不能为空')
      return
    }
    setSaving(true)
    const res =
      editMode === 'create'
        ? await createGroup({ name: formName.trim(), describe: formDesc.trim() })
        : await updateGroup({
            id: selectedId!,
            name: formName.trim(),
            describe: formDesc.trim(),
          })
    setSaving(false)
    if (res.success) {
      toast.success(res.message || '已保存')
      setEditOpen(false)
      void loadList()
      if (selectedId !== null) void loadDetail(selectedId)
    } else toast.error(res.message || '保存失败')
  }

  async function handleDelete(id: number) {
    const res = await deleteGroup(id)
    if (res.success) {
      toast.success(res.message || '已删除')
      if (selectedId === id) setSelectedId(null)
      void loadList()
    } else toast.error(res.message || '删除失败')
  }

  async function handleAdd(userId: number) {
    if (selectedId === null) return
    const res = await moveGroup({ userId, groupId: selectedId })
    if (res.success) {
      toast.success('已加入分组')
      setSearch('')
      void loadDetail(selectedId)
    } else toast.error(res.message || '添加失败')
  }

  async function handleRemove(userId: number) {
    const res = await moveGroup({ userId, groupId: 0 })
    if (res.success) {
      toast.success('已移出')
      if (selectedId !== null) void loadDetail(selectedId)
    } else toast.error(res.message || '移出失败')
  }

  const members: UserListItem[] = detail?.users || []

  return (
    <PageShell className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="gap-2 py-3">
        <CardHeader className="flex flex-row items-center justify-between px-3 space-y-0">
          <CardTitle className="text-base">分组</CardTitle>
          <Button type="button" size="sm" onClick={openCreate}>
            创建
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 px-2">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))
            : groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedId(g.id)}
                  className={cn(
                    'flex flex-col rounded-md px-3 py-2 text-left text-sm hover:bg-muted',
                    selectedId === g.id && 'bg-muted font-medium',
                  )}
                >
                  <span>{g.name}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {g.describe || '无描述'}
                  </span>
                </button>
              ))}
          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            disabled={loading}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Card className="gap-2 py-3">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-4 space-y-0">
            <div>
              <CardTitle className="text-base">
                {detail?.name || '选择分组'}
              </CardTitle>
              <CardDescription>{detail?.describe}</CardDescription>
            </div>
            {selectedId !== null && selectedId !== 0 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => detail && openEdit(detail)}
                >
                  编辑
                </Button>
                {detail?.name !== '默认分组' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" size="sm" variant="destructive">
                        删除
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>删除该分组？</AlertDialogTitle>
                        <AlertDialogDescription>
                          成员将移至「默认分组」。默认分组不可删除。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleDelete(selectedId)}>
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </CardHeader>
        </Card>

        {selectedId !== null && selectedId !== 0 && (
          <Card className="gap-2 py-3">
            <CardHeader className="px-4">
              <CardTitle className="text-sm font-medium">添加成员</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 px-4">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="按姓名搜索"
              />
              {searching && (
                <p className="text-xs text-muted-foreground">搜索中…</p>
              )}
              {candidates.map((c) => (
                <div
                  key={c.userId}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    {c.name} @{c.username}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleAdd(c.userId)}
                  >
                    加入
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="gap-0 py-0 overflow-hidden">
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-base">成员</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {detailLoading ? (
              <div className="p-4">
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>最后提交</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell>{m.userId}</TableCell>
                      <TableCell>{m.name || m.username}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.lastSubmit ? formatTime(m.lastSubmit) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" variant="ghost" asChild>
                            <Link to={`/profile?id=${m.userId}`}>资料</Link>
                          </Button>
                          {selectedId !== 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleRemove(m.userId)}
                            >
                              移出
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!members.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        暂无成员
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode === 'create' ? '创建分组' : '编辑分组'}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-3">
            <Field className="gap-1.5">
              <FieldLabel>名称</FieldLabel>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel>描述</FieldLabel>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
