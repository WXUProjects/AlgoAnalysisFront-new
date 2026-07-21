import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BookmarkIcon,
  GripVerticalIcon,
  HeartIcon,
  LinkIcon,
  LockIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  addProblemToSet,
  deleteProblemset,
  getProblemset,
  removeProblemFromSet,
  reorderProblemsetItems,
  toggleProblemsetFavorite,
  toggleProblemsetLike,
  unlockProblemset,
  updateProblemset,
} from '@/api/problemset'
import { listProblems } from '@/api/problem'
import {
  formatRecognizedProblemLine,
  type RecognizedProblem,
  waitForProblemRecognized,
  watchProblemInBackground,
} from '@/lib/add-problem-confirm'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { StatusBadge } from '@/components/status-badge'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  ProblemInfo,
  ProblemsetInfo,
  ProblemsetItemInfo,
  ProblemsetVisibility,
} from '@shared/api'
import { useDocumentMeta } from '@/hooks/use-document-meta'
import { clipMetaText } from '@/lib/document-meta'
import { cn } from '@/lib/utils'

const unlockKey = (id: string | number) => `ps_unlock_${id}`

const visLabel: Record<string, string> = {
  public: '公开',
  private: '私有',
  password: '需密码',
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) {
    return arr
  }
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function ProblemsetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLogin } = useAuth()
  const [set, setSet] = useState<ProblemsetInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [password, setPassword] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  useDocumentMeta(
    set
      ? {
          title: `${set.title || '题单'} - GoAlgo`,
          description: clipMetaText(
            set.description ||
              `${set.ownerName || '选手'} 的题单${
                set.itemCount ? ` · ${set.itemCount} 道题` : ''
              }`,
          ),
          url: `/problemset/${set.id}`,
          type: 'website',
          siteName: 'GoAlgo',
        }
      : null,
  )

  const [addOpen, setAddOpen] = useState(false)
  const [addMode, setAddMode] = useState<'bank' | 'url'>('bank')
  const [url, setUrl] = useState('')
  const [bankQ, setBankQ] = useState('')
  const [bankHits, setBankHits] = useState<ProblemInfo[]>([])
  const [adding, setAdding] = useState(false)
  const [urlPhase, setUrlPhase] = useState<'idle' | 'recognizing' | 'confirm' | 'failed'>(
    'idle',
  )
  const [recognized, setRecognized] = useState<RecognizedProblem | null>(null)
  const [urlFailMsg, setUrlFailMsg] = useState('')
  const bgWatchStop = useRef<(() => void) | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editVis, setEditVis] = useState<ProblemsetVisibility>('private')
  const [editPw, setEditPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<{
    problemId: number
    title: string
  } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busyConfirm, setBusyConfirm] = useState(false)
  const [reordering, setReordering] = useState(false)
  const dragFrom = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  useEffect(() => {
    return () => {
      bgWatchStop.current?.()
      bgWatchStop.current = null
    }
  }, [])

  function resetUrlAdd() {
    setUrl('')
    setAdding(false)
    setUrlPhase('idle')
    setRecognized(null)
    setUrlFailMsg('')
  }

  function openManualAdd(srcUrl?: string) {
    if (!set) return
    const q = srcUrl?.trim() ? `?url=${encodeURIComponent(srcUrl.trim())}` : ''
    setAddOpen(false)
    resetUrlAdd()
    navigate(`/problemset/${set.id}/add-problem${q}`)
  }

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const token =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(unlockKey(id)) || undefined
        : undefined
    const res = await getProblemset(id, token)
    if (res.success && res.data) {
      setSet(res.data)
      setLocked(false)
    } else if (res.data?.locked || res.message?.includes('密码')) {
      setSet(res.data)
      setLocked(true)
    } else {
      setSet(null)
      if (res.message) toast.error(res.message)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleUnlock() {
    if (!id || !password.trim()) {
      toast.error('请输入密码')
      return
    }
    setUnlocking(true)
    const res = await unlockProblemset(Number(id), password.trim())
    setUnlocking(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '密码错误')
      return
    }
    sessionStorage.setItem(unlockKey(id), res.data.unlockToken)
    setPassword('')
    toast.success('已解锁')
    void load()
  }

  async function handleLike() {
    if (!set) return
    if (!isLogin) {
      toast.message('登录后即可点赞')
      navigate('/login')
      return
    }
    const res = await toggleProblemsetLike(set.id)
    if (!res.success || !res.data) {
      toast.error(res.message || '操作失败')
      return
    }
    setSet({ ...set, liked: res.data.liked, likeCount: res.data.likeCount })
  }

  async function handleFavorite() {
    if (!set) return
    if (!isLogin) {
      toast.message('登录后即可收藏题单')
      navigate('/login')
      return
    }
    if (set.isSystem || set.visibility !== 'public') {
      toast.error('仅公开题单可收藏')
      return
    }
    const res = await toggleProblemsetFavorite(set.id)
    if (!res.success || !res.data) {
      toast.error(res.message || '操作失败')
      return
    }
    setSet({ ...set, favorited: res.data.favorited })
    toast.success(res.data.favorited ? '已收藏' : '已取消收藏')
  }

  function requestRemove(problemId: number, title: string) {
    setRemoveTarget({ problemId, title })
  }

  async function confirmRemove() {
    if (!set || !removeTarget) return
    setBusyConfirm(true)
    const res = await removeProblemFromSet(set.id, removeTarget.problemId)
    setBusyConfirm(false)
    if (!res.success) {
      toast.error(res.message || '移除失败')
      return
    }
    toast.success('已移除')
    setRemoveTarget(null)
    void load()
  }

  async function commitOrder(next: ProblemsetItemInfo[]) {
    if (!set) return
    const setId = set.id
    const prev = set.items || []
    setSet((cur) => (cur ? { ...cur, items: next } : cur))
    setReordering(true)
    const res = await reorderProblemsetItems(
      setId,
      next.map((x) => x.id),
    )
    setReordering(false)
    if (!res.success) {
      setSet((cur) => (cur ? { ...cur, items: prev } : cur))
      toast.error(res.message || '排序保存失败，请稍后重试')
      return
    }
    setSet((cur) =>
      cur
        ? {
            ...cur,
            items: next.map((item, i) => ({ ...item, sortOrder: i })),
          }
        : cur,
    )
  }

  function onDragStart(index: number) {
    dragFrom.current = index
  }

  function onDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    if (dragOver !== index) setDragOver(index)
  }

  function onDragLeave(index: number) {
    if (dragOver === index) setDragOver(null)
  }

  function onDrop(index: number) {
    if (!set?.isOwner) return
    const from = dragFrom.current
    dragFrom.current = null
    setDragOver(null)
    if (from == null || from === index) return
    const next = moveItem(set.items || [], from, index)
    void commitOrder(next)
  }

  function onDragEnd() {
    dragFrom.current = null
    setDragOver(null)
  }

  async function confirmDeleteSet() {
    if (!set || set.isSystem) return
    setBusyConfirm(true)
    const res = await deleteProblemset(set.id)
    setBusyConfirm(false)
    if (!res.success) {
      toast.error(res.message || '删除失败')
      return
    }
    toast.success('已删除')
    setDeleteOpen(false)
    navigate('/problemset')
  }

  async function searchBank() {
    const res = await listProblems({
      page: 1,
      pageSize: 10,
      keyword: bankQ.trim() || undefined,
    })
    if (res.success && res.data) {
      setBankHits(res.data.data || [])
    } else {
      setBankHits([])
      toast.error(res.message || '搜索失败')
    }
  }

  async function handleAddById(problemId: number) {
    if (!set) return
    setAdding(true)
    const res = await addProblemToSet({ problemsetId: set.id, problemId })
    setAdding(false)
    if (!res.success) {
      toast.error(res.message || '加入失败')
      return
    }
    toast.success(
      res.data?.fetchTriggered
        ? '已加入，正在后台拉取题面'
        : '已加入题单',
    )
    setAddOpen(false)
    void load()
  }

  async function handleRecognizeUrl() {
    if (!set || !url.trim()) {
      toast.error('请粘贴题目链接')
      return
    }
    const pasted = url.trim()
    setAdding(true)
    setUrlPhase('recognizing')
    setRecognized(null)
    setUrlFailMsg('')
    // 先只入库识别，确认后再挂到题单
    const res = await addProblemToSet({ url: pasted })
    if (!res.success) {
      setAdding(false)
      setUrlPhase('failed')
      setUrlFailMsg(
        res.code === 'URL_PARSE_FAILED'
          ? '无法从该链接识别题目'
          : res.message || '识别失败',
      )
      return
    }
    const pid = res.data?.problemId
    if (!pid) {
      setAdding(false)
      setUrlPhase('failed')
      setUrlFailMsg('识别失败，请手写加题')
      return
    }
    const seed = {
      platform: res.data?.platform,
      title: res.data?.title,
      externalId: res.data?.externalId,
    }
    const hit = await waitForProblemRecognized(pid, { deadlineMs: 5000, seed })
    setAdding(false)
    if (hit) {
      setRecognized(hit)
      setUrlPhase('confirm')
      return
    }
    // 5s 无结果：关窗，后台继续
    setAddOpen(false)
    resetUrlAdd()
    toast.message('后台识别中', {
      description: '题面拉取较慢，识别成功或失败会再通知你',
    })
    const setId = set.id
    bgWatchStop.current?.()
    bgWatchStop.current = watchProblemInBackground(pid, {
      seed,
      onSuccess: (p) => {
        bgWatchStop.current = null
        toast.success(`已识别：${formatRecognizedProblemLine(p)}`, {
          action: {
            label: '加入题单',
            onClick: () => {
              void (async () => {
                const r = await addProblemToSet({
                  problemsetId: setId,
                  problemId: p.id,
                })
                if (!r.success) {
                  toast.error(r.message || '加入失败')
                  return
                }
                toast.success('已加入题单')
                void load()
              })()
            },
          },
        })
      },
      onFail: (reason) => {
        bgWatchStop.current = null
        toast.error(reason || '识别失败', {
          description: '可手写加题，或放弃',
          action: {
            label: '手写加题',
            onClick: () => openManualAdd(pasted),
          },
        })
      },
    })
  }

  async function confirmRecognizedToSet() {
    if (!set || !recognized) return
    setAdding(true)
    const res = await addProblemToSet({
      problemsetId: set.id,
      problemId: recognized.id,
    })
    setAdding(false)
    if (!res.success) {
      toast.error(res.message || '加入失败')
      return
    }
    toast.success(`已加入：${formatRecognizedProblemLine(recognized)}`)
    setAddOpen(false)
    resetUrlAdd()
    void load()
  }

  function openEdit() {
    if (!set) return
    setEditTitle(set.title)
    setEditDesc(set.description || '')
    setEditVis((set.visibility as ProblemsetVisibility) || 'private')
    setEditPw('')
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!set) return
    setSaving(true)
    const res = await updateProblemset({
      id: set.id,
      title: set.isSystem ? undefined : editTitle.trim(),
      description: editDesc,
      visibility: set.isSystem ? undefined : editVis,
      password:
        !set.isSystem && editVis === 'password' && editPw.trim()
          ? editPw.trim()
          : undefined,
      clearPassword: !set.isSystem && editVis !== 'password',
    })
    setSaving(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '保存失败')
      return
    }
    toast.success('已保存')
    setEditOpen(false)
    void load()
  }

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-40 w-full rounded-xl" />
      </PageShell>
    )
  }

  if (locked) {
    return (
      <PageShell>
        <div>
          <h2 className="text-lg font-semibold">{set?.title || '密码题单'}</h2>
        </div>
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LockIcon className="size-4" />
              需要密码才能查看
            </CardTitle>
            <CardDescription>
              这是一份受密码保护的题单。输入正确密码后可查看题目列表。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="访问密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleUnlock()
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={unlocking}
                onClick={() => void handleUnlock()}
              >
                {unlocking ? '验证中…' : '解锁'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/problemset">返回</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  if (!set) {
    return (
      <PageShell>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            题单不存在或无权查看
            <div className="mt-4">
              <Button variant="outline" asChild>
                <Link to="/problemset">返回题单</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const items = set.items || []
  const subtitle =
    set.description?.trim() ||
    (set.isSystem
      ? set.kind === 'todo'
        ? '做对后会自动从这里移除，也可以手动剔除。'
        : '你收藏的题目会集中在这里。'
      : '')

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold">{set.title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">
              {visLabel[set.visibility] || set.visibility}
            </Badge>
            {set.isSystem && (
              <Badge variant="secondary">
                {set.kind === 'todo' ? '待做' : '收藏'}
              </Badge>
            )}
            {set.ownerName && <span>作者 {set.ownerName}</span>}
            <span>{set.itemCount} 题</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!set.isSystem && set.visibility === 'public' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(set.favorited && 'text-amber-600')}
              onClick={() => void handleFavorite()}
            >
              <BookmarkIcon
                data-icon="inline-start"
                className={cn(set.favorited && 'fill-current')}
              />
              {set.favorited ? '已收藏' : '收藏'}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(set.liked && 'text-rose-600')}
            onClick={() => void handleLike()}
          >
            <HeartIcon
              data-icon="inline-start"
              className={cn(set.liked && 'fill-current')}
            />
            {set.likeCount}
          </Button>
          {set.isOwner && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setAddMode('bank')
                  setAddOpen(true)
                }}
              >
                <PlusIcon data-icon="inline-start" />
                加题
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={openEdit}>
                编辑
              </Button>
              {!set.isSystem && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon data-icon="inline-start" />
                  删除
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            题目列表
            {reordering && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                正在保存顺序…
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {items.length === 0
              ? '还没有题目，点「加题」从题库或链接添加。'
              : set.isOwner
                ? '拖动左侧手柄调整顺序；点击题目可打开详情。'
                : '点击题目可打开详情。'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              暂无题目
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {set.isOwner && <TableHead className="w-10" />}
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>题目</TableHead>
                  <TableHead className="w-28">平台</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  {set.isOwner && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow
                    key={it.id || it.problemId}
                    draggable={set.isOwner && !reordering}
                    onDragStart={
                      set.isOwner ? () => onDragStart(idx) : undefined
                    }
                    onDragOver={
                      set.isOwner ? (e) => onDragOver(e, idx) : undefined
                    }
                    onDragLeave={
                      set.isOwner ? () => onDragLeave(idx) : undefined
                    }
                    onDrop={set.isOwner ? () => onDrop(idx) : undefined}
                    onDragEnd={set.isOwner ? onDragEnd : undefined}
                    className={cn(
                      dragOver === idx && 'bg-muted/60',
                      reordering && 'opacity-70',
                    )}
                  >
                    {set.isOwner && (
                      <TableCell className="w-10 px-1">
                        <button
                          type="button"
                          className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
                          aria-label={`拖动调整「${it.title || it.problemId}」顺序`}
                          title="拖动调整顺序"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <GripVerticalIcon className="size-4" />
                        </button>
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/question-bank/detail/${it.problemId}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {it.title || `#${it.problemId}`}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {it.platform || '—'}
                    </TableCell>
                    <TableCell>
                      {it.userStatus ? (
                        <StatusBadge status={it.userStatus} userStatus />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {set.isOwner && (
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() =>
                            requestRemove(
                              it.problemId,
                              it.title || String(it.problemId),
                            )
                          }
                        >
                          剔除
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 加题：链接识别同弹窗二次确认，不另开窗 */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) resetUrlAdd()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>向题单加题</DialogTitle>
            <DialogDescription>
              可从题库搜索，或粘贴链接后点「识别」，在本页确认标题再加入。无法识别时可手写加题。
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={addMode === 'bank' ? 'default' : 'outline'}
              disabled={adding}
              onClick={() => {
                setAddMode('bank')
                resetUrlAdd()
              }}
            >
              从题库
            </Button>
            <Button
              type="button"
              size="sm"
              variant={addMode === 'url' ? 'default' : 'outline'}
              disabled={adding}
              onClick={() => setAddMode('url')}
            >
              <LinkIcon data-icon="inline-start" />
              粘贴链接
            </Button>
          </div>
          {addMode === 'bank' ? (
            <div className="space-y-3">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void searchBank()
                }}
              >
                <Input
                  placeholder="搜索题目标题 / 题号"
                  value={bankQ}
                  onChange={(e) => setBankQ(e.target.value)}
                />
                <Button type="submit" variant="secondary">
                  搜索
                </Button>
              </form>
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {bankHits.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={adding}
                    className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => void handleAddById(p.id)}
                  >
                    <span className="truncate">
                      <span className="text-muted-foreground">
                        [{p.platform}]{' '}
                      </span>
                      {p.title || p.externalId}
                    </span>
                    <PlusIcon className="size-4 shrink-0" />
                  </button>
                ))}
                {bankHits.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    输入关键词搜索题库
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="ps-url">题目链接</FieldLabel>
                  <Input
                    id="ps-url"
                    value={url}
                    disabled={adding || urlPhase === 'confirm'}
                    onChange={(e) => {
                      setUrl(e.target.value)
                      if (urlPhase === 'failed' || urlPhase === 'confirm') {
                        setUrlPhase('idle')
                        setRecognized(null)
                        setUrlFailMsg('')
                      }
                    }}
                    placeholder="https://codeforces.com/contest/… 等"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && urlPhase !== 'confirm') {
                        e.preventDefault()
                        void handleRecognizeUrl()
                      }
                    }}
                  />
                </Field>
              </FieldGroup>
              {urlPhase === 'recognizing' && (
                <p className="text-sm text-muted-foreground">正在识别题目…</p>
              )}
              {urlPhase === 'confirm' && recognized && (
                <div className="rounded-md border bg-muted/40 px-3 py-3 text-sm">
                  <p className="text-muted-foreground">识别结果</p>
                  <p className="mt-1 font-medium">
                    {formatRecognizedProblemLine(recognized)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    请确认是否这道题，再加入题单。
                  </p>
                </div>
              )}
              {urlPhase === 'failed' && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm">
                  <p className="font-medium text-destructive">识别失败</p>
                  <p className="mt-1 text-muted-foreground">
                    {urlFailMsg || '无法识别该链接'}。可手写加题，或改链接后重试。
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {addMode === 'url' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => openManualAdd(url)}
              >
                手写加题
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddOpen(false)
                  resetUrlAdd()
                }}
              >
                取消
              </Button>
              {addMode === 'url' &&
                (urlPhase === 'confirm' ? (
                  <Button
                    type="button"
                    disabled={adding}
                    onClick={() => void confirmRecognizedToSet()}
                  >
                    {adding ? '加入中…' : '确认加入'}
                  </Button>
                ) : urlPhase === 'failed' ? (
                  <Button type="button" onClick={() => openManualAdd(url)}>
                    去手写加题
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={adding}
                    onClick={() => void handleRecognizeUrl()}
                  >
                    {adding ? '识别中…' : '识别'}
                  </Button>
                ))}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑题单</DialogTitle>
            <DialogDescription>
              {set.isSystem
                ? '系统题单仅可修改描述。'
                : '可改标题、描述与可见性。'}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            {!set.isSystem && (
              <Field>
                <FieldLabel>标题</FieldLabel>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={100}
                />
              </Field>
            )}
            <Field>
              <FieldLabel>描述</FieldLabel>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </Field>
            {!set.isSystem && (
              <>
                <Field>
                  <FieldLabel>可见性</FieldLabel>
                  <Select
                    value={editVis}
                    onValueChange={(v) => setEditVis(v as ProblemsetVisibility)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">私有</SelectItem>
                      <SelectItem value="password">需要密码</SelectItem>
                      <SelectItem value="public">公开到广场</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {editVis === 'password' && (
                  <Field>
                    <FieldLabel>新密码（留空则保持原密码）</FieldLabel>
                    <Input
                      type="password"
                      value={editPw}
                      onChange={(e) => setEditPw(e.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>
                )}
              </>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveEdit()}
            >
              {saving ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open && !busyConfirm) setRemoveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>从题单移除？</AlertDialogTitle>
            <AlertDialogDescription>
              确定从题单中移除「{removeTarget?.title || removeTarget?.problemId}」？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyConfirm}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyConfirm}
              onClick={(e) => {
                e.preventDefault()
                void confirmRemove()
              }}
            >
              {busyConfirm ? '处理中…' : '确认移除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !busyConfirm) setDeleteOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除题单？</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除题单「{set.title}」？删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyConfirm}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyConfirm}
              onClick={(e) => {
                e.preventDefault()
                void confirmDeleteSet()
              }}
            >
              {busyConfirm ? '删除中…' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </PageShell>
  )
}
