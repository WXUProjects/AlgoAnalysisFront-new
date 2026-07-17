import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlameIcon } from 'lucide-react'
import { toast } from 'sonner'
import { listHotProblems } from '@/api/problem'
import type { HotProblemItem } from '@shared/api'
import { Pagination } from '@/components/pagination'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatRelativeTime } from '@/lib/discover-feed'

const PAGE_SIZE = 20
/** 与侧栏一致：近 2 天综合热度 */
const HOT_DAYS = 2

const PLATFORM_LABEL: Record<string, string> = {
  NowCoder: '牛客',
  AtCoder: 'AtCoder',
  CodeForces: 'Codeforces',
  LuoGu: '洛谷',
  LeetCode: '力扣',
  QOJ: 'QOJ',
}

function platformLabel(p: string): string {
  return PLATFORM_LABEL[p] || p
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 全站热题完整榜（分页），从侧栏「查看全部」打开 */
export function HotAllSheet({ open, onOpenChange }: Props) {
  const [page, setPage] = useState(1)
  const [list, setList] = useState<HotProblemItem[]>([])
  const [total, setTotal] = useState(0)
  const [days, setDays] = useState(HOT_DAYS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setPage(1)
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    void listHotProblems({ page, pageSize: PAGE_SIZE, days: HOT_DAYS }).then(
      (res) => {
        if (cancelled) return
        setLoading(false)
        if (!res.success || !res.data) {
          toast.error(res.message || '热题加载失败，请稍后重试')
          setList([])
          setTotal(0)
          return
        }
        setList(res.data.data)
        setTotal(res.data.total)
        setDays(res.data.days || HOT_DAYS)
      },
    )
    return () => {
      cancelled = true
    }
  }, [open, page])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        data-discover-hot-all-sheet=""
      >
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="flex items-center gap-2 pr-8 text-base">
            <FlameIcon className="size-4 text-muted-foreground" />
            全站热题
          </SheetTitle>
          <SheetDescription>
            近 {days} 天按提交、做题人数与 AC 综合排序
            {total > 0 ? ` · 共 ${total} 题` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>题目</TableHead>
                  <TableHead className="w-16 text-right">人数</TableHead>
                  <TableHead className="w-16 text-right">提交</TableHead>
                  <TableHead className="w-14 text-right">AC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item, i) => {
                  const p = item.problem
                  const rank = (page - 1) * PAGE_SIZE + i + 1
                  const rel = formatRelativeTime(item.lastSubmittedAt)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {rank}
                      </TableCell>
                      <TableCell className="max-w-0">
                        <Link
                          to={`/question-bank/detail/${p.id}`}
                          className="block truncate font-medium hover:underline"
                          onClick={() => onOpenChange(false)}
                          title={p.title || p.externalId || `题目 ${p.id}`}
                        >
                          {p.title || p.externalId || `题目 ${p.id}`}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[
                            platformLabel(p.platform),
                            p.difficulty || '',
                            rel,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        {p.tags?.length ? (
                          <div className="mt-1 flex min-w-0 flex-nowrap gap-1 overflow-hidden">
                            {p.tags.slice(0, 4).map((t) => (
                              <Badge
                                key={t}
                                variant="outline"
                                className="h-5 max-w-[7rem] shrink-0 truncate px-1.5 text-[10px] font-normal text-muted-foreground"
                              >
                                {t}
                              </Badge>
                            ))}
                            {p.tags.length > 4 ? (
                              <span className="shrink-0 text-[10px] leading-5 text-muted-foreground">
                                +{p.tags.length - 4}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.solverCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.submitCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.acCount}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!list.length && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      近 {days} 天还没有足够的做题数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

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
      </SheetContent>
    </Sheet>
  )
}
