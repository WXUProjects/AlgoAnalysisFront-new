import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  handleBlogReport,
  handleCommunityReport,
  listBlogReports,
  listCommunityReports,
  type ReportStatusFilter,
} from '@/api/reports'
import type { ReportHandleAction } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { useListQueryState } from '@/hooks/use-list-query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatTime } from '@/lib/format'
import { Perm } from '@/lib/permissions'

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const DEFAULT_PAGE_SIZE = 10

/** 举报来源（决定走哪个接口与目标跳转） */
type SourceTab = 'blog' | 'solution' | 'comment'

const SOURCE_TABS: { value: SourceTab; label: string }[] = [
  { value: 'blog', label: '博客' },
  { value: 'solution', label: '题解' },
  { value: 'comment', label: '评论' },
]

const STATUS_OPTIONS: { value: ReportStatusFilter; label: string }[] = [
  { value: 'pending', label: '待处理' },
  { value: 'resolved', label: '已处理' },
  { value: 'dismissed', label: '已驳回' },
  { value: 'all', label: '全部' },
]

/** 三类举报统一成一种行结构，渲染层不再分家 */
type ReportRow = {
  id: number
  createdAt: string
  status: string
  reason: string
  reporterName: string
  /** 目标预览：博客/题解=标题，评论=摘录 */
  targetText: string
  targetAuthor: string
  /** 查看原文链接；目标已删除时为 null */
  targetLink: string | null
}

function statusBadge(status: string) {
  if (status === 'pending')
    return <Badge variant="destructive">待处理</Badge>
  if (status === 'resolved') return <Badge variant="secondary">已处理</Badge>
  if (status === 'dismissed') return <Badge variant="outline">已驳回</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export function DashboardReportsManage() {
  const { can } = useAuth()
  const canHandle = can(Perm.ContentReportHandle)
  const { page, pageSize, setPage, setPageSize, patch, searchParams } =
    useListQueryState({
      defaultPageSize: DEFAULT_PAGE_SIZE,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    })
  const tabParam = searchParams.get('type')
  const tab: SourceTab =
    tabParam === 'solution' || tabParam === 'comment' ? tabParam : 'blog'
  const statusParam = searchParams.get('status')
  const status: ReportStatusFilter =
    statusParam === 'resolved' ||
    statusParam === 'dismissed' ||
    statusParam === 'all'
      ? statusParam
      : 'pending'

  const [rows, setRows] = useState<ReportRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [handling, setHandling] = useState<number | null>(null)
  const requestId = useRef(0)

  const load = useCallback(async () => {
    if (!canHandle) {
      setLoading(false)
      return
    }
    const id = ++requestId.current
    setLoading(true)
    if (tab === 'blog') {
      const res = await listBlogReports({ status, page, pageSize })
      if (id !== requestId.current) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '举报列表加载失败，请稍后重试')
        return
      }
      setTotal(res.data.total)
      setRows(
        res.data.list.map((r) => ({
          id: r.id,
          createdAt: formatTime(r.createdAt),
          status: r.status,
          reason: r.reason,
          reporterName: r.reporter.username,
          targetText: r.target.exists ? r.target.title || '（无标题）' : '',
          targetAuthor: r.target.authorUsername || '',
          targetLink:
            r.target.exists && r.target.authorUsername && r.target.slug
              ? `/blog/${r.target.authorUsername}/${r.target.slug}`
              : null,
        })),
      )
      return
    }
    const res = await listCommunityReports({
      status,
      targetType: tab,
      page,
      pageSize,
    })
    if (id !== requestId.current) return
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '举报列表加载失败，请稍后重试')
      return
    }
    setTotal(res.data.total)
    setRows(
      res.data.list.map((r) => {
        let link: string | null = null
        if (r.target.exists && r.target.problemId) {
          if (r.targetType === 'solution') {
            link = `/question-bank/detail/${r.target.problemId}/solution/${r.targetId}`
          } else if (r.target.solutionId) {
            link = `/question-bank/detail/${r.target.problemId}/solution/${r.target.solutionId}`
          } else {
            link = `/question-bank/detail/${r.target.problemId}?tab=comments`
          }
        }
        return {
          id: r.id,
          createdAt: formatTime(Math.floor(Date.parse(r.createdAt) / 1000)),
          status: r.status,
          reason: r.reason,
          reporterName: r.reporter.username,
          targetText: r.target.exists
            ? (r.targetType === 'solution'
                ? r.target.title
                : r.target.excerpt) || '（无内容）'
            : '',
          targetAuthor: r.target.authorUsername || '',
          targetLink: link,
        }
      }),
    )
  }, [canHandle, tab, status, page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  async function handle(id: number, action: ReportHandleAction) {
    setHandling(id)
    const res =
      tab === 'blog'
        ? await handleBlogReport({ id, action })
        : await handleCommunityReport({ id, action })
    setHandling(null)
    if (!res.success) {
      toast.error(res.message || '操作失败，请稍后重试')
      return
    }
    toast.success(action === 'resolve' ? '已标记为处理完成' : '已驳回该举报')
    void load()
  }

  const emptyText = useMemo(() => {
    const tabLabel = SOURCE_TABS.find((t) => t.value === tab)?.label ?? ''
    if (status === 'pending') return `没有待处理的${tabLabel}举报，太棒了`
    return `没有符合筛选条件的${tabLabel}举报`
  }, [tab, status])

  if (!canHandle) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">
          你还没有处理用户举报的权限。如有需要，请联系站点管理员开通。
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">用户举报</h3>
          <p className="text-sm text-muted-foreground">
            处理大家对博客、题解与评论的举报；违规内容请先前往原文处置，再回来标记处理结果
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={tab}
          onValueChange={(v) =>
            patch({ type: v === 'blog' ? null : v }, { resetPage: true })
          }
        >
          <TabsList>
            {SOURCE_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select
          value={status}
          onValueChange={(v) =>
            patch({ status: v === 'pending' ? null : v }, { resetPage: true })
          }
        >
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {emptyText}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  {statusBadge(r.status)}
                  <span className="text-sm font-medium break-all">
                    {r.reason}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {r.targetLink ? (
                    <>
                      被举报内容：
                      <Link
                        to={r.targetLink}
                        target="_blank"
                        className="text-foreground underline-offset-2 hover:underline break-all"
                      >
                        {r.targetText}
                      </Link>
                      {r.targetAuthor ? `（作者 ${r.targetAuthor}）` : null}
                    </>
                  ) : (
                    <span>被举报内容已删除</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {r.reporterName || '匿名'} 举报于 {r.createdAt}
                  </span>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={handling === r.id}
                        onClick={() => void handle(r.id, 'dismiss')}
                      >
                        驳回
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={handling === r.id}
                        onClick={() => void handle(r.id, 'resolve')}
                      >
                        标记已处理
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        onChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        disabled={loading}
      />
    </PageShell>
  )
}
