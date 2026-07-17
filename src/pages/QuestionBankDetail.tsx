import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLinkIcon, PencilIcon, TagsIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  adminUpdateProblem,
  getMyPendingProblemEdit,
  getProblem,
  getProblemFollowingStatus,
  getProblemSubmissions,
  listProblemTags,
  proposeProblemEdit,
  type TagCountItem,
} from '@/api/problem'
import type { ProblemFollowingStatusItem, ProblemInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarkdownBody } from '@/components/markdown-body'
import { PageShell } from '@/components/page-shell'
import { MarkdownEditor } from '@/components/markdown-editor'
import { TagInput } from '@/components/tag-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge, formatSubmitStatus } from '@/components/status-badge'
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { getSubmitLink } from '@/lib/link'
import { num, str } from '@/lib/http'
import { toMarkdownSource } from '@/lib/markdown'
import { cn } from '@/lib/utils'

export function QuestionBankDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLogin, isSiteAdmin } = useAuth()
  const [problem, setProblem] = useState<ProblemInfo | null>(null)
  const [subs, setSubs] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [hasPending, setHasPending] = useState(false)
  const [followingOnly, setFollowingOnly] = useState(false)
  const [acOnly, setAcOnly] = useState(false)
  const [followStatus, setFollowStatus] = useState<ProblemFollowingStatusItem[]>(
    [],
  )
  const [followStatusLoading, setFollowStatusLoading] = useState(false)
  const [subTab, setSubTab] = useState<'history' | 'following'>('history')

  const [tagsOpen, setTagsOpen] = useState(false)
  const [editingContent, setEditingContent] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<TagCountItem[]>([])
  const [contentInput, setContentInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [pRes, sRes] = await Promise.all([
      getProblem(id),
      getProblemSubmissions({
        problemId: id,
        page: 1,
        pageSize: 50,
        followingOnly: followingOnly || undefined,
        status: acOnly ? 'AC' : undefined,
      }),
    ])
    setLoading(false)
    if (!pRes.success || !pRes.data) {
      toast.error(pRes.message || '题目加载失败，请稍后重试')
      return
    }
    setProblem(pRes.data)
    if (sRes.success) setSubs(sRes.data || [])

    if (isLogin && !isSiteAdmin) {
      const pend = await getMyPendingProblemEdit(id)
      setHasPending(Boolean(pend.success && pend.data?.hasPending))
    } else {
      setHasPending(false)
    }
  }, [id, isLogin, isSiteAdmin, followingOnly, acOnly])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!id || !isLogin || subTab !== 'following') return
    let cancelled = false
    setFollowStatusLoading(true)
    void getProblemFollowingStatus(id).then((res) => {
      if (cancelled) return
      setFollowStatusLoading(false)
      if (res.success && res.data) setFollowStatus(res.data)
      else {
        setFollowStatus([])
        if (!res.success) toast.error(res.message || '关注进度加载失败，请稍后重试')
      }
    })
    return () => {
      cancelled = true
    }
  }, [id, isLogin, subTab])

  // 全屏编辑时锁住底层滚动，避免控制栏与正文错位
  useEffect(() => {
    if (!editingContent) return
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [editingContent])

  function openTagsEdit() {
    if (!problem) return
    if (!isLogin) {
      toast.error('请先登录后再修改')
      return
    }
    setSelectedTags([...problem.tags])
    setNoteInput('')
    setTagsOpen(true)
    if (!allTags.length) {
      void listProblemTags(200).then((res) => {
        if (res.success && res.data) setAllTags(res.data)
      })
    }
  }

  function openContentEdit() {
    if (!problem) return
    if (!isLogin) {
      toast.error('请先登录后再修改')
      return
    }
    setContentInput(toMarkdownSource(problem.contentMd || ''))
    setTitleInput(problem.title || '')
    setNoteInput('')
    setEditingContent(true)
  }

  function closeContentEdit() {
    setEditingContent(false)
    setContentInput('')
    setNoteInput('')
  }

  async function submitTags() {
    if (!problem) return
    const tags = selectedTags.map((t) => t.trim()).filter(Boolean)
    setSaving(true)
    if (isSiteAdmin) {
      const res = await adminUpdateProblem({
        id: problem.id,
        updateTags: true,
        tags,
      })
      setSaving(false)
      if (!res.success) {
        toast.error(res.message || '保存失败，请稍后重试')
        return
      }
      toast.success(res.message || '标签已更新')
      setTagsOpen(false)
      if (res.data) setProblem(res.data)
      else void load()
      return
    }
    const res = await proposeProblemEdit({
      problemId: problem.id,
      updateTags: true,
      tags,
      note: noteInput.trim() || undefined,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '提交失败，请稍后重试')
      return
    }
    toast.success(res.message || '已提交审核')
    setTagsOpen(false)
    setHasPending(true)
  }

  async function submitContent() {
    if (!problem) return
    const content = contentInput.trim()
    if (!content) {
      toast.error('题面内容不能为空')
      return
    }
    setSaving(true)
    if (isSiteAdmin) {
      const res = await adminUpdateProblem({
        id: problem.id,
        updateContent: true,
        contentMd: content,
        title: titleInput.trim() || undefined,
      })
      setSaving(false)
      if (!res.success) {
        toast.error(res.message || '保存失败，请稍后重试')
        return
      }
      toast.success(res.message || '题面已更新')
      setEditingContent(false)
      if (res.data) setProblem(res.data)
      else void load()
      return
    }
    const res = await proposeProblemEdit({
      problemId: problem.id,
      updateContent: true,
      contentMd: content,
      title: titleInput.trim() || undefined,
      note: noteInput.trim() || undefined,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '提交失败，请稍后重试')
      return
    }
    toast.success(res.message || '已提交审核')
    setEditingContent(false)
    setHasPending(true)
  }

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

  const contentEmpty = !problem.contentMd?.trim()
  const tagsEmpty = !problem.tags.length

  // ── 全屏题面编辑：fixed 盖住布局，控制栏不 sticky，仅正文区滚动 ──
  // 避免 sticky 工具栏叠在正文上，也避开 AppLayout 高度链 / 页脚干扰
  if (editingContent) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={closeContentEdit}
            disabled={saving}
          >
            取消
          </Button>
          <div className="min-w-0 flex-1">
            <Input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="题目标题（可选，不填则不改）"
              className="max-w-xl"
              disabled={saving}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void submitContent()}
            disabled={saving}
          >
            {saving ? '提交中…' : isSiteAdmin ? '保存' : '提交审核'}
          </Button>
        </div>

        <div className="shrink-0 border-b px-4 py-2">
          <p className="text-sm text-muted-foreground">
            {isSiteAdmin
              ? '编辑题面，保存后立即生效。若题目还没有标签，系统会继续尝试自动分析。'
              : '编辑题面。提交后由站点管理员审核通过才会展示。'}
          </p>
        </div>

        {!isSiteAdmin && (
          <div className="shrink-0 border-b px-4 py-2">
            <Field>
              <FieldLabel htmlFor="edit-content-note">说明（可选）</FieldLabel>
              <Textarea
                id="edit-content-note"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="简要说明修改原因，便于审核"
                rows={2}
                disabled={saving}
              />
            </Field>
          </div>
        )}

        <MarkdownEditor
          fullPage
          value={contentInput}
          onChange={setContentInput}
          disabled={saving}
          previewMode="markdown"
          placeholder={
            '用 Markdown 编写题面…\n\n## 题目描述\n\n支持代码块、表格与 $LaTeX$ 公式'
          }
          className="min-h-0 flex-1"
        />
      </div>
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
          <div className="flex flex-wrap items-center gap-1.5">
            {problem.tags.map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="border-border/70 bg-muted/50 font-normal text-muted-foreground"
              >
                {t}
              </Badge>
            ))}
            {tagsEmpty && (
              <span className="text-xs text-muted-foreground">暂无标签</span>
            )}
            {isLogin && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={openTagsEdit}
              >
                <TagsIcon data-icon="inline-start" />
                {isSiteAdmin ? '改标签' : '建议标签'}
              </Button>
            )}
          </div>
          {hasPending && (
            <p className="text-xs text-muted-foreground">
              你有一条修改申请正在等待站点管理员审核
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
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
        <CardHeader className="flex flex-row items-start justify-between gap-2 px-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">题面</CardTitle>
            {contentEmpty && (
              <CardDescription>
                题面尚未就绪，登录后可补充内容并提交审核
              </CardDescription>
            )}
          </div>
          {isLogin && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openContentEdit}
            >
              <PencilIcon data-icon="inline-start" />
              {isSiteAdmin
                ? contentEmpty
                  ? '填写题面'
                  : '编辑题面'
                : contentEmpty
                  ? '补充题面'
                  : '建议修改'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-4">
          <MarkdownBody
            content={problem.contentMd || ''}
            mode="auto"
            emptyText="题面准备中，请稍后刷新；登录后也可自行补充题面"
          />
        </CardContent>
      </Card>

      {problem.solutions.length > 0 && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">推荐解法</CardTitle>
            <CardDescription>由 AI 生成，仅供参考</CardDescription>
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

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">提交与关注</CardTitle>
          <div className="flex flex-wrap gap-2">
            {isLogin && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={followingOnly ? 'default' : 'outline'}
                  onClick={() => setFollowingOnly((v) => !v)}
                >
                  {followingOnly ? '只看关注 · 开' : '只看关注'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={acOnly ? 'default' : 'outline'}
                  onClick={() => setAcOnly((v) => !v)}
                >
                  {acOnly ? '仅通过 · 开' : '仅通过'}
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs
            value={subTab}
            onValueChange={(v) => setSubTab(v as 'history' | 'following')}
            className="gap-0"
          >
            <div className="border-b px-4 py-2">
              <TabsList>
                <TabsTrigger value="history">提交历史</TabsTrigger>
                {isLogin && (
                  <TabsTrigger value="following">关注进度</TabsTrigger>
                )}
              </TabsList>
            </div>
            <TabsContent value="history" className="mt-0">
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
                      s.userName ||
                        s.name ||
                        s.username ||
                        (uid ? `用户${uid}` : '-'),
                    )
                    const status = str(s.status)
                    const submitUrl = getSubmitLink(
                      str(s.platform || problem.platform),
                      str(s.contest),
                      str(s.submitId),
                    )
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          {uid ? (
                            <Link
                              to={`/profile?id=${uid}`}
                              className="hover:underline"
                            >
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                        </TableCell>
                        <TableCell>{str(s.lang, '-')}</TableCell>
                        <TableCell>
                          {submitUrl ? (
                            <StatusBadge status={status} asChild>
                              <a
                                href={submitUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                                title="查看原站提交"
                              >
                                {formatSubmitStatus(status)}
                              </a>
                            </StatusBadge>
                          ) : (
                            <StatusBadge status={status} />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTime(s.time || s.submittedAt || s.createdAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {!subs.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        暂无提交
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            {isLogin && (
              <TabsContent value="following" className="mt-0">
                {followStatusLoading ? (
                  <div className="flex flex-col gap-2 p-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {followStatus.map((u) => {
                        const label =
                          u.status === 'AC'
                            ? '已通过'
                            : u.status === 'TRIED'
                              ? '尝试过'
                              : '未做'
                        const href = u.username
                          ? `/profile/${u.username}`
                          : `/profile?id=${u.userId}`
                        return (
                          <TableRow key={u.userId}>
                            <TableCell>
                              <Link to={href} className="hover:underline">
                                {u.name || u.username || `用户${u.userId}`}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  u.status === 'AC'
                                    ? 'default'
                                    : u.status === 'TRIED'
                                      ? 'secondary'
                                      : 'outline'
                                }
                              >
                                {label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {!followStatus.length && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center text-muted-foreground"
                          >
                            还没有关注的人，或暂时无法加载关注列表
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={tagsOpen} onOpenChange={setTagsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isSiteAdmin ? '修改标签' : '建议修改标签'}</DialogTitle>
            <DialogDescription>
              {isSiteAdmin
                ? '点选已有标签，或输入后回车新建。保存后立即生效；有标签后不再自动分析该题。'
                : '点选已有标签，或输入后回车新建。提交后由站点管理员审核才会更新。'}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-tags">标签</FieldLabel>
              <TagInput
                id="edit-tags"
                value={selectedTags}
                onChange={setSelectedTags}
                suggestions={allTags}
                disabled={saving}
              />
            </Field>
            {!isSiteAdmin && (
              <Field>
                <FieldLabel htmlFor="edit-tags-note">说明（可选）</FieldLabel>
                <Textarea
                  id="edit-tags-note"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="简要说明修改原因"
                  rows={2}
                />
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTagsOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button type="button" onClick={() => void submitTags()} disabled={saving}>
              {saving ? '提交中…' : isSiteAdmin ? '保存' : '提交审核'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
