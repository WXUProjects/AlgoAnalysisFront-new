import { useEffect, useState } from 'react'
import { ImageOffIcon, ImagesIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteBlogAdminImage,
  deleteBlogAdminImages,
  listBlogAdminImages,
} from '@/api/blog'
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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createBlogAdminImageController } from '@/lib/blog-admin-images'
import type {
  BlogAdminImageListResult,
  BlogAdminImageMode,
} from '@shared/api'

const DEFAULT_PAGE_SIZE = 20

const purposeLabel: Record<string, string> = {
  blog: '博客',
  solution: '题解',
  content: '内容',
  cover: '封面',
}

function formatCreatedAt(value: string | number): string {
  const raw =
    typeof value === 'number' && value < 1_000_000_000_000
      ? value * 1000
      : value
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
}

export function BlogAdminImageManager() {
  const [controller] = useState(() =>
    createBlogAdminImageController({
      list: listBlogAdminImages,
      deleteOne: deleteBlogAdminImage,
      deleteBatch: deleteBlogAdminImages,
    }),
  )
  const [data, setData] = useState<BlogAdminImageListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(0)
  const [batchBusy, setBatchBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function load(
    mode: BlogAdminImageMode,
    page = 1,
    pageSize = data?.pageSize || DEFAULT_PAGE_SIZE,
  ) {
    setLoading(true)
    const outcome = await controller.load(mode, page, pageSize)
    setLoading(false)
    if (outcome.kind === 'loaded') {
      setData(outcome.data)
      return
    }
    toast.error(outcome.kind === 'error' ? outcome.message : '加载图片失败')
  }

  useEffect(() => {
    void load('all', 1, DEFAULT_PAGE_SIZE)
    // controller is stable for the lifetime of this mounted tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller])

  async function removeOne(id: number) {
    setBusyId(id)
    const outcome = await controller.deleteOne(id)
    setBusyId(0)
    if (outcome.kind === 'error') {
      toast.error(outcome.message)
      return
    }
    if (outcome.data) setData(outcome.data)
    if (outcome.kind === 'refreshed') {
      if (outcome.error) toast.error(outcome.message)
      else toast.info(outcome.message)
      return
    }
    if (outcome.kind === 'deleted') toast.success('图片已删除')
  }

  async function removeAll() {
    setBatchBusy(true)
    const outcome = await controller.deleteAll()
    setBatchBusy(false)
    setConfirmOpen(false)
    if (outcome.kind === 'error') {
      toast.error(outcome.message)
      return
    }
    if (outcome.data) setData(outcome.data)
    if (outcome.kind === 'refreshed') {
      if (outcome.error) toast.error(outcome.message)
      else toast.info(outcome.message)
      return
    }
    if (outcome.kind === 'deleted') {
      toast.success(`已删除 ${outcome.deleted} 张图片`)
    }
  }

  const mode = data?.mode || 'all'
  const isCleanup = mode === 'cleanup'
  const candidateCount = data?.candidateIds.length || 0

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">图片管理</CardTitle>
          <CardDescription>
            {isCleanup
              ? `可清理 ${data?.total || 0} 张未被引用且最近上传已满 12 小时的图片。`
              : `共 ${data?.total || 0} 张图片。`}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading || batchBusy || busyId > 0}
            onClick={() => void load(isCleanup ? 'all' : 'cleanup', 1)}
          >
            {isCleanup ? (
              <ImagesIcon data-icon="inline-start" />
            ) : (
              <ImageOffIcon data-icon="inline-start" />
            )}
            {isCleanup ? '查看全部' : '清理图片'}
          </Button>
          {isCleanup && candidateCount > 0 ? (
            <Button
              type="button"
              variant="destructive"
              disabled={loading || batchBusy || busyId > 0}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              删除全部（{candidateCount}）
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : !data?.list.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ImagesIcon />
              </EmptyMedia>
              <EmptyTitle>
                {isCleanup ? '没有可清理的图片' : '还没有图片'}
              </EmptyTitle>
              {isCleanup ? (
                <EmptyDescription>
                  已引用或上传不满 12 小时的图片不会出现在这里。
                </EmptyDescription>
              ) : null}
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>图片</TableHead>
                    <TableHead>上传者</TableHead>
                    <TableHead>用途</TableHead>
                    <TableHead>上传时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.list.map((image) => (
                    <TableRow key={image.id}>
                      <TableCell>
                        <div className="flex min-w-56 items-center gap-3">
                          <a href={image.url} target="_blank" rel="noreferrer">
                            <img
                              src={image.url}
                              alt=""
                              loading="lazy"
                              className="size-12 rounded-md border object-cover"
                            />
                          </a>
                          <span className="max-w-72 truncate text-xs text-muted-foreground">
                            {image.objectKey}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {image.name || image.username || `用户 ${image.userId}`}
                        </div>
                        {image.username ? (
                          <div className="text-xs text-muted-foreground">
                            @{image.username}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {purposeLabel[image.purpose] || image.purpose}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatCreatedAt(image.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={image.referenced ? 'secondary' : 'outline'}
                        >
                          {image.referenced ? '已引用' : '未引用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isCleanup ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={busyId === image.id || batchBusy}
                            onClick={() => void removeOne(image.id)}
                          >
                            {busyId === image.id ? (
                              <Spinner data-icon="inline-start" />
                            ) : (
                              <Trash2Icon data-icon="inline-start" />
                            )}
                            删除
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data.total > 0 ? (
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                disabled={loading || batchBusy || busyId > 0}
                onChange={(page) => void load(mode, page, data.pageSize)}
                onPageSizeChange={(pageSize) => void load(mode, 1, pageSize)}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            ) : null}
          </>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除全部可清理图片？</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除当前筛选出的 {candidateCount}
              张图片。删除前会再次检查引用状态，图片状态变化时会取消本次操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchBusy}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={batchBusy}
              onClick={(event) => {
                event.preventDefault()
                void removeAll()
              }}
            >
              {batchBusy ? '删除中…' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
