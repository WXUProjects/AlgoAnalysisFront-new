import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  createProblemSolution,
  getProblemSolution,
  updateProblemSolution,
} from '@/api/community'
import { getProblem } from '@/api/problem'
import { useAuth } from '@/auth/AuthContext'
import { MarkdownEditor } from '@/components/markdown-editor'
import { PageShell } from '@/components/page-shell'
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
import { Skeleton } from '@/components/ui/skeleton'

/**
 * 写 / 编辑题解页：走主布局（保留左侧 Tab），非弹窗。
 * - 新建：/question-bank/detail/:id/solution/new
 * - 编辑：/question-bank/detail/:id/solution/:solutionId/edit
 */
export function ProblemSolutionEdit() {
  const { id, solutionId } = useParams()
  const navigate = useNavigate()
  const { isLogin, ready, user, isSiteAdmin } = useAuth()
  const editId = Number(solutionId || 0)
  const isEdit = editId > 0

  const [problemTitle, setProblemTitle] = useState('')
  const [sTitle, setSTitle] = useState('')
  const [sContent, setSContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const problemId = Number(id || 0)
  const backTo =
    problemId > 0
      ? `/question-bank/detail/${problemId}?tab=solutions`
      : '/question-bank'

  const load = useCallback(async () => {
    if (!ready || !isLogin) return
    if (!problemId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const pRes = await getProblem(problemId)
    if (pRes.success && pRes.data) {
      setProblemTitle(pRes.data.title || '')
    }

    if (isEdit) {
      const sRes = await getProblemSolution(editId)
      if (!sRes.success || !sRes.data) {
        setLoading(false)
        toast.error(sRes.message || '博客加载失败')
        navigate(backTo, { replace: true })
        return
      }
      const sol = sRes.data
      if (sol.problemId && sol.problemId !== problemId) {
        setLoading(false)
        toast.error('博客与题目不匹配')
        navigate(backTo, { replace: true })
        return
      }
      const myId = user?.userId ?? 0
      if (myId && sol.userId !== myId && !isSiteAdmin) {
        setLoading(false)
        toast.error('只能编辑自己的博客')
        navigate(
          `/question-bank/detail/${problemId}/solution/${editId}`,
          { replace: true },
        )
        return
      }
      setSTitle(sol.title || '')
      setSContent(sol.contentMd || '')
    } else {
      setSTitle('')
      setSContent('')
    }
    setLoading(false)
  }, [
    ready,
    isLogin,
    problemId,
    isEdit,
    editId,
    backTo,
    navigate,
    user?.userId,
    isSiteAdmin,
  ])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!ready) return
    if (!isLogin) {
      toast.error('请先登录后再写博客')
      navigate(backTo, { replace: true })
    }
  }, [ready, isLogin, navigate, backTo])

  async function submitSolution() {
    if (!problemId) return
    if (!sTitle.trim() || !sContent.trim()) {
      toast.error('请填写标题和正文')
      return
    }
    setSaving(true)
    const res = isEdit
      ? await updateProblemSolution({
          id: editId,
          title: sTitle.trim(),
          contentMd: sContent,
        })
      : await createProblemSolution({
          problemId,
          title: sTitle.trim(),
          contentMd: sContent,
        })
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '保存失败')
      return
    }
    toast.success(isEdit ? '博客已更新' : '博客已发布')
    if (isEdit) {
      navigate(`/question-bank/detail/${problemId}/solution/${editId}`)
    } else if (res.data?.id) {
      navigate(`/question-bank/detail/${problemId}/solution/${res.data.id}`)
    } else {
      navigate(backTo)
    }
  }

  if (loading) {
    return (
      <PageShell stagger={false}>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-[28rem] w-full" />
      </PageShell>
    )
  }

  if (!problemId) {
    return (
      <PageShell>
        <Card className="py-4">
          <CardContent className="px-4 text-sm text-muted-foreground">
            题目不存在。
            <Link to="/question-bank" className="ml-2 underline underline-offset-2">
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
          <p className="truncate text-sm text-muted-foreground">
            {problemTitle || `题目 #${problemId}`}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={() => void submitSolution()}
        >
          {saving ? '保存中…' : isEdit ? '保存' : '发布'}
        </Button>
      </div>

      <Card className="gap-2 py-3">
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-base">
            {isEdit ? '编辑博客' : '发布博客'}
          </CardTitle>
          <CardDescription>
            左侧写 Markdown，右侧实时预览（公式与题面规格一致）。可用 @用户名
            提醒他人；发布后会同步到你当前组织的发现页。
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pt-1">
          <Field>
            <FieldLabel htmlFor="solution-title">标题</FieldLabel>
            <Input
              id="solution-title"
              value={sTitle}
              onChange={(e) => setSTitle(e.target.value)}
              placeholder="博客标题"
              maxLength={120}
              disabled={saving}
            />
          </Field>
        </CardContent>
      </Card>

      <MarkdownEditor
        value={sContent}
        onChange={setSContent}
        disabled={saving}
        previewMode="markdown"
        minHeight={640}
        placeholder={
          '用 Markdown 写博客…\n\n## 思路\n\n支持代码块与 $公式$\n\n可用 @username 提醒他人'
        }
      />
    </PageShell>
  )
}
