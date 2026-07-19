import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BookmarkIcon,
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
  toggleProblemsetFavorite,
  toggleProblemsetLike,
  unlockProblemset,
  updateProblemset,
} from '@/api/problemset'
import { listProblems } from '@/api/problem'
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
import type { ProblemInfo, ProblemsetInfo, ProblemsetVisibility } from '@shared/api'
import { useDocumentMeta } from '@/hooks/use-document-meta'
import { clipMetaText } from '@/lib/document-meta'
import { cn } from '@/lib/utils'
import { sharedElementStyle } from '@/lib/view-transition'

const unlockKey = (id: string | number) => `ps_unlock_${id}`

const visLabel: Record<string, string> = {
  public: '公开',
  private: '私有',
  password: '需密码',
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
  const [manualPromptOpen, setManualPromptOpen] = useState(false)
  const [pendingManualUrl, setPendingManualUrl] = useState('')

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

  async function handleAddByUrl() {
    if (!set || !url.trim()) {
      toast.error('请粘贴题目链接')
      return
    }
    setAdding(true)
    const res = await addProblemToSet({
      problemsetId: set.id,
      url: url.trim(),
    })
    setAdding(false)
    if (!res.success) {
      if (res.code === 'URL_PARSE_FAILED') {
        setPendingManualUrl(url.trim())
        setManualPromptOpen(true)
        setAddOpen(false)
        return
      }
      toast.error(res.message || '无法识别该链接')
      return
    }
    toast.success(
      res.data?.fetchTriggered
        ? '已加入，正在后台拉取题面'
        : '已加入题单',
    )
    setUrl('')
    setAddOpen(false)
    void load()
  }

  function goManualAdd() {
    if (!set) return
    const q = pendingManualUrl
      ? `?url=${encodeURIComponent(pendingManualUrl)}`
      : ''
    setManualPromptOpen(false)
    navigate(`/problemset/${set.id}/add-problem${q}`)
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
          <h2
            className="text-lg font-semibold vt-shared"
            style={sharedElementStyle('problemset', set.id)}
          >
            {set.title}
          </h2>
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
          <CardTitle className="text-base">题目列表</CardTitle>
          <CardDescription>
            {items.length === 0
              ? '还没有题目，点「加题」从题库或链接添加。'
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
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>题目</TableHead>
                  <TableHead className="w-28">平台</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  {set.isOwner && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={it.id || it.problemId}>
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

      {/* 加题 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>向题单加题</DialogTitle>
            <DialogDescription>
              可从题库搜索，或粘贴常见 OJ 题目链接。未入库题面会自动拉取；是否做标签分析取决于你的 AI
              权限。链接无法识别时可手动加入题库。
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={addMode === 'bank' ? 'default' : 'outline'}
              onClick={() => setAddMode('bank')}
            >
              从题库
            </Button>
            <Button
              type="button"
              size="sm"
              variant={addMode === 'url' ? 'default' : 'outline'}
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
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="ps-url">题目链接</FieldLabel>
                <Input
                  id="ps-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://codeforces.com/contest/… 等"
                />
              </Field>
            </FieldGroup>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              取消
            </Button>
            {addMode === 'url' && (
              <Button
                type="button"
                disabled={adding}
                onClick={() => void handleAddByUrl()}
              >
                {adding ? '处理中…' : '加入'}
              </Button>
            )}
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

      <AlertDialog
        open={manualPromptOpen}
        onOpenChange={(open) => {
          if (!open) {
            setManualPromptOpen(false)
            setPendingManualUrl('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>无法识别该链接</AlertDialogTitle>
            <AlertDialogDescription>
              系统无法从该链接识别题目。是否向题库手动加题？填写标题后发布，会加入当前题单。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                goManualAdd()
              }}
            >
              向题库加题
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
