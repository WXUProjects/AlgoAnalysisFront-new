import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpenIcon,
  CheckIcon,
  EyeIcon,
  HeartIcon,
  MessageCircleIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getBlogAdminOverview,
  listBlogAdminArticles,
  listBlogAdminAuthors,
  moderateBlogArticle,
} from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatTime } from '@/lib/format'
import type {
  BlogAdminArticle,
  BlogAdminAuthor,
  BlogAdminOverview,
} from '@shared/api'

const statusLabel: Record<string, string> = {
  approved: '已通过',
  pending: '待审核',
  rejected: '已驳回',
}

const visibilityLabel: Record<string, string> = {
  public: '公开',
  private: '不公开',
  password: '加密',
}

export function DashboardBlogAdmin() {
  const { isAdmin, ready } = useAuth()
  const [overview, setOverview] = useState<BlogAdminOverview | null>(null)
  const [authors, setAuthors] = useState<BlogAdminAuthor[]>([])
  const [authorTotal, setAuthorTotal] = useState(0)
  const [articles, setArticles] = useState<BlogAdminArticle[]>([])
  const [articleTotal, setArticleTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [authorKw, setAuthorKw] = useState('')
  const [articleKw, setArticleKw] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [busyId, setBusyId] = useState(0)

  const loadOverview = useCallback(async () => {
    const res = await getBlogAdminOverview()
    if (res.success && res.data) setOverview(res.data)
  }, [])

  const loadAuthors = useCallback(async (kw?: string) => {
    const res = await listBlogAdminAuthors({
      page: 1,
      pageSize: 30,
      keyword: kw || undefined,
    })
    if (res.success && res.data) {
      setAuthors(res.data.list)
      setAuthorTotal(res.data.total)
    } else {
      toast.error(res.message || '作者列表加载失败')
    }
  }, [])

  const loadArticles = useCallback(async (kw?: string, st?: string) => {
    const res = await listBlogAdminArticles({
      page: 1,
      pageSize: 30,
      keyword: kw || undefined,
      status: st && st !== 'all' ? st : undefined,
    })
    if (res.success && res.data) {
      setArticles(res.data.list)
      setArticleTotal(res.data.total)
    } else {
      toast.error(res.message || '文章列表加载失败')
    }
  }, [])

  useEffect(() => {
    if (!ready || !isAdmin) return
    setLoading(true)
    void Promise.all([
      loadOverview(),
      loadAuthors(),
      loadArticles(undefined, 'all'),
    ]).finally(() => setLoading(false))
  }, [ready, isAdmin, loadOverview, loadAuthors, loadArticles])

  async function moderate(
    id: number,
    action: 'approve' | 'reject' | 'pending',
  ) {
    setBusyId(id)
    const res = await moderateBlogArticle({ id, action })
    setBusyId(0)
    if (!res.success) {
      toast.error(res.message || '操作失败')
      return
    }
    toast.success(
      action === 'approve'
        ? '已通过'
        : action === 'reject'
          ? '已驳回'
          : '已标为待审',
    )
    void loadOverview()
    void loadArticles(articleKw, status)
  }

  if (ready && !isAdmin) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        仅站点管理员可管理博客。
      </p>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        加载中…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">博客管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看博客开通情况与全部文章（含不公开 / 加密），便于审查。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={UsersIcon}
          label="已开通"
          value={overview?.activatedUsers ?? 0}
        />
        <StatCard
          icon={BookOpenIcon}
          label="文章数"
          value={overview?.totalArticles ?? 0}
        />
        <StatCard
          icon={EyeIcon}
          label="总阅读"
          value={overview?.totalViews ?? 0}
        />
        <StatCard
          icon={HeartIcon}
          label="总点赞"
          value={overview?.totalLikes ?? 0}
          extra={
            overview
              ? `评论 ${overview.totalComments} · 待审 ${overview.pendingReview}`
              : undefined
          }
        />
      </div>

      <Tabs defaultValue="authors">
        <TabsList>
          <TabsTrigger value="authors">开通作者</TabsTrigger>
          <TabsTrigger value="articles">文章审查</TabsTrigger>
        </TabsList>

        <TabsContent value="authors" className="flex flex-col gap-3">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void loadAuthors(authorKw.trim())
            }}
          >
            <Input
              value={authorKw}
              onChange={(e) => setAuthorKw(e.target.value)}
              placeholder="搜索用户名或昵称"
              className="max-w-xs"
            />
            <Button type="submit" variant="secondary">
              搜索
            </Button>
          </form>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">已开通博客</CardTitle>
              <CardDescription>共 {authorTotal} 位</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>开通时间</TableHead>
                    <TableHead>协议</TableHead>
                    <TableHead>文章</TableHead>
                    <TableHead>阅读 / 赞 / 评</TableHead>
                    <TableHead>邮件通知</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {authors.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        暂无开通记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    authors.map((a) => (
                      <TableRow key={a.userId}>
                        <TableCell>
                          <div className="font-medium">
                            {a.name || a.username}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{a.username}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.activatedAt
                            ? formatTime(a.activatedAt)
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {a.agreementVersion || '已签署'}
                          </Badge>
                        </TableCell>
                        <TableCell>{a.articleCount}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.viewCount} / {a.likeCount} / {a.commentCount}
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.emailNotifyEnabled
                            ? a.emailNotifyStrategy || '已开'
                            : '关'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/blog/${a.username}`} target="_blank">
                              打开博客
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="articles" className="flex flex-col gap-3">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void loadArticles(articleKw.trim(), status)
            }}
          >
            <Input
              value={articleKw}
              onChange={(e) => setArticleKw(e.target.value)}
              placeholder="搜索标题"
              className="max-w-xs"
            />
            <Select
              value={status}
              onValueChange={(v) => {
                const next = v || 'all'
                setStatus(next)
                void loadArticles(articleKw.trim(), next)
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="审核状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="approved">已通过</SelectItem>
                <SelectItem value="rejected">已驳回</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              筛选
            </Button>
          </form>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">文章列表</CardTitle>
              <CardDescription>共 {articleTotal} 篇</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>作者</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>数据</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        暂无文章
                      </TableCell>
                    </TableRow>
                  ) : (
                    articles.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link
                            to={`/blog/${a.username}/${a.slug}`}
                            className="font-medium hover:underline"
                            target="_blank"
                          >
                            {a.title}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {visibilityLabel[a.visibility] || a.visibility}
                            {a.visibility === 'password' ? ' · 密码' : ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          @{a.username}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              a.moderationStatus === 'rejected'
                                ? 'destructive'
                                : a.moderationStatus === 'pending'
                                  ? 'outline'
                                  : 'secondary'
                            }
                          >
                            {statusLabel[a.moderationStatus] ||
                              a.moderationStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-0.5">
                              <EyeIcon className="size-3" />
                              {a.viewCount}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <HeartIcon className="size-3" />
                              {a.likeCount}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <MessageCircleIcon className="size-3" />
                              {a.commentCount}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatTime(a.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === a.id}
                              onClick={() => void moderate(a.id, 'approve')}
                            >
                              <CheckIcon className="size-3.5" />
                              通过
                            </Button>
                            <ConfirmDialog
                              title="驳回这篇文章？"
                              description={`确定驳回「${a.title || '未命名'}」？作者将看到未通过的结果。`}
                              confirmLabel="驳回"
                              destructive
                              loading={busyId === a.id}
                              onConfirm={() => void moderate(a.id, 'reject')}
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === a.id}
                              >
                                <XIcon className="size-3.5" />
                                驳回
                              </Button>
                            </ConfirmDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  extra,
}: {
  icon: typeof UsersIcon
  label: string
  value: number
  extra?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {extra ? (
          <p className="mt-1 text-xs text-muted-foreground">{extra}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
