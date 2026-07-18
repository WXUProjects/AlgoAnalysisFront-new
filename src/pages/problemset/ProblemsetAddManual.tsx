import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { addManualProblemToSet } from '@/api/problemset'
import { listProblemTags } from '@/api/problem'
import { useAuth } from '@/auth/AuthContext'
import { MarkdownEditor } from '@/components/markdown-editor'
import { PageShell } from '@/components/page-shell'
import { TagInput } from '@/components/tag-input'
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

/**
 * 链接无法识别时：手动向题库加题并加入题单（发布后回题单，无需审核）。
 */
export function ProblemsetAddManual() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { isLogin, ready } = useAuth()

  const sourceUrl = params.get('url') || ''
  const backTo = id ? `/problemset/${id}` : '/problemset'

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<
    { tag: string; count?: number }[]
  >([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!ready) return
    if (!isLogin) {
      toast.error('请先登录')
      navigate(backTo, { replace: true })
    }
  }, [ready, isLogin, navigate, backTo])

  useEffect(() => {
    void listProblemTags(100).then((res) => {
      if (res.success && res.data) {
        setTagSuggestions(
          res.data
            .filter((t) => t.tag)
            .map((t) => ({ tag: t.tag, count: t.count })),
        )
      }
    })
  }, [])

  async function handlePublish() {
    if (!id) return
    const t = title.trim()
    if (!t) {
      toast.error('请填写题目标题')
      return
    }
    setSaving(true)
    const res = await addManualProblemToSet({
      problemsetId: Number(id),
      title: t,
      contentMd: content.trim() || undefined,
      tags: tags.length ? tags : undefined,
      sourceUrl: sourceUrl.trim() || undefined,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '发布失败')
      return
    }
    toast.success('已发布并加入题单')
    navigate(backTo)
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="题目标题（必填）"
            className="max-w-xl"
            disabled={saving}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => void handlePublish()}
          disabled={saving}
        >
          {saving ? '发布中…' : '发布'}
        </Button>
      </div>

      <Card className="gap-2 py-3">
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-base">手动加入题库</CardTitle>
          <CardDescription>
            链接无法自动识别时，可填写标题后发布。题面与标签可选；发布后会直接加入当前题单，无需审核。
            {sourceUrl ? (
              <>
                {' '}
                原链接：
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all underline underline-offset-2"
                >
                  {sourceUrl}
                </a>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pt-1">
          <Field>
            <FieldLabel>标签（可选）</FieldLabel>
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={tagSuggestions}
              disabled={saving}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            若填写了题面但未写标签，且你具备 AI 权限，系统可能会自动分析标签。
          </p>
        </CardContent>
      </Card>

      <MarkdownEditor
        value={content}
        onChange={setContent}
        disabled={saving}
        previewMode="markdown"
        minHeight={480}
        placeholder={
          '题面内容（可选）…\n\n## 题目描述\n\n支持 Markdown 与 $LaTeX$ 公式'
        }
      />

      <p className="text-center text-xs text-muted-foreground">
        发布后返回{' '}
        <Link to={backTo} className="underline underline-offset-2">
          题单
        </Link>
      </p>
    </PageShell>
  )
}
