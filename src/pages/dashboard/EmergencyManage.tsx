import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  createEmergency,
  deleteEmergency,
  listEmergencies,
  updateEmergency,
} from '@/api/emergency'
import type { EmergencyInfo } from '@shared/api'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { useListQueryState } from '@/hooks/use-list-query-state'
import { RichTextEditor } from '@/components/rich-text-editor'
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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

const DEFAULT_PAGE_SIZE = 10

export function DashboardEmergencyManage() {
  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<EmergencyInfo[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EmergencyInfo | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [sortOrder, setSortOrder] = useState(0)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listEmergencies(page, pageSize)
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '加载紧急通知失败')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
  }, [page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setTitle('')
    setContent('')
    setEnabled(true)
    setSortOrder(0)
    setOpen(true)
  }

  function openEdit(item: EmergencyInfo) {
    setEditing(item)
    setTitle(item.title)
    setContent(item.content)
    setEnabled(item.enabled)
    setSortOrder(item.sortOrder)
    setOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error('标题不能为空')
      return
    }
    setSaving(true)
    const body = {
      title: title.trim(),
      content,
      enabled,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    }
    const res = editing
      ? await updateEmergency({ id: editing.id, ...body })
      : await createEmergency(body)
    setSaving(false)
    if (res.success) {
      toast.success(res.message || '已保存')
      setOpen(false)
      void load()
    } else toast.error(res.message || '保存失败')
  }

  async function handleDelete(id: number) {
    const res = await deleteEmergency(id)
    if (res.success) {
      toast.success(res.message || '已删除')
      void load()
    } else toast.error(res.message || '删除失败')
  }

  return (
    <PageShell className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">紧急通知</h3>
          <p className="text-sm text-muted-foreground">
            全站强制弹窗；用户点「我知道了」后本地不再显示，新发布会再次弹出
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          新建通知
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-base">通知列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">编号</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>顺序</TableHead>
                  <TableHead>作者</TableHead>
                  <TableHead>更新</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      {item.enabled ? (
                        <Badge>生效中</Badge>
                      ) : (
                        <Badge variant="secondary">已关闭</Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.sortOrder}</TableCell>
                    <TableCell>{item.authorName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTime(item.updatedAt || item.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(item)}
                        >
                          编辑
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                            >
                              删除
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>删除紧急通知？</AlertDialogTitle>
                              <AlertDialogDescription>
                                「{item.title}」将被删除。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void handleDelete(item.id)}
                              >
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!list.length && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      暂无紧急通知
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
        pageSize={pageSize}
        onChange={setPage}
        onPageSizeChange={setPageSize}
        disabled={loading}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? '编辑紧急通知' : '新建紧急通知'}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup className="gap-3">
            <Field className="gap-1.5">
              <FieldLabel>标题</FieldLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field className="flex-row items-center justify-between gap-3">
              <FieldLabel>立即生效</FieldLabel>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel>展示顺序（越小越先）</FieldLabel>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel>正文</FieldLabel>
              <RichTextEditor value={content} onChange={setContent} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
