import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLinkIcon, PencilIcon, TagsIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  adminUpdateProblem,
  getMyPendingProblemEdit,
  getProblem,
  getProblemSubmissions,
  proposeProblemEdit,
} from '@/api/problem'
import type { ProblemInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { MarkdownBody } from '@/components/markdown-body'
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
import { cn } from '@/lib/utils'

function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[,，、\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function QuestionBankDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLogin, isSiteAdmin } = useAuth()
  const [problem, setProblem] = useState<ProblemInfo | null>(null)
  const [subs, setSubs] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [hasPending, setHasPending] = useState(false)

  const [tagsOpen, setTagsOpen] = useState(false)
  const [contentOpen, setContentOpen] = useState(false)
  const [tagsInput, setTagsInput] = useState('')
  const [contentInput, setContentInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [pRes, sRes] = await Promise.all([
      getProblem(id),
      getProblemSubmissions({ problemId: id, page: 1, pageSize: 50 }),
    ])
    setLoading(false)
    if (!pRes.success || !pRes.data) {
      toast.error(pRes.message || '加载题目失败')
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
  }, [id, isLogin, isSiteAdmin])

  useEffect(() => {
    void load()
  }, [load])

  function openTagsEdit() {
    if (!problem) return
    if (!isLogin) {
      toast.error('请先登录后再修改')
      return
    }
    setTagsInput(problem.tags.join('、'))
    setNoteInput('')
    setTagsOpen(true)
  }

  function openContentEdit() {
    if (!problem) return
    if (!isLogin) {
      toast.error('请先登录后再修改')
      return
    }
    setContentInput(problem.contentMd || '')
    setTitleInput(problem.title || '')
    setNoteInput('')
    setContentOpen(true)
  }

  async function submitTags() {
    if (!problem) return
    const tags = parseTagsInput(tagsInput)
    setSaving(true)
    if (isSiteAdmin) {
      const res = await adminUpdateProblem({
        id: problem.id,
        updateTags: true,
        tags,
      })
      setSaving(false)
      if (!res.success) {
        toast.error(res.message || '保存失败')
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
      toast.error(res.message || '提交失败')
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
        toast.error(res.message || '保存失败')
        return
      }
      toast.success(res.message || '题面已更新')
      setContentOpen(false)
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
      toast.error(res.message || '提交失败')
      return
    }
    toast.success(res.message || '已提交审核')
    setContentOpen(false)
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
            mode="markdown"
            emptyText="题面准备中，请稍后刷新；也可登录后补充题面"
          />
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

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3">
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
                        <Link to={`/profile?id=${uid}`} className="hover:underline">
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
                            {status || '-'}
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
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    暂无提交
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={tagsOpen} onOpenChange={setTagsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isSiteAdmin ? '修改标签' : '建议修改标签'}</DialogTitle>
            <DialogDescription>
              {isSiteAdmin
                ? '保存后立即生效。若标签非空，系统将不再对该题自动分析标签。'
                : '提交后由站点管理员审核，通过后才会更新到题库。'}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-tags">标签</FieldLabel>
              <Input
                id="edit-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="用顿号、逗号或换行分隔，如：动态规划、前缀和"
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

      <Dialog open={contentOpen} onOpenChange={setContentOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isSiteAdmin
                ? contentEmpty
                  ? '填写题面'
                  : '编辑题面'
                : contentEmpty
                  ? '补充题面'
                  : '建议修改题面'}
            </DialogTitle>
            <DialogDescription>
              {isSiteAdmin
                ? '支持 Markdown。保存后若标签为空，系统会继续尝试自动分析标签。'
                : '支持 Markdown。提交后由站点管理员审核通过才会展示。'}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-title">标题（可选）</FieldLabel>
              <Input
                id="edit-title"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="留空则不改标题"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-content">题面 Markdown</FieldLabel>
              <Textarea
                id="edit-content"
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                placeholder={'# 标题\n\n## 题意\n\n## 输入\n\n## 输出\n\n## 样例\n'}
                rows={14}
                className="font-mono text-sm"
              />
            </Field>
            {!isSiteAdmin && (
              <Field>
                <FieldLabel htmlFor="edit-content-note">说明（可选）</FieldLabel>
                <Textarea
                  id="edit-content-note"
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
              onClick={() => setContentOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void submitContent()}
              disabled={saving}
            >
              {saving ? '提交中…' : isSiteAdmin ? '保存' : '提交审核'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
