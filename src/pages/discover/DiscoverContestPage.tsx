import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { listContestCalendar } from '@/api/contest-calendar'
import type { ContestCalendarItem } from '@shared/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'

/** 发现 · 赛事：近期竞赛全屏列表 */
export function DiscoverContestPage() {
  const [list, setList] = useState<ContestCalendarItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void listContestCalendar({ status: 'upcoming', limit: 30 }).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '赛事加载失败，请稍后重试')
        setList([])
        return
      }
      setList(res.data.list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card
      data-discover-contest-page=""
      className="mx-auto w-full max-w-lg gap-0 overflow-hidden py-0 shadow-none"
    >
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarIcon className="size-4 text-muted-foreground" />
          近期竞赛
        </CardTitle>
        <CardDescription>即将开始的比赛，点进可查看详情或外链</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y p-0">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="mb-1 h-3 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))
          : null}
        {!loading &&
          list.map((c) => (
            <a
              key={c.id}
              href={c.url || undefined}
              target="_blank"
              rel="noreferrer"
              className="block px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <p className="line-clamp-2 text-sm font-medium leading-snug">
                {c.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {c.platformName || c.platform}
                {c.startTime ? ` · ${formatTime(c.startTime)}` : ''}
              </p>
            </a>
          ))}
        {!loading && !list.length ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            近期暂无赛事
          </p>
        ) : null}
      </CardContent>
      <div className="border-t px-4 py-3">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/contest?tab=calendar">打开完整竞赛日历</Link>
        </Button>
      </div>
    </Card>
  )
}
