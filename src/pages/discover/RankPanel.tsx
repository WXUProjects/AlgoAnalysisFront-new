import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrophyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getRank } from '@/api/statistic'
import type { StatisticRankItem } from '@shared/api'
import { Pagination } from '@/components/pagination'
import { useListQueryState } from '@/hooks/use-list-query-state'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const DEFAULT_PAGE_SIZE = 20

function weekRange(): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 6)
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return { start: fmt(start), end: fmt(end) }
}

export function RankPanel() {
  const [scoreType, setScoreType] = useState<'ac' | 'submit'>('ac')
  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    pageKey: 'rpage',
    pageSizeKey: 'rpageSize',
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [list, setList] = useState<StatisticRankItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [range] = useState(() => weekRange())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getRank({
      startDate: range.start,
      endDate: range.end,
      scoreType,
      page,
      pageSize,
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
  }, [scoreType, page, pageSize, range.start, range.end])

  return (
    <Card data-discover-rank-panel="" className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrophyIcon className="size-4 text-muted-foreground" />
          近 7 日排行
        </CardTitle>
        <CardDescription>
          {range.start} ~ {range.end}
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={scoreType}
            onValueChange={(v) => {
              if (v === 'ac' || v === 'submit') {
                setScoreType(v)
                setPage(1)
              }
            }}
          >
            <ToggleGroupItem value="ac">AC</ToggleGroupItem>
            <ToggleGroupItem value="submit">提交</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>用户</TableHead>
                <TableHead className="text-right">
                  {scoreType === 'ac' ? 'AC' : '提交'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell className="font-medium">{r.rank}</TableCell>
                  <TableCell>
                    <Link
                      to={`/profile?id=${r.userId}`}
                      className="hover:underline"
                    >
                      {r.name || `用户${r.userId}`}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.score}
                  </TableCell>
                </TableRow>
              ))}
              {!list.length && (
                <TableRow>
                  <TableCell colSpan={3} className="p-0">
                    <Empty className="border-0 py-10 md:py-12">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <TrophyIcon />
                        </EmptyMedia>
                        <EmptyTitle>暂时还没有排行</EmptyTitle>
                        <EmptyDescription>
                          近 7 日有提交后会出现在这里
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {total > pageSize && (
        <CardFooter className="border-t py-3">
          <Pagination
            page={page}
            total={total}
            pageSize={pageSize}
            onChange={setPage}
            onPageSizeChange={setPageSize}
            disabled={loading}
          />
        </CardFooter>
      )}
    </Card>
  )
}
