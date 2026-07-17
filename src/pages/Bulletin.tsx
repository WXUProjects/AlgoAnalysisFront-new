import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { listBulletins } from '@/api/bulletin'
import type { BulletinInfo } from '@shared/api'
import { MarkdownDialog } from '@/components/markdown-dialog'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { useListQueryState } from '@/hooks/use-list-query-state'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 10

export function Bulletin() {
  const [searchParams, setSearchParams] = useSearchParams()
  const expandId = Number(searchParams.get('expand') || 0)
  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<BulletinInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<BulletinInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const res = await listBulletins(page, pageSize)
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '公告加载失败，请稍后重试')
        return
      }
      setList(res.data.list)
      setTotal(res.data.total)
    })()
    return () => {
      cancelled = true
    }
  }, [page, pageSize])

  useEffect(() => {
    if (!expandId || !list.length) return
    const hit = list.find((b) => b.id === expandId)
    if (hit) setActive(hit)
  }, [expandId, list])

  function openItem(item: BulletinInfo) {
    setActive(item)
    const next = new URLSearchParams(searchParams)
    next.set('expand', String(item.id))
    setSearchParams(next, { replace: true })
  }

  function handleOpenChange(open: boolean) {
    if (open) return
    setActive(null)
    const next = new URLSearchParams(searchParams)
    next.delete('expand')
    setSearchParams(next, { replace: true })
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
            <CardHeader className="px-4">
              <CardDescription>暂时还没有公告</CardDescription>
            </CardHeader>
          </Card>
        )}
        {list.map((item) => (
          <Card
            key={item.id}
            role="button"
            tabIndex={0}
            className={cn(
              'cursor-pointer gap-2 py-3 transition-all duration-200 ease-out hover:bg-muted/40 hover:shadow-sm',
            )}
            onClick={() => openItem(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openItem(item)
              }
            }}
          >
            <CardHeader className="gap-1 px-4">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{item.title}</CardTitle>
                {item.isPinned && <Badge>置顶</Badge>}
              </div>
              <CardDescription>
                {item.authorName || '匿名'} · {formatTime(item.createdAt)}
                <span className="ml-2 text-muted-foreground/80">点击查看全文</span>
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        onChange={setPage}
        onPageSizeChange={setPageSize}
        disabled={loading}
      />

      <MarkdownDialog
        open={!!active}
        onOpenChange={handleOpenChange}
        title={active?.title}
        description={
          active
            ? `${active.authorName || '匿名'} · ${formatTime(active.createdAt)}`
            : undefined
        }
        content={active?.content || ''}
        mode="auto"
      />
    </PageShell>
  )
}
