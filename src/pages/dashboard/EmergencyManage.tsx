import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from 'react'
import { GripVerticalIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  createEmergency,
  deleteEmergency,
  listEmergencies,
  reorderEmergencies,
  updateEmergency,
} from '@/api/emergency'
import type { EmergencyInfo } from '@shared/api'
import { PageShell } from '@/components/page-shell'
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
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

/** 管理端一次拉全量，便于拖拽排序 */
const LIST_PAGE_SIZE = 100

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) {
    return arr
  }
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function DashboardEmergencyManage() {
  const [list, setList] = useState<EmergencyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EmergencyInfo | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  const dragFrom = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listEmergencies(1, LIST_PAGE_SIZE)
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '紧急通知加载失败，请稍后重试')
      return
    }
    setList(res.data.list)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setTitle('')
    setContent('')
    setEnabled(true)
    setOpen(true)
  }

  function openEdit(item: EmergencyInfo) {
    setEditing(item)
    setTitle(item.title)
    setContent(toMarkdownSource(item.content))
    setEnabled(item.enabled)
    setOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error('请填写标题')
      return
    }
    setSaving(true)
    // 新建默认排到末尾
    const sortOrder = editing
      ? editing.sortOrder
      : list.length > 0
        ? Math.max(...list.map((x) => x.sortOrder)) + 1
        : 0
    const body = {
      title: title.trim(),
      content,
      enabled,
      sortOrder,
    }
    const res = editing
      ? await updateEmergency({ id: editing.id, ...body })
      : await createEmergency(body)
    setSaving(false)
    if (res.success) {
      toast.success(res.message || '已保存')
      setOpen(false)
      void load()
    } else toast.error(res.message || '保存失败，请稍后重试')
  }

  async function handleDelete(id: number) {
    const res = await deleteEmergency(id)
    if (res.success) {
      toast.success(res.message || '已删除')
      void load()
    } else toast.error(res.message || '删除失败，请稍后重试')
  }

  async function commitOrder(next: EmergencyInfo[]) {
    const prev = list
    setList(next)
    setReordering(true)
    const res = await reorderEmergencies(next.map((x) => x.id))
    setReordering(false)
    if (!res.success) {
      setList(prev)
      toast.error(res.message || '排序保存失败，请稍后重试')
      return
    }
    // 同步本地 sortOrder，避免与服务端短暂不一致
    setList(next.map((item, i) => ({ ...item, sortOrder: i })))
  }

  function onDragStart(index: number) {
    dragFrom.current = index
  }

  function onDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    if (dragOver !== index) setDragOver(index)
  }

  function onDragLeave(index: number) {
    if (dragOver === index) setDragOver(null)
  }

  function onDrop(index: number) {
    const from = dragFrom.current
    dragFrom.current = null
    setDragOver(null)
    if (from == null || from === index) return
    const next = moveItem(list, from, index)
    void commitOrder(next)
  }

  function onDragEnd() {
    dragFrom.current = null
    setDragOver(null)
  }

  return (
    <PageShell className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">紧急通知</h3>
          <p className="text-sm text-muted-foreground">
            全站强制弹窗；拖动左侧手柄调整展示顺序。用户点「我知道了」后本地不再显示，新发布会再次弹出
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          新建通知
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-base">
            通知列表
            {reordering && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                正在保存顺序…
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !list.length ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              还没有紧急通知
            </p>
          ) : (
            <ul className="divide-y">
              {list.map((item, index) => (
                <li
                  key={item.id}
                  draggable={!reordering}
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDragLeave={() => onDragLeave(index)}
                  onDrop={() => onDrop(index)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 transition-colors',
                    dragOver === index && 'bg-muted/60',
                    reordering && 'opacity-70',
                  )}
                >
                  <button
                    type="button"
                    className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
                    aria-label={`拖动调整「${item.title}」顺序`}
                    title="拖动调整顺序"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <GripVerticalIcon className="size-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{item.title}</span>
                      {item.enabled ? (
                        <Badge>生效中</Badge>
                      ) : (
                        <Badge variant="secondary">已关闭</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.authorName || '—'} ·{' '}
                      {formatTime(item.updatedAt || item.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
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
                        <Button type="button" size="sm" variant="destructive">
                          删除
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除这条紧急通知？</AlertDialogTitle>
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex! max-h-[92vh] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>
              {editing ? '编辑紧急通知' : '新建紧急通知'}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <FieldGroup className="gap-3">
              <Field className="gap-1.5">
                <FieldLabel>标题</FieldLabel>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field className="flex-row items-center justify-between gap-3">
                <FieldLabel>启用（保存后立即展示）</FieldLabel>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>正文</FieldLabel>
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  previewMode="auto"
                  minHeight={360}
                  placeholder={
                    '用 Markdown 编写通知…\n\n支持 **粗体**、列表、链接与 $公式$'
                  }
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter className="shrink-0 border-t px-5 py-3">
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
