import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrophyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getRank } from '@/api/statistic'
import type { StatisticRankItem } from '@shared/api'
import { Pagination } from '@/components/pagination'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

const PAGE_SIZE = 20

export type RankPeriod = 'week' | 'all'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  period: RankPeriod
  range: { start: string; end: string }
}

/** 全站用户排行（分页），从侧栏「查看全部用户」打开；时间范围由侧栏切换 */
export function RankAllSheet({ open, onOpenChange, period, range }: Props) {
  const [scoreType, setScoreType] = useState<'ac' | 'submit'>('ac')
  const [page, setPage] = useState(1)
  const [list, setList] = useState<StatisticRankItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setPage(1)
    setScoreType('ac')
  }, [open])

  useEffect(() => {
    if (!open) return
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
  }, [open, scoreType, page, range.start, range.end])

  const periodLabel = period === 'week' ? '近 7 日' : '全部'
  const emptyHint =
    period === 'week' ? '近 7 日还没有排行数据' : '暂时还没有排行数据'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        data-discover-rank-all-sheet=""
      >
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="flex items-center gap-2 pr-8 text-base">
            <TrophyIcon className="size-4 text-muted-foreground" />
            全站热门 · {periodLabel}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {period === 'week'
                ? `${range.start} ~ ${range.end}`
                : '按累计 AC 题数'}
              {total > 0 ? ` · 共 ${total} 人` : ''}
            </span>
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
              <ToggleGroupItem value="ac" className="px-2 text-xs">
                AC
              </ToggleGroupItem>
              <ToggleGroupItem value="submit" className="px-2 text-xs">
                提交
              </ToggleGroupItem>
            </ToggleGroup>
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead className="text-right">
                    {scoreType === 'ac' ? 'AC' : '提交'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {r.rank}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/profile?id=${r.userId}`}
                        className="hover:underline"
                        onClick={() => onOpenChange(false)}
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
                    <TableCell
                      colSpan={3}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      {emptyHint}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="border-t px-4 py-3">
            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={setPage}
              disabled={loading}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
