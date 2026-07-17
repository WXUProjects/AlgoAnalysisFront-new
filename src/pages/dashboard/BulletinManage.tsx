import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  createBulletin,
  deleteBulletin,
  listBulletins,
  updateBulletin,
} from '@/api/bulletin'
import type { BulletinInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { useListQueryState } from '@/hooks/use-list-query-state'
import { MarkdownEditor } from '@/components/markdown-editor'
import { toMarkdownSource } from '@/lib/markdown'
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

type ManageScope = 'org' | 'site'

/**
 * 公告管理
 * - scope=org：组织后台，仅本组织公告（组织管理员/教练）
 * - scope=site：站点后台，仅站点公告（站点管理员）
 */
export function DashboardBulletinManage({
  scope = 'org',
}: {
  scope?: ManageScope
}) {
  const { isAdmin } = useAuth()
  const isSite = scope === 'site'
  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<BulletinInfo[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BulletinInfo | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    // 站点公告管理仅站管；组织管理员不应请求/看到
    if (isSite && !isAdmin) {
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await listBulletins(page, pageSize, scope)
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '公告加载失败，请稍后重试')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
  }, [page, pageSize, scope, isSite, isAdmin])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setTitle('')
    setContent('')
    setPinned(false)
    setOpen(true)
  }

  function openEdit(item: BulletinInfo) {
    setEditing(item)
    setTitle(item.title)
    setContent(toMarkdownSource(item.content))
    setPinned(item.isPinned)
    setOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error('请填写标题')
      return
    }
    setSaving(true)
    const res = editing
      ? await updateBulletin({
          id: editing.id,
          title: title.trim(),
          content,
          isPinned: pinned,
        })
      : await createBulletin({
          title: title.trim(),
          content,
          isPinned: pinned,
          scope,
        })
    setSaving(false)
    if (res.success) {
      toast.success(res.message || '已保存')
      setOpen(false)
      void load()
    } else toast.error(res.message || '保存失败，请稍后重试')
  }

  async function handleDelete(id: number) {
    const res = await deleteBulletin(id)
    if (res.success) {
      toast.success(res.message || '已删除')
      void load()
    } else toast.error(res.message || '删除失败，请稍后重试')
  }

  // 站点公告仅站点管理员可进管理页（组织管理员不可见）
  if (isSite && !isAdmin) {
    return <Navigate to="/admin/bulletin" replace />
  }

  const pageTitle = isSite ? '站点公告' : '组织公告'
  const pageDesc = isSite
    ? '发给全站所有人；会在公告列表最上方显示，并标注「站点公告」'
    : '仅当前组织成员可见；与站点公告分开管理'
  const emptyText = isSite ? '还没有站点公告' : '还没有组织公告'
  const createLabel = isSite ? '新建站点公告' : '新建组织公告'

  return (
    <PageShell className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{pageTitle}</h3>
          <p className="text-sm text-muted-foreground">{pageDesc}</p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          {createLabel}
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-base">公告列表</CardTitle>
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
                  <TableHead>作者</TableHead>
                  <TableHead>置顶</TableHead>
                  <TableHead>更新</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.id}</TableCell>
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell>{b.authorName}</TableCell>
                    <TableCell>
                      {b.isPinned ? <Badge>置顶</Badge> : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTime(b.updatedAt || b.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(b)}
                        >
                          编辑
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" size="sm" variant="destructive">
                              删除
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除这条公告？</AlertDialogTitle>
                              <AlertDialogDescription>
                                「{b.title}」将被删除。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => void handleDelete(b.id)}>
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {emptyText}
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
        <DialogContent className="flex! max-h-[92vh] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>
              {editing
                ? isSite
                  ? '编辑站点公告'
                  : '编辑组织公告'
                : isSite
                  ? '新建站点公告'
                  : '新建组织公告'}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel>标题</FieldLabel>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field className="flex-row items-center justify-between gap-3">
                <FieldLabel>置顶</FieldLabel>
                <Switch checked={pinned} onCheckedChange={setPinned} />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>正文</FieldLabel>
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  previewMode="auto"
                  minHeight={360}
                  placeholder={
                    '用 Markdown 编写公告…\n\n支持 **粗体**、列表、代码与链接'
                  }
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter className="shrink-0 border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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

/** 组织后台：仅本组织公告 */
export function DashboardOrgBulletinManage() {
  return <DashboardBulletinManage scope="org" />
}

/** 站点后台：仅站点公告（仅站管） */
export function DashboardSiteBulletinManage() {
  return <DashboardBulletinManage scope="site" />
}
