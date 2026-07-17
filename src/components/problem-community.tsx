import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpenIcon, MessageSquareIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  createProblemComment,
  createProblemSolution,
  deleteProblemComment,
  deleteProblemSolution,
  getProblemSolution,
  listProblemComments,
  listProblemSolutions,
  updateProblemSolution,
} from '@/api/community'
import type { ProblemCommentItem, ProblemUserSolutionItem } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { MarkdownBody } from '@/components/markdown-body'
import { MarkdownEditor } from '@/components/markdown-editor'
import { MentionTextarea } from '@/components/mention-textarea'
import { Pagination } from '@/components/pagination'
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
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatTime } from '@/lib/format'

type Props = {
  problemId: number
}

export function ProblemCommunity({ problemId }: Props) {
  const { isLogin, user, isSiteAdmin } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'solutions' ? 'solutions' : 'comments'

  const [comments, setComments] = useState<ProblemCommentItem[]>([])
  const [cTotal, setCTotal] = useState(0)
  const [cPage, setCPage] = useState(1)
  const [cDraft, setCDraft] = useState('')
  const [cSending, setCSending] = useState(false)

  const [solutions, setSolutions] = useState<ProblemUserSolutionItem[]>([])
  const [sTotal, setSTotal] = useState(0)
  const [sPage, setSPage] = useState(1)
  const [viewing, setViewing] = useState<ProblemUserSolutionItem | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editId, setEditId] = useState(0)
  const [sTitle, setSTitle] = useState('')
  const [sContent, setSContent] = useState('')
  const [sSending, setSSending] = useState(false)

  const loadComments = useCallback(async () => {
    const res = await listProblemComments({ problemId, page: cPage, pageSize: 10 })
    if (res.success && res.data) {
      setComments(res.data.list)
      setCTotal(res.data.total)
    }
  }, [problemId, cPage])

  const loadSolutions = useCallback(async () => {
    const res = await listProblemSolutions({ problemId, page: sPage, pageSize: 10 })
    if (res.success && res.data) {
      setSolutions(res.data.list)
      setSTotal(res.data.total)
    }
  }, [problemId, sPage])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  useEffect(() => {
    void loadSolutions()
  }, [loadSolutions])

  // 深链打开某题解
  useEffect(() => {
    const sid = Number(params.get('solutionId') || 0)
    if (!sid) return
    void getProblemSolution(sid).then((res) => {
      if (res.success && res.data) setViewing(res.data)
    })
  }, [params])

  function setTab(v: string) {
    const next = new URLSearchParams(params)
    if (v === 'solutions') next.set('tab', 'solutions')
    else next.set('tab', 'comments')
    next.delete('solutionId')
    setParams(next, { replace: true })
  }

  async function submitComment() {
    const content = cDraft.trim()
    if (!content) {
      toast.error('请先写点内容')
      return
    }
    setCSending(true)
    const res = await createProblemComment({ problemId, content })
    setCSending(false)
    if (!res.success) {
      toast.error(res.message || '发布失败')
      return
    }
    setCDraft('')
    toast.success('评论已发布')
    setCPage(1)
    void loadComments()
  }

  async function removeComment(id: number) {
    const res = await deleteProblemComment(id)
    if (!res.success) {
      toast.error(res.message || '删除失败')
      return
    }
    toast.success('已删除')
    void loadComments()
  }

  function openCreateSolution() {
    setEditId(0)
    setSTitle('')
    setSContent('')
    setEditorOpen(true)
  }

  async function openEditSolution(id: number) {
    const res = await getProblemSolution(id)
    if (!res.success || !res.data) {
      toast.error(res.message || '加载失败')
      return
    }
    setEditId(id)
    setSTitle(res.data.title)
    setSContent(res.data.contentMd || '')
    setEditorOpen(true)
  }

  async function submitSolution() {
    if (!sTitle.trim() || !sContent.trim()) {
      toast.error('请填写标题和正文')
      return
    }
    setSSending(true)
    const res = editId
      ? await updateProblemSolution({ id: editId, title: sTitle.trim(), contentMd: sContent })
      : await createProblemSolution({
          problemId,
          title: sTitle.trim(),
          contentMd: sContent,
        })
    setSSending(false)
    if (!res.success) {
      toast.error(res.message || '保存失败')
      return
    }
    toast.success(editId ? '题解已更新' : '题解已发布')
    setEditorOpen(false)
    setSPage(1)
    void loadSolutions()
  }

  async function removeSolution(id: number) {
    const res = await deleteProblemSolution(id)
    if (!res.success) {
      toast.error(res.message || '删除失败')
      return
    }
    toast.success('已删除')
    if (viewing?.id === id) setViewing(null)
    void loadSolutions()
  }

  async function openView(id: number) {
    const res = await getProblemSolution(id)
    if (!res.success || !res.data) {
      toast.error(res.message || '加载失败')
      return
    }
    setViewing(res.data)
    const next = new URLSearchParams(params)
    next.set('tab', 'solutions')
    next.set('solutionId', String(id))
    setParams(next, { replace: true })
  }

  const myId = user?.userId ?? 0

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">讨论与题解</CardTitle>
            <CardDescription>评论与题解全站可见；发布后会同步到你当前组织的发现页</CardDescription>
          </div>
          {isLogin && tab === 'solutions' && (
            <Button type="button" size="sm" onClick={openCreateSolution}>
              <BookOpenIcon data-icon="inline-start" />
              写题解
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={setTab} className="gap-0">
            <div className="border-b px-4 py-2">
              <TabsList>
                <TabsTrigger value="comments">
                  <MessageSquareIcon className="size-3.5" />
                  评论
                </TabsTrigger>
                <TabsTrigger value="solutions">
                  <BookOpenIcon className="size-3.5" />
                  题解栏
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="comments" className="mt-0 space-y-3 p-4">
              {isLogin ? (
                <div className="space-y-2">
                  <MentionTextarea
                    value={cDraft}
                    onChange={setCDraft}
                    placeholder="写点想法，可用 @用户名 提醒他人…"
                    maxLength={2000}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={cSending}
                      onClick={() => void submitComment()}
                    >
                      {cSending ? '发布中…' : '发布评论'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Link to="/login" className="underline underline-offset-2">
                    登录
                  </Link>
                  后可发表评论
                </p>
              )}

              <ul className="divide-y rounded-lg border">
                {comments.map((c) => (
                  <li key={c.id} className="px-3 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={c.username ? `/profile/${c.username}` : `/profile?id=${c.userId}`}
                          className="font-medium hover:underline"
                        >
                          {c.name || c.username || `用户${c.userId}`}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {formatTime(c.createdAt)}
                        </span>
                      </div>
                      {(myId === c.userId || isSiteAdmin) && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 shrink-0"
                          onClick={() => void removeComment(c.id)}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                      {c.content}
                    </p>
                  </li>
                ))}
                {!comments.length && (
                  <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                    还没有评论，来抢沙发吧
                  </li>
                )}
              </ul>
              {cTotal > 10 && (
                <Pagination
                  page={cPage}
                  total={cTotal}
                  pageSize={10}
                  onChange={setCPage}
                />
              )}
            </TabsContent>

            <TabsContent value="solutions" className="mt-0 space-y-3 p-4">
              {!isLogin && (
                <p className="text-sm text-muted-foreground">
                  <Link to="/login" className="underline underline-offset-2">
                    登录
                  </Link>
                  后可发布题解
                </p>
              )}
              <ul className="divide-y rounded-lg border">
                {solutions.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-2 px-3 py-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => void openView(s.id)}
                    >
                      <p className="font-medium hover:underline">{s.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.name || s.username} · {formatTime(s.createdAt)}
                      </p>
                      {s.excerpt && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {s.excerpt}
                        </p>
                      )}
                    </button>
                    <div className="flex shrink-0 gap-1">
                      {(myId === s.userId || isSiteAdmin) && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void openEditSolution(s.id)}
                          >
                            编辑
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => void removeSolution(s.id)}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
                {!solutions.length && (
                  <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                    还没有用户题解
                  </li>
                )}
              </ul>
              {sTotal > 10 && (
                <Pagination
                  page={sPage}
                  total={sTotal}
                  pageSize={10}
                  onChange={setSPage}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 题解阅读 */}
      <Dialog
        open={!!viewing}
        onOpenChange={(o) => {
          if (!o) {
            setViewing(null)
            const next = new URLSearchParams(params)
            next.delete('solutionId')
            setParams(next, { replace: true })
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-3 overflow-hidden">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
            <DialogDescription>
              {viewing?.name || viewing?.username} ·{' '}
              {viewing ? formatTime(viewing.createdAt) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <MarkdownBody content={viewing?.contentMd || ''} mode="auto" />
          </div>
        </DialogContent>
      </Dialog>

      {/* 题解双边编辑器 */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col gap-3 overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editId ? '编辑题解' : '发布题解'}</DialogTitle>
            <DialogDescription>
              左侧写 Markdown，右侧实时预览（公式与题面规格一致）。可用 @用户名 提醒他人。
            </DialogDescription>
          </DialogHeader>
          <Input
            value={sTitle}
            onChange={(e) => setSTitle(e.target.value)}
            placeholder="题解标题"
            maxLength={120}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            <MarkdownEditor
              value={sContent}
              onChange={setSContent}
              previewMode="markdown"
              minHeight={360}
              placeholder={
                '用 Markdown 写题解…\n\n## 思路\n\n支持代码块与 $公式$\n\n可用 @username 提醒他人'
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              disabled={sSending}
              onClick={() => void submitSolution()}
            >
              {sSending ? '保存中…' : editId ? '保存' : '发布'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
