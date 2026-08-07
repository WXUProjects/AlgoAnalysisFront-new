import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpenIcon,
  CheckIcon,
  EyeIcon,
  HeartIcon,
  MessageCircleIcon,
  StarIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getBlogAdminOverview,
  listBlogAdminArticles,
  listBlogAdminAuthors,
  listBlogImageUploadRequests,
  moderateBlogArticle,
  reviewBlogImageUpload,
  setBlogAuthorImageUpload,
} from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { BlogAdminImageManager } from '@/components/blog-admin-image-manager'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { Textarea } from '@/components/ui/textarea'
import { formatTime } from '@/lib/format'
import { Perm } from '@/lib/permissions'
import type {
  BlogAdminArticle,
  BlogAdminAuthor,
  BlogAdminOverview,
  BlogImageUploadRequestItem,
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
  const { can, ready, isSiteAdmin } = useAuth()
  const canBlogAdmin =
    can(Perm.ContentBlogModerate) || can(Perm.SiteBlogBoard)
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
  const [uploadBusyId, setUploadBusyId] = useState(0)
  const [uploadReqs, setUploadReqs] = useState<BlogImageUploadRequestItem[]>(
    [],
  )
  const [uploadReqTotal, setUploadReqTotal] = useState(0)
  const [uploadReqStatus, setUploadReqStatus] = useState('pending')
  const [uploadReviewBusyId, setUploadReviewBusyId] = useState(0)
  const [rejectTarget, setRejectTarget] =
    useState<BlogImageUploadRequestItem | null>(null)
  const [rejectNote, setRejectNote] = useState('')

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

  const loadUploadReqs = useCallback(async (st?: string) => {
    const res = await listBlogImageUploadRequests({
      page: 1,
      pageSize: 30,
      status: st || 'pending',
    })
    if (res.success && res.data) {
      setUploadReqs(res.data.list)
      setUploadReqTotal(res.data.total)
    } else {
      toast.error(res.message || '图片上传申请加载失败')
    }
  }, [])

  useEffect(() => {
    if (!ready || !canBlogAdmin) return
    setLoading(true)
    void Promise.all([
      loadOverview(),
      loadAuthors(),
      loadArticles(undefined, 'all'),
      loadUploadReqs('pending'),
    ]).finally(() => setLoading(false))
  }, [
    ready,
    canBlogAdmin,
    loadOverview,
    loadAuthors,
    loadArticles,
    loadUploadReqs,
  ])

  async function toggleImageUpload(userId: number, enabled: boolean) {
    setUploadBusyId(userId)
    const res = await setBlogAuthorImageUpload({ userId, enabled })
    setUploadBusyId(0)
    if (!res.success) {
      toast.error(res.message || '设置失败')
      return
    }
    toast.success(enabled ? '已开通图片上传' : '已关闭图片上传')
    void loadAuthors(authorKw.trim() || undefined)
    void loadUploadReqs(uploadReqStatus)
  }

  async function reviewUploadReq(
    id: number,
    action: 'approve' | 'reject',
    note?: string,
  ) {
    setUploadReviewBusyId(id)
    const res = await reviewBlogImageUpload({ id, action, note })
    setUploadReviewBusyId(0)
    if (!res.success) {
      toast.error(res.message || '操作失败')
      return
    }
    toast.success(res.message || (action === 'approve' ? '已通过' : '已驳回'))
    setRejectTarget(null)
    setRejectNote('')
    void loadUploadReqs(uploadReqStatus)
    void loadAuthors(authorKw.trim() || undefined)
  }

  async function moderate(
    id: number,
    action: 'approve' | 'reject' | 'pending' | 'feature' | 'unfeature',
  ) {
    setBusyId(id)
    const res = await moderateBlogArticle({ id, action })
    setBusyId(0)
    if (!res.success) {
      toast.error(res.message || '操作失败')
      return
    }
    const msg =
      action === 'approve'
        ? '已通过'
        : action === 'reject'
          ? '已驳回'
          : action === 'pending'
            ? '已标为待审'
            : action === 'feature'
              ? '已设为精选'
              : '已取消精选'
    toast.success(msg)
    void loadOverview()
    void loadArticles(articleKw, status)
  }

  if (ready && !canBlogAdmin) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        你还没有管理博客的权限。有需要的话，找站点管理员开通。
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
          开通情况、文章审核、图片上传申请、全站图片与作者授权。
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
          <TabsTrigger value="image-upload">
            图片上传申请
            {uploadReqStatus === 'pending' && uploadReqTotal > 0
              ? ` (${uploadReqTotal})`
              : ''}
          </TabsTrigger>
          {isSiteAdmin ? (
            <TabsTrigger value="images">图片管理</TabsTrigger>
          ) : null}
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
                    <TableHead>图片上传</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {authors.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground"
                      >
                        还没有开通记录
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
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              a.imageUploadEnabled ? 'secondary' : 'outline'
                            }
                            disabled={uploadBusyId === a.userId}
                            onClick={() =>
                              void toggleImageUpload(
                                a.userId,
                                !a.imageUploadEnabled,
                              )
                            }
                          >
                            {uploadBusyId === a.userId
                              ? '…'
                              : a.imageUploadEnabled
                                ? '已开通'
                                : '未开通'}
                          </Button>
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
                <SelectGroup>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="approved">已通过</SelectItem>
                  <SelectItem value="rejected">已驳回</SelectItem>
                </SelectGroup>
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
                        还没有文章
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
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span>
                              {visibilityLabel[a.visibility] || a.visibility}
                              {a.visibility === 'password' ? ' · 密码' : ''}
                            </span>
                            {a.recommend ? (
                              <Badge className="gap-0.5 font-normal">
                                <StarIcon className="size-3" />
                                精选
                              </Badge>
                            ) : null}
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
                          <div className="inline-flex flex-wrap justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === a.id}
                              onClick={() => void moderate(a.id, 'approve')}
                            >
                              <CheckIcon data-icon="inline-start" />
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
                                <XIcon data-icon="inline-start" />
                                驳回
                              </Button>
                            </ConfirmDialog>
                            {a.visibility === 'public' &&
                            a.moderationStatus === 'approved' ? (
                              <Button
                                size="sm"
                                variant={a.recommend ? 'secondary' : 'outline'}
                                disabled={busyId === a.id}
                                onClick={() =>
                                  void moderate(
                                    a.id,
                                    a.recommend ? 'unfeature' : 'feature',
                                  )
                                }
                              >
                                <StarIcon data-icon="inline-start" />
                                {a.recommend ? '取消精选' : '设为精选'}
                              </Button>
                            ) : null}
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

        <TabsContent value="image-upload" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={uploadReqStatus}
              onValueChange={(v) => {
                const next = v || 'pending'
                setUploadReqStatus(next)
                void loadUploadReqs(next)
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="approved">已通过</SelectItem>
                  <SelectItem value="rejected">已驳回</SelectItem>
                  <SelectItem value="all">全部</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void loadUploadReqs(uploadReqStatus)}
            >
              刷新
            </Button>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">图片上传申请</CardTitle>
              <CardDescription>
                共 {uploadReqTotal} 条。通过后作者可在博客与题解中上传图片。
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申请人</TableHead>
                    <TableHead>理由</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadReqs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        {uploadReqStatus === 'pending'
                          ? '还没有待审申请'
                          : '还没有记录'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    uploadReqs.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">
                            {r.name || r.username}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{r.username}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs whitespace-pre-wrap text-sm">
                          {r.reason}
                          {r.reviewNote ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              备注：{r.reviewNote}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === 'rejected'
                                ? 'destructive'
                                : r.status === 'pending'
                                  ? 'outline'
                                  : 'secondary'
                            }
                          >
                            {statusLabel[r.status] || r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatTime(r.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === 'pending' ? (
                            <div className="inline-flex flex-wrap justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={uploadReviewBusyId === r.id}
                                onClick={() =>
                                  void reviewUploadReq(r.id, 'approve')
                                }
                              >
                                <CheckIcon data-icon="inline-start" />
                                通过
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={uploadReviewBusyId === r.id}
                                onClick={() => {
                                  setRejectTarget(r)
                                  setRejectNote('')
                                }}
                              >
                                <XIcon data-icon="inline-start" />
                                驳回
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {isSiteAdmin ? (
          <TabsContent value="images" className="flex flex-col gap-3">
            <BlogAdminImageManager />
          </TabsContent>
        ) : null}
      </Tabs>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectNote('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>驳回图片上传申请</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `驳回 @${rejectTarget.username} 的申请。可填写备注说明原因。`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="image-upload-reject-note">
              备注（可选）
            </FieldLabel>
            <Textarea
              id="image-upload-reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="例如：先开通博客后再申请"
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectTarget(null)
                setRejectNote('')
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectTarget || uploadReviewBusyId === rejectTarget.id}
              onClick={() => {
                if (!rejectTarget) return
                void reviewUploadReq(
                  rejectTarget.id,
                  'reject',
                  rejectNote.trim() || undefined,
                )
              }}
            >
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
