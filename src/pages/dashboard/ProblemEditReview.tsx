import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  listProblemEditRequests,
  reviewProblemEdit,
} from '@/api/problem'
import type { ProblemEditInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { MarkdownBody } from '@/components/markdown-body'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { useListQueryState } from '@/hooks/use-list-query-state'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
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

const DEFAULT_PAGE_SIZE = 15

function statusLabel(s: string) {
  if (s === 'pending') return '待审核'
  if (s === 'approved') return '已通过'
  if (s === 'rejected') return '已驳回'
  return s || '-'
}

function statusVariant(s: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (s === 'pending') return 'default'
  if (s === 'approved') return 'secondary'
  if (s === 'rejected') return 'destructive'
  return 'outline'
}

export function DashboardProblemEditReview() {
  const { isSiteAdmin, ready } = useAuth()
  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [status, setStatus] = useState('pending')
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<ProblemEditInfo[]>([])
  const [loading, setLoading] = useState(true)

  const [detail, setDetail] = useState<ProblemEditInfo | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listProblemEditRequests({
      page,
      pageSize,
      status: status === 'all' ? undefined : status,
    })
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '审核列表加载失败，请稍后重试')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
  }, [page, pageSize, status])

  useEffect(() => {
    if (!ready || !isSiteAdmin) return
    void load()
  }, [load, ready, isSiteAdmin])

  async function handleReview(approve: boolean) {
    if (!detail) return
    setActing(true)
    const res = await reviewProblemEdit({
      id: detail.id,
      approve,
      reviewNote: reviewNote.trim() || undefined,
    })
    setActing(false)
    if (!res.success) {
      toast.error(res.message || '操作未完成，请稍后重试')
      return
    }
    toast.success(res.message || (approve ? '已通过' : '已驳回'))
    setDetail(null)
    setReviewNote('')
    void load()
  }

  if (ready && !isSiteAdmin) {
    return <Navigate to="/admin/statistics" replace />
  }

  return (
    <PageShell>
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">题库审查</CardTitle>
          <CardDescription>
            审核用户提交的标签与题面修改。通过后立即生效；已有标签的题目将不再自动分析。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 px-4">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="rejected">已驳回</SelectItem>
              <SelectItem value="all">全部</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
            刷新
          </Button>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>题目</TableHead>
                  <TableHead>提交人</TableHead>
                  <TableHead>改动</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <Link
                          to={`/question-bank/detail/${item.problemId}`}
                          className="truncate font-medium hover:underline"
                        >
                          {item.problemTitle || item.externalId || `#${item.problemId}`}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {item.platform} · {item.externalId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.userId ? (
                        <Link
                          to={`/profile?id=${item.userId}`}
                          className="hover:underline"
                        >
                          {item.userName || `用户${item.userId}`}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.hasTags && <Badge variant="outline">标签</Badge>}
                        {item.hasContent && <Badge variant="outline">题面</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>
                        {statusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTime(item.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDetail(item)
                          setReviewNote('')
                        }}
                      >
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!list.length && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      暂无待审申请
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {total > pageSize && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(o) => {
          if (!o) setDetail(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  审核 · {detail.problemTitle || detail.externalId}
                </DialogTitle>
                <DialogDescription>
                  {detail.platform} · {detail.externalId} · 提交人{' '}
                  {detail.userName || `用户${detail.userId}`}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 text-sm">
                {detail.note && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">提交说明</p>
                    <p className="mt-1">{detail.note}</p>
                  </div>
                )}

                {detail.hasTags && (
                  <div className="flex flex-col gap-2">
                    <p className="font-medium">标签</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <p className="mb-1 text-xs text-muted-foreground">当前</p>
                        <div className="flex flex-wrap gap-1">
                          {detail.currentTags.length
                            ? detail.currentTags.map((t) => (
                                <Badge key={t} variant="outline">
                                  {t}
                                </Badge>
                              ))
                            : (
                              <span className="text-muted-foreground">无</span>
                            )}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="mb-1 text-xs text-muted-foreground">建议</p>
                        <div className="flex flex-wrap gap-1">
                          {detail.proposedTags.length
                            ? detail.proposedTags.map((t) => (
                                <Badge key={t} variant="secondary">
                                  {t}
                                </Badge>
                              ))
                            : (
                              <span className="text-muted-foreground">清空标签</span>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {detail.hasContent && (
                  <div className="flex flex-col gap-2">
                    <p className="font-medium">题面</p>
                    {detail.proposedTitle && (
                      <p className="text-xs text-muted-foreground">
                        建议标题：{detail.proposedTitle}
                      </p>
                    )}
                    <div className="max-h-64 overflow-y-auto rounded-lg border p-3">
                      <MarkdownBody
                        content={detail.proposedContentMd || ''}
                        mode="auto"
                        emptyText="（空）"
                      />
                    </div>
                  </div>
                )}

                {detail.status === 'pending' && (
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="review-note">审核备注（可选）</FieldLabel>
                      <Textarea
                        id="review-note"
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        rows={2}
                        placeholder="通过或驳回时的备注（可选）"
                      />
                    </Field>
                  </FieldGroup>
                )}

                {detail.status !== 'pending' && detail.reviewNote && (
                  <p className="text-xs text-muted-foreground">
                    审核备注：{detail.reviewNote}
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link to={`/question-bank/detail/${detail.problemId}`}>
                    打开题目
                  </Link>
                </Button>
                {detail.status === 'pending' ? (
                  <>
                    <ConfirmDialog
                      title="驳回这次修改？"
                      description="驳回后不会改动题面，提交者会看到未通过的结果。"
                      confirmLabel="驳回"
                      destructive
                      loading={acting}
                      onConfirm={() => void handleReview(false)}
                    >
                      <Button type="button" variant="outline" disabled={acting}>
                        驳回
                      </Button>
                    </ConfirmDialog>
                    <ConfirmDialog
                      title="通过并应用修改？"
                      description="通过后会用本次内容覆盖题目信息，请确认已仔细核对。"
                      confirmLabel="通过并应用"
                      loading={acting}
                      onConfirm={() => void handleReview(true)}
                    >
                      <Button type="button" disabled={acting}>
                        通过并应用
                      </Button>
                    </ConfirmDialog>
                  </>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setDetail(null)}>
                    关闭
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
