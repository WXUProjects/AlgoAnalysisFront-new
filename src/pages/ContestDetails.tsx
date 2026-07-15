import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getContestRanking } from '@/api/contest'
import { listGroups } from '@/api/group'
import type { ContestItem, ContestRankingItem, GroupInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

export function ContestDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLogin } = useAuth()
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<ContestRankingItem[]>([])
  const [contest, setContest] = useState<Partial<ContestItem> | null>(null)
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [groupId, setGroupId] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      navigate(-1)
      return
    }
  }, [id, navigate])

  useEffect(() => {
    if (!isLogin) return
    void listGroups(1, 50).then((res) => {
      if (res.success && res.data) setGroups(res.data.list)
    })
  }, [isLogin])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getContestRanking({
      contestId: id,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      groupId,
    })
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '加载榜单失败')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
    if (res.data.contest) setContest(res.data.contest)
  }, [id, page, groupId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [groupId, id])

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {contest?.platform && (
              <Badge variant="secondary">{contest.platform}</Badge>
            )}
            <h2 className="text-lg font-semibold">
              {contest?.contestName || `比赛 #${id}`}
            </h2>
          </div>
          {contest?.time && (
            <p className="text-sm text-muted-foreground">{formatTime(contest.time)}</p>
          )}
        </div>
        <div className="flex gap-2">
          {contest?.contestUrl && (
            <Button type="button" size="sm" variant="outline" asChild>
              <a href={contest.contestUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon data-icon="inline-start" />
                打开 OJ
              </a>
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to="/contest">返回列表</Link>
          </Button>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={groupId === undefined ? 'default' : 'outline'}
            onClick={() => setGroupId(undefined)}
          >
            全部
          </Button>
          {groups.map((g) => (
            <Button
              key={g.id}
              type="button"
              size="sm"
              variant={groupId === g.id ? 'default' : 'outline'}
              onClick={() => setGroupId(g.id)}
            >
              {g.name}
            </Button>
          ))}
        </div>
      )}

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base">站内榜</CardTitle>
          <CardDescription>点击名称查看资料</CardDescription>
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
                  <TableHead>选手</TableHead>
                  <TableHead className="text-right">AC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={`${row.userId}-${row.rank}`}>
                    <TableCell className="font-medium">{row.rank}</TableCell>
                    <TableCell>
                      <Link
                        to={`/profile?id=${row.userId}`}
                        className={cn(
                          'inline-flex items-center gap-2 hover:underline',
                        )}
                      >
                        <Avatar className="size-7">
                          <AvatarImage src={row.avatar || undefined} />
                          <AvatarFallback>
                            {(row.name || '?').slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        {row.name || `用户${row.userId}`}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.acCount || row.score}
                    </TableCell>
                  </TableRow>
                ))}
                {!list.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      暂无榜单
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
