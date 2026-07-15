import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { listBulletins } from '@/api/bulletin'
import type { BulletinInfo } from '@shared/api'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'
import { sanitizeHtml } from '@/lib/markdown'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

export function Bulletin() {
  const [searchParams] = useSearchParams()
  const expandId = Number(searchParams.get('expand') || 0)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<BulletinInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [openIds, setOpenIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const res = await listBulletins(page, PAGE_SIZE)
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '加载公告失败')
        return
      }
      setList(res.data.list)
      setTotal(res.data.total)
    })()
    return () => {
      cancelled = true
    }
  }, [page])

  useEffect(() => {
    if (expandId) {
      setOpenIds((prev) => new Set(prev).add(expandId))
    }
  }, [expandId, list])

  function toggle(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-3">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        {!loading && !list.length && (
          <Card className="py-4">
            <CardContent className="px-4 text-sm text-muted-foreground">
              暂无公告
            </CardContent>
          </Card>
        )}
        {list.map((item) => {
          const open = openIds.has(item.id)
          return (
            <Card
              key={item.id}
              className={cn(
                'gap-2 py-3 cursor-pointer transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-sm',
              )}
              onClick={() => toggle(item.id)}
            >
              <CardHeader className="gap-1 px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  {item.isPinned && <Badge>置顶</Badge>}
                </div>
                <CardDescription>
                  {item.authorName || '匿名'} · {formatTime(item.createdAt)}
                </CardDescription>
              </CardHeader>
              {open && (
                <CardContent
                  className="prose prose-sm dark:prose-invert max-w-none px-4 text-sm"
                  onClick={(e) => e.stopPropagation()}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }}
                />
              )}
            </Card>
          )
        })}
      </div>
      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        disabled={loading}
      />
    </PageShell>
  )
}
