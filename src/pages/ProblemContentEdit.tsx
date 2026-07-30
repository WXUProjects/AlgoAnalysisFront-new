import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  adminUpdateProblem,
  getProblem,
  listProblemTags,
  proposeProblemEdit,
} from '@/api/problem'
import type { ProblemInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { MarkdownEditor } from '@/components/markdown-editor'
import { PageShell } from '@/components/page-shell'
import { TagInput, type TagSuggestion } from '@/components/tag-input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { toMarkdownSource } from '@/lib/markdown'
import { Perm } from '@/lib/permissions'

const DIFFICULTY_OPTIONS = ['简单', '中等', '困难'] as const
/** Select 用：未选难度 */
const DIFFICULTY_NONE = '__none__'

function tagsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].map((t) => t.trim()).filter(Boolean).sort()
  const sb = [...b].map((t) => t.trim()).filter(Boolean).sort()
  return sa.every((t, i) => t === sb[i])
}

/**
 * 题目编辑页：题面 + 标签一并修改（保留详情页「改标签」快捷入口）。
 * 走主布局，非全屏遮罩。
 */
export function ProblemContentEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLogin, can, ready } = useAuth()
  // 题库审查权限：直接保存生效；否则提交审核
  const canReview = can(Perm.ContentProblemReview)
  const [problem, setProblem] = useState<ProblemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [contentInput, setContentInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [difficultyInput, setDifficultyInput] = useState('')
  const [allTags, setAllTags] = useState<TagSuggestion[]>([])
  const [noteInput, setNoteInput] = useState('')
  const [saving, setSaving] = useState(false)

  const backTo = id ? `/question-bank/detail/${id}` : '/question-bank'

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await getProblem(id)
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '题目加载失败，请稍后重试')
      return
    }
    setProblem(res.data)
    setContentInput(toMarkdownSource(res.data.contentMd || ''))
    setTitleInput(res.data.title || '')
    setSelectedTags([...(res.data.tags || [])])
    setDifficultyInput((res.data.difficulty || '').trim())
    setNoteInput('')
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void listProblemTags(200).then((res) => {
      if (res.success && res.data) {
        setAllTags(
          res.data
            .filter((t) => t.tag)
            .map((t) => ({ tag: t.tag, count: t.count })),
        )
      }
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!isLogin) {
      toast.error('请先登录后再修改')
      navigate(backTo, { replace: true })
    }
  }, [ready, isLogin, navigate, backTo])

  async function submitEdit() {
    if (!problem) return
    const content = contentInput.trim()
    if (!content) {
      toast.error('题面内容不能为空')
      return
    }
    const tags = selectedTags.map((t) => t.trim()).filter(Boolean)
    const tagsChanged = !tagsEqual(tags, problem.tags || [])
    const titleTrim = titleInput.trim()
    const titleChanged =
      Boolean(titleTrim) && titleTrim !== (problem.title || '').trim()
    const difficultyTrim = difficultyInput.trim()
    const difficultyChanged =
      difficultyTrim !== (problem.difficulty || '').trim()

    setSaving(true)
    if (canReview) {
      const res = await adminUpdateProblem({
        id: problem.id,
        updateContent: true,
        contentMd: content,
        title: titleChanged ? titleTrim : undefined,
        updateTags: tagsChanged,
        tags: tagsChanged ? tags : undefined,
        updateDifficulty: difficultyChanged,
        difficulty: difficultyChanged ? difficultyTrim : undefined,
      })
      setSaving(false)
      if (!res.success) {
        toast.error(res.message || '保存失败，请稍后重试')
        return
      }
      toast.success(res.message || '已更新')
      navigate(backTo)
      return
    }
    const res = await proposeProblemEdit({
      problemId: problem.id,
      updateContent: true,
      contentMd: content,
      title: titleChanged ? titleTrim : undefined,
      updateTags: tagsChanged,
      tags: tagsChanged ? tags : undefined,
      updateDifficulty: difficultyChanged,
      difficulty: difficultyChanged ? difficultyTrim : undefined,
      note: noteInput.trim() || undefined,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '提交失败，请稍后重试')
      return
    }
    toast.success(res.message || '已提交审核')
    navigate(backTo)
  }

  if (loading) {
    return (
      <PageShell stagger={false}>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-[28rem] w-full" />
      </PageShell>
    )
  }

  if (!problem) {
    return (
      <PageShell>
        <Card className="py-4">
          <CardContent className="px-4 text-sm text-muted-foreground">
            题目不存在。
            <Link
              to="/question-bank"
              className="ml-2 underline underline-offset-2"
            >
              返回题库
            </Link>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell stagger={false} className="gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => navigate(backTo)}
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
          onClick={() => void submitEdit()}
          disabled={saving}
        >
          {saving ? '提交中…' : canReview ? '保存' : '提交审核'}
        </Button>
      </div>

      <Card className="gap-2 py-3">
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-base">
            {canReview ? '编辑题目' : '建议修改题目'}
          </CardTitle>
          <CardDescription>
            {canReview
              ? '可改题面、标签与难度，保存后立即生效。'
              : '可改题面、标签与难度，提交后需管理员审核通过才会展示。'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4 pt-1">
          <Field>
            <FieldLabel htmlFor="edit-content-difficulty">难度</FieldLabel>
            <Select
              value={difficultyInput || DIFFICULTY_NONE}
              onValueChange={(v) =>
                setDifficultyInput(v === DIFFICULTY_NONE ? '' : v)
              }
              disabled={saving}
            >
              <SelectTrigger id="edit-content-difficulty" className="max-w-xs">
                <SelectValue placeholder="选择难度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DIFFICULTY_NONE}>未设置</SelectItem>
                {DIFFICULTY_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-content-tags">标签</FieldLabel>
            <TagInput
              id="edit-content-tags"
              value={selectedTags}
              onChange={setSelectedTags}
              suggestions={allTags}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              点选已有标签，或输入后回车新建。也可在详情页单独改标签。
            </p>
          </Field>
          {!canReview && (
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
          )}
        </CardContent>
      </Card>

      <MarkdownEditor
        value={contentInput}
        onChange={setContentInput}
        disabled={saving}
        previewMode="markdown"
        minHeight={640}
        placeholder={
          '开始编写题面…'
        }
      />
    </PageShell>
  )
}
