import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquarePlusIcon } from 'lucide-react'
import {
  listTickets,
} from '@/api/tickets'
import type { Ticket } from '@shared/api'
import { PageShell } from '@/components/page-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatTime } from '@/lib/format'

export const TICKET_STATUS_LABEL: Record<string, string> = {
  pending_agent: '待处理',
  pending_customer: '待你回复',
  resolved: '已解决',
  closed: '已关闭',
}

export const TICKET_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'ghost'> = {
  pending_agent: 'secondary',
  pending_customer: 'default',
  resolved: 'outline',
  closed: 'ghost',
}

export function TicketStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={TICKET_STATUS_VARIANT[status] || 'outline'}>
      {TICKET_STATUS_LABEL[status] || status}
    </Badge>
  )
}

const STATUS_TABS: { key: string; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'pending_agent', label: '待处理' },
  { key: 'pending_customer', label: '待你回复' },
  { key: 'resolved', label: '已解决' },
  { key: 'closed', label: '已关闭' },
]

export function TicketList() {
  const [list, setList] = useState<Ticket[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const loadSeq = useRef(0)

  const load = useCallback(async (cursor?: string) => {
    const seq = ++loadSeq.current
    const res = await listTickets({
      status: status || undefined,
      limit: 20,
      cursor,
    })
    if (seq !== loadSeq.current) return // 竞态：仅接受最新一次
    if (!res.success) {
      if (cursor) setLoadingMore(false)
      else setLoading(false)
      return
    }
    setNextCursor(res.data?.nextCursor)
    if (cursor) {
      setList((prev) => [...prev, ...(res.data?.list ?? [])])
      setLoadingMore(false)
    } else {
      setList(res.data?.list ?? [])
      setLoading(false)
    }
  }, [status])

  // 状态筛选变化 → 重置列表
  useEffect(() => {
    setList([])
    setNextCursor(undefined)
    setLoading(true)
    void load()
  }, [load])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    await load(nextCursor)
  }

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">工单</h1>
          <Button asChild>
            <Link to="/tickets/create">
              <MessageSquarePlusIcon />
              新建工单
            </Link>
          </Button>
        </div>

        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="flex w-full flex-wrap justify-start">
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">工单列表</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {loading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : list.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                暂无工单，点击右上角「新建工单」开始
              </p>
            ) : (
              list.map((t) => (
                <Link
                  key={t.id}
                  to={`/tickets/${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {t.ticketNumber > 0 && (
                        <span className="text-xs text-muted-foreground">
                          #{t.ticketNumber}
                        </span>
                      )}
                      <span className="truncate font-medium">{t.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      创建于 {formatTime(t.createdAt)}
                      {t.latestMessageAt
                        ? ` · 最后消息 ${formatTime(t.latestMessageAt)}`
                        : ''}
                    </div>
                  </div>
                  <TicketStatusBadge status={t.status} />
                </Link>
              ))
            )}
            {!loading && nextCursor && (
              <Button
                variant="outline"
                className="mt-2"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? '加载中…' : '加载更多'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

export default TicketList
