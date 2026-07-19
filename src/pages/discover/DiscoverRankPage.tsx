import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrophyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getRank } from '@/api/statistic'
import type { StatisticRankItem } from '@shared/api'
import { Pagination } from '@/components/pagination'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { RankPeriod } from './RankAllSheet'
import {
  prepareSharedElement,
  sharedElementStyle,
} from '@/lib/view-transition'

const PAGE_SIZE = 20
const RANK_ALL_START = '2020-01-01'

function fmtYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function rankRange(period: RankPeriod): { start: string; end: string } {
  const end = new Date()
  if (period === 'all') {
    return { start: RANK_ALL_START, end: fmtYmd(end) }
  }
  const start = new Date()
  start.setDate(end.getDate() - 6)
  return { start: fmtYmd(start), end: fmtYmd(end) }
}

/** 发现 · 排行：全屏分页列表 */
export function DiscoverRankPage() {
  const [period, setPeriod] = useState<RankPeriod>('week')
  const [scoreType, setScoreType] = useState<'ac' | 'submit'>('ac')
  const [page, setPage] = useState(1)
  const [list, setList] = useState<StatisticRankItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const range = useMemo(() => rankRange(period), [period])

  useEffect(() => {
    setPage(1)
  }, [period, scoreType])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getRank({
      startDate: range.start,
      endDate: range.end,
      scoreType,
      page,
      pageSize: PAGE_SIZE,
    }).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '排行加载失败，请稍后重试')
        setList([])
        setTotal(0)
        return
      }
      setList(res.data.list)
      setTotal(res.data.total)
    })
    return () => {
      cancelled = true
    }
  }, [range.start, range.end, scoreType, page])

  const periodLabel = period === 'week' ? '本周榜' : '全部时间'

  return (
    <Card
      data-discover-rank-page=""
      className="mx-auto w-full max-w-lg gap-0 overflow-hidden py-0 shadow-none"
    >
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrophyIcon className="size-4 text-muted-foreground" />
          全站热门 · {periodLabel}
        </CardTitle>
        <CardDescription className="flex flex-col gap-2">
          <span>
            {period === 'week'
              ? `${range.start} ~ ${range.end} · 本周过题数`
              : '累计过题数'}
            {total > 0 ? ` · 共 ${total} 人` : ''}
          </span>
          <div className="flex flex-wrap gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={period}
              onValueChange={(v) => {
                if (v === 'week' || v === 'all') setPeriod(v)
              }}
            >
              <ToggleGroupItem value="week" className="px-2 text-xs">
                本周榜
              </ToggleGroupItem>
              <ToggleGroupItem value="all" className="px-2 text-xs">
                全部时间
              </ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={scoreType}
              onValueChange={(v) => {
                if (v === 'ac' || v === 'submit') setScoreType(v)
              }}
            >
              <ToggleGroupItem value="ac" className="px-2 text-xs">
                过题榜
              </ToggleGroupItem>
              <ToggleGroupItem value="submit" className="px-2 text-xs">
                提交
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y p-0">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-3">
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))
          : null}
        {!loading &&
          list.map((r) => (
            <div
              key={r.userId}
              className="flex items-center gap-2 px-4 py-3 text-sm"
            >
              <span className="w-8 tabular-nums text-muted-foreground">
                {r.rank}
              </span>
              <Link
                to={`/profile?id=${r.userId}`}
                className="min-w-0 flex-1 truncate font-medium hover:underline vt-shared"
                style={sharedElementStyle('user', r.userId)}
                onClick={() => prepareSharedElement('user', r.userId)}
              >
                {r.name || `用户${r.userId}`}
              </Link>
              <span className="tabular-nums text-muted-foreground">
                {r.score}
              </span>
            </div>
          ))}
        {!loading && !list.length ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            {period === 'week' ? '本周还没有排行数据' : '暂时还没有排行数据'}
          </p>
        ) : null}
      </CardContent>
      {total > PAGE_SIZE ? (
        <div className="border-t px-4 py-3">
          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            disabled={loading}
          />
        </div>
      ) : null}
    </Card>
  )
}
