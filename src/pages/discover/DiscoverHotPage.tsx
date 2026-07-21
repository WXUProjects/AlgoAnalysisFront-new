import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlameIcon } from 'lucide-react'
import { toast } from 'sonner'
import { listHotProblems } from '@/api/problem'
import type { HotProblemItem } from '@shared/api'
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
import { formatRelativeTime } from '@/lib/discover-feed'

const PAGE_SIZE = 20
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

/** 发现 · 热题：全屏分页列表 */
export function DiscoverHotPage() {
  const [page, setPage] = useState(1)
  const [list, setList] = useState<HotProblemItem[]>([])
  const [total, setTotal] = useState(0)
  const [days, setDays] = useState(HOT_DAYS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [page])

  return (
    <Card
      data-discover-hot-page=""
      className="mx-auto w-full max-w-lg gap-0 overflow-hidden py-0 shadow-none"
    >
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlameIcon className="size-4 text-muted-foreground" />
          全站热题
        </CardTitle>
        <CardDescription>
          近 {days} 天按提交、做题人数与 AC 综合排序
          {total > 0 ? ` · 共 ${total} 题` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y p-0">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2 px-4 py-3">
                <Skeleton className="mt-0.5 h-3 w-5" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="mb-1 h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          : null}
        {!loading &&
          list.map((item, i) => {
            const p = item.problem
            const rank = (page - 1) * PAGE_SIZE + i + 1
            const rel = formatRelativeTime(item.lastSubmittedAt)
            const meta = [
              platformLabel(p.platform),
              p.difficulty || '',
              item.solverCount > 0 ? `${item.solverCount} 人` : '',
              rel,
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <Link
                key={p.id}
                to={`/question-bank/detail/${p.id}`}
                className="flex items-start gap-2 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <span className="w-6 shrink-0 pt-0.5 tabular-nums text-xs text-muted-foreground">
                  {rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium leading-snug"
                    title={p.title || p.externalId || `题目 ${p.id}`}
                  >
                    {p.title || p.externalId || `题目 ${p.id}`}
                  </p>
                  {meta ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {meta}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="tabular-nums">提交 {item.submitCount}</span>
                    <span className="tabular-nums">AC {item.acCount}</span>
                  </div>
                  {p.tags?.length ? (
                    <div className="scroll-x-touch mt-1 flex min-w-0 flex-nowrap gap-1">
                      {p.tags.slice(0, 4).map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="h-5 max-w-[7rem] shrink-0 truncate px-1.5 text-[10px] font-normal text-muted-foreground"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            )
          })}
        {!loading && !list.length ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            近 {days} 天还没有足够的做题数据
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
