import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getProblem, getProblemSubmissions } from '@/api/problem'
import type { ProblemInfo } from '@shared/api'
import { PageShell } from '@/components/page-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
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
import { renderMarkdown } from '@/lib/markdown'
import { num, str } from '@/lib/http'
import { cn } from '@/lib/utils'

export function QuestionBankDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [problem, setProblem] = useState<ProblemInfo | null>(null)
  const [subs, setSubs] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const [pRes, sRes] = await Promise.all([
        getProblem(id!),
        getProblemSubmissions({ problemId: id!, page: 1, pageSize: 50 }),
      ])
      if (cancelled) return
      setLoading(false)
      if (!pRes.success || !pRes.data) {
        toast.error(pRes.message || '加载题目失败')
        return
      }
      setProblem(pRes.data)
      if (sRes.success) setSubs(sRes.data || [])
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const html = useMemo(
    () => (problem?.contentMd ? renderMarkdown(problem.contentMd) : ''),
    [problem?.contentMd],
  )

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    )
  }

  if (!problem) {
    return (
      <PageShell>
        <Card className="py-4">
          <CardContent className="px-4 text-sm text-muted-foreground">
            题目不存在
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-lg font-semibold">{problem.title}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{problem.platform}</Badge>
            <Badge variant="outline">{problem.externalId}</Badge>
            {problem.difficulty && (
              <Badge
                className={cn(
                  problem.difficulty === '困难' && 'bg-destructive text-white',
                )}
                variant={problem.difficulty === '困难' ? 'default' : 'outline'}
              >
                {problem.difficulty}
              </Badge>
            )}
            {problem.problemType && (
              <Badge variant="outline">{problem.problemType}</Badge>
            )}
            {problem.userStatus && (
              <StatusBadge status={problem.userStatus} userStatus />
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {problem.tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {problem.url && (
            <Button type="button" size="sm" variant="outline" asChild>
              <a href={problem.url} target="_blank" rel="noreferrer">
                <ExternalLinkIcon data-icon="inline-start" />
                原题
              </a>
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (window.history.length > 1) navigate(-1)
              else navigate('/question-bank')
            }}
          >
            返回
          </Button>
        </div>
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">题面</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {html ? (
            <div
              className="markdown-body content-md"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">题面准备中，请稍后刷新</p>
          )}
        </CardContent>
      </Card>

      {problem.solutions.length > 0 && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">推荐解法</CardTitle>
            <CardDescription>AI 生成，仅供参考</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 px-4 sm:grid-cols-2">
            {problem.solutions.map((s, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{s.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  时间 {s.timeComplexity || '-'} · 空间 {s.spaceComplexity || '-'}
                </p>
                <p className="mt-2 text-muted-foreground">{s.briefExplanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-base">提交历史</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>语言</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((s, i) => {
                const uid = num(s.userId)
                const name = str(
                  s.userName || s.name || s.username || (uid ? `用户${uid}` : '-'),
                )
                return (
                  <TableRow key={i}>
                    <TableCell>
                      {uid ? (
                        <Link to={`/profile?id=${uid}`} className="hover:underline">
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </TableCell>
                    <TableCell>{str(s.lang, '-')}</TableCell>
                    <TableCell>
                      <StatusBadge status={str(s.status)} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatTime(s.time || s.submittedAt || s.createdAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
              {!subs.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    暂无提交
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  )
}
