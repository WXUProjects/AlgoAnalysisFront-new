import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { listAdminPastes, type AdminPasteItem } from '@/api/paste'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'
import { Perm } from '@/lib/permissions'
import { Link } from 'react-router-dom'

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const DEFAULT_PAGE_SIZE = 20

function languageLabel(lang: string): string {
  if (!lang || lang === 'text') return '文本'
  return lang
}

export function DashboardPasteReview() {
  const { can } = useAuth()
  const canReview =
    can(Perm.ContentCommunityMod) || can(Perm.ContentReportHandle)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [rows, setRows] = useState<AdminPasteItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const load = useCallback(async () => {
    if (!canReview) {
      setLoading(false)
      return
    }
    const id = ++requestId.current
    setLoading(true)
    const res = await listAdminPastes(page, pageSize)
    if (id !== requestId.current) return
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '粘贴内容加载失败，请稍后重试')
      return
    }
    setTotal(res.data.total)
    setRows(res.data.list)
  }, [canReview, page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  if (!canReview) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">
          你还没有查看社区内容的权限。如有需要，请联系站点管理员开通。
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">粘贴板审查</h3>
        <p className="text-sm text-muted-foreground">
          当前有效期内所有用户粘贴内容的事后查看；过期的仍按原逻辑自动删除。
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">全部粘贴内容</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              共 {total} 条有效内容
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void load()}
          >
            刷新
          </Button>
        </CardHeader>
        <CardContent>
          {loading && rows.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              当前没有有效期的粘贴内容
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((p) => (
                <div key={p.id} className="rounded-xl border p-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {p.name || p.username || '用户'}
                    </span>
                    {p.name && p.username && (
                      <span className="text-muted-foreground/70">@{p.username}</span>
                    )}
                    <span>#{p.userId}</span>
                    <span>· {formatTime(p.createdAt)}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      {languageLabel(p.language)}
                    </span>
                    {p.expireAt ? (
                      <span>· {formatTime(p.expireAt)} 过期</span>
                    ) : (
                      <span>· 不过期</span>
                    )}
                    <Link
                      to={`/p/${p.slug}`}
                      className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      公开链接
                    </Link>
                  </div>
                  {p.title && (
                    <p className="mt-1.5 truncate text-sm font-medium" title={p.title}>
                      {p.title}
                    </p>
                  )}
                  <p className="mt-1 whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-muted-foreground">
                    {p.content.slice(0, 400)}
                    {p.content.length > 400 ? '…' : ''}
                  </p>
                </div>
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
        </CardContent>
      </Card>
    </PageShell>
  )
}
