import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BookmarkIcon,
  HeartIcon,
  ListIcon,
  LockIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createProblemset,
  listFavoriteProblemsets,
  listMyProblemsets,
  listSquareProblemsets,
  toggleProblemsetFavorite,
  toggleProblemsetLike,
} from '@/api/problemset'
import { useAuth } from '@/auth/AuthContext'
import {
  prepareSharedElement,
  sharedElementStyle,
} from '@/lib/view-transition'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ProblemsetInfo, ProblemsetVisibility } from '@shared/api'
import { cn } from '@/lib/utils'

const visLabel: Record<string, string> = {
  public: '公开',
  private: '私有',
  password: '需密码',
}

const kindLabel: Record<string, string> = {
  favorites: '收藏',
  todo: '待做',
  custom: '自定义',
}

function SetCard({
  item,
  onLike,
  onFavorite,
  showFavorite,
}: {
  item: ProblemsetInfo
  onLike?: (id: number) => void
  onFavorite?: (id: number) => void
  /** 广场等展示收藏按钮（公开自定义） */
  showFavorite?: boolean
}) {
  const canFavorite =
    showFavorite &&
    !item.isSystem &&
    item.visibility === 'public' &&
    !!onFavorite

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardHeader className="gap-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            className="text-base leading-snug vt-shared"
            style={sharedElementStyle('problemset', item.id)}
          >
            <Link
              to={`/problemset/${item.id}`}
              className="hover:text-primary hover:underline"
              onClick={() => prepareSharedElement('problemset', item.id)}
            >
              {item.title}
            </Link>
          </CardTitle>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {item.isSystem && (
              <Badge variant="secondary">{kindLabel[item.kind] || item.kind}</Badge>
            )}
            {!item.isSystem && (
              <Badge variant="outline">
                {visLabel[item.visibility] || item.visibility}
              </Badge>
            )}
          </div>
        </div>
        {item.ownerName && (
          <CardDescription className="text-xs">
            作者 {item.ownerName}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2 pt-0 text-sm text-muted-foreground">
        <span>{item.itemCount} 题</span>
        <div className="flex items-center gap-1">
          {canFavorite && (
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors',
                item.favorited
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'hover:bg-muted hover:text-foreground',
              )}
              onClick={(e) => {
                e.preventDefault()
                onFavorite?.(item.id)
              }}
              title={item.favorited ? '取消收藏' : '收藏题单'}
            >
              <BookmarkIcon
                className={cn('size-3.5', item.favorited && 'fill-current')}
              />
            </button>
          )}
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors',
              item.liked
                ? 'text-rose-600 dark:text-rose-400'
                : 'hover:bg-muted hover:text-foreground',
            )}
            onClick={(e) => {
              e.preventDefault()
              onLike?.(item.id)
            }}
            disabled={!onLike}
          >
            <HeartIcon
              className={cn('size-3.5', item.liked && 'fill-current')}
            />
            {item.likeCount}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProblemsetHome() {
  const { isLogin, ready } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const tab =
    tabParam === 'square'
      ? 'square'
      : tabParam === 'favorites'
        ? 'favorites'
        : 'mine'

  const [mine, setMine] = useState<ProblemsetInfo[]>([])
  const [favorites, setFavorites] = useState<ProblemsetInfo[]>([])
  const [favTotal, setFavTotal] = useState(0)
  const [favPage, setFavPage] = useState(1)
  const [square, setSquare] = useState<ProblemsetInfo[]>([])
  const [squareTotal, setSquareTotal] = useState(0)
  const [squarePage, setSquarePage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<ProblemsetVisibility>('private')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const loadMine = useCallback(async () => {
    if (!isLogin) {
      setMine([])
      return
    }
    const res = await listMyProblemsets()
    if (res.success && res.data) setMine(res.data)
    else {
      setMine([])
      if (res.message) toast.error(res.message)
    }
  }, [isLogin])

  const loadSquare = useCallback(
    async (page = squarePage, kw = keyword) => {
      const res = await listSquareProblemsets({
        page,
        pageSize: 12,
        keyword: kw || undefined,
      })
      if (res.success && res.data) {
        setSquare(res.data.list)
        setSquareTotal(res.data.total)
        setSquarePage(res.data.page)
      } else {
        setSquare([])
        if (res.message) toast.error(res.message)
      }
    },
    [squarePage, keyword],
  )

  const loadFavorites = useCallback(
    async (page = favPage) => {
      if (!isLogin) {
        setFavorites([])
        setFavTotal(0)
        return
      }
      const res = await listFavoriteProblemsets({ page, pageSize: 12 })
      if (res.success && res.data) {
        setFavorites(res.data.list)
        setFavTotal(res.data.total)
        setFavPage(res.data.page)
      } else {
        setFavorites([])
        if (res.message) toast.error(res.message)
      }
    },
    [isLogin, favPage],
  )

  useEffect(() => {
    if (!ready) return
    setLoading(true)
    void (async () => {
      if (tab === 'mine') await loadMine()
      else if (tab === 'favorites') await loadFavorites(1)
      else await loadSquare(1, keyword)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tab, isLogin])

  async function handleLike(id: number) {
    if (!isLogin) {
      toast.message('登录后即可点赞')
      navigate('/login')
      return
    }
    const res = await toggleProblemsetLike(id)
    if (!res.success || !res.data) {
      toast.error(res.message || '操作失败')
      return
    }
    const patch = (list: ProblemsetInfo[]) =>
      list.map((x) =>
        x.id === id
          ? { ...x, liked: res.data!.liked, likeCount: res.data!.likeCount }
          : x,
      )
    setMine(patch)
    setSquare(patch)
    setFavorites(patch)
  }

  async function handleFavorite(id: number) {
    if (!isLogin) {
      toast.message('登录后即可收藏题单')
      navigate('/login')
      return
    }
    const res = await toggleProblemsetFavorite(id)
    if (!res.success || !res.data) {
      toast.error(res.message || '操作失败')
      return
    }
    const favorited = res.data.favorited
    const patch = (list: ProblemsetInfo[]) =>
      list.map((x) => (x.id === id ? { ...x, favorited } : x))
    setMine(patch)
    setSquare(patch)
    if (!favorited) {
      // 取消收藏：从「我的收藏」列表移除
      setFavorites((list) => list.filter((x) => x.id !== id))
      setFavTotal((n) => Math.max(0, n - 1))
    } else {
      setFavorites(patch)
    }
    toast.success(favorited ? '已收藏' : '已取消收藏')
  }

  async function handleCreate() {
    const t = title.trim()
    if (!t) {
      toast.error('请填写题单标题')
      return
    }
    if (visibility === 'password' && !password.trim()) {
      toast.error('请设置访问密码')
      return
    }
    setSaving(true)
    const res = await createProblemset({
      title: t,
      description: description.trim(),
      visibility,
      password: visibility === 'password' ? password : undefined,
    })
    setSaving(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '创建失败')
      return
    }
    toast.success('题单已创建')
    setCreateOpen(false)
    setTitle('')
    setDescription('')
    setPassword('')
    setVisibility('private')
    navigate(`/problemset/${res.data.id}`)
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">题单</h2>
          <p className="text-sm text-muted-foreground">
            待做与自建题单；可收藏他人公开题单；公开题单会出现在广场。
          </p>
        </div>
        {isLogin && (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            新建题单
          </Button>
        )}
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params)
          if (v === 'square') next.set('tab', 'square')
          else if (v === 'favorites') next.set('tab', 'favorites')
          else next.delete('tab')
          setParams(next, { replace: true })
        }}
      >
        <TabsList>
          <TabsTrigger value="mine">
            <StarIcon />
            我的
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <BookmarkIcon />
            我的收藏
          </TabsTrigger>
          <TabsTrigger value="square">
            <ListIcon />
            广场
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          {!isLogin ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                <p>登录后可查看收藏题目、待做和自建题单</p>
                <Button asChild>
                  <Link to="/login">去登录</Link>
                </Button>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : mine.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                暂无题单，可点右上角新建
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((item) => (
                <SetCard key={item.id} item={item} onLike={handleLike} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-4 space-y-4">
          {!isLogin ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                <p>登录后可收藏他人公开题单</p>
                <Button asChild>
                  <Link to="/login">去登录</Link>
                </Button>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                <p>还没有收藏别人的题单，去广场看看</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const next = new URLSearchParams(params)
                    next.set('tab', 'square')
                    setParams(next, { replace: true })
                  }}
                >
                  去广场
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((item) => (
                  <SetCard
                    key={item.id}
                    item={item}
                    onLike={handleLike}
                    onFavorite={handleFavorite}
                    showFavorite
                  />
                ))}
              </div>
              {favTotal > 12 && (
                <Pagination
                  page={favPage}
                  pageSize={12}
                  total={favTotal}
                  onChange={(p) => {
                    void loadFavorites(p)
                  }}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="square" className="mt-4 space-y-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setKeyword(q)
              void loadSquare(1, q)
            }}
          >
            <div className="relative min-w-[12rem] flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="搜索题单标题或描述"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              搜索
            </Button>
          </form>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : square.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                暂无公开题单
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {square.map((item) => (
                  <SetCard
                    key={item.id}
                    item={item}
                    onLike={handleLike}
                    onFavorite={handleFavorite}
                    showFavorite
                  />
                ))}
              </div>
              <Pagination
                page={squarePage}
                pageSize={12}
                total={squareTotal}
                onChange={(p) => {
                  setSquarePage(p)
                  void loadSquare(p, keyword)
                }}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建题单</DialogTitle>
            <DialogDescription>
              可选私有、密码或公开。系统会创建收藏与待做题单。
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ps-title">标题</FieldLabel>
              <Input
                id="ps-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：暑假专项练习"
                maxLength={100}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ps-desc">描述（可选）</FieldLabel>
              <Textarea
                id="ps-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单写写这套题的用途或说明"
                rows={3}
              />
            </Field>
            <Field>
              <FieldLabel>可见性</FieldLabel>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as ProblemsetVisibility)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">私有（仅自己）</SelectItem>
                  <SelectItem value="password">需要密码</SelectItem>
                  <SelectItem value="public">公开到广场</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {visibility === 'password' && (
              <Field>
                <FieldLabel htmlFor="ps-pw">
                  <LockIcon className="mr-1 inline size-3.5" />
                  访问密码
                </FieldLabel>
                <Input
                  id="ps-pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="他人打开时需要输入"
                  autoComplete="new-password"
                />
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              取消
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleCreate()}>
              {saving ? '创建中…' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
