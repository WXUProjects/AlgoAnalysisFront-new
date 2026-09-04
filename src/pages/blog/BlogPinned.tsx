import { useEffect, useRef, useState } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  PinIcon,
  PinOffIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  listMyBlogArticles,
  listMyPinnedBlogArticles,
  reorderPinnedBlogArticles,
  setBlogArticlePinned,
} from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import { cn } from '@/lib/utils'
import type { BlogArticle } from '@shared/api'

const PAGE_SIZE = 10

const visibilityLabel: Record<string, string> = {
  public: '公开',
  password: '密码',
  private: '不公开',
}

export function movePinnedArticle(
  list: BlogArticle[],
  from: number,
  to: number,
): BlogArticle[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list
  }
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function canPinBlogArticle(article: BlogArticle): boolean {
  return article.visibility === 'public' || article.visibility === 'password'
}

function formatPinnedAt(value?: number) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value * 1000))
}

export function BlogPinnedPage() {
  const { username, isOwner } = useOutletContext<BlogOutletContext>()
  const { isLogin, ready } = useAuth()
  const [pinned, setPinned] = useState<BlogArticle[]>([])
  const [articles, setArticles] = useState<BlogArticle[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loadingPinned, setLoadingPinned] = useState(true)
  const [loadingArticles, setLoadingArticles] = useState(true)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [reordering, setReordering] = useState(false)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const dragFrom = useRef<number | null>(null)
  const pinnedLoadId = useRef(0)

  async function refreshPinned() {
    const loadId = ++pinnedLoadId.current
    setLoadingPinned(true)
    const res = await listMyPinnedBlogArticles()
    if (loadId !== pinnedLoadId.current) return
    if (res.success && res.data) {
      setPinned(res.data)
    } else {
      toast.error(res.message || '没加载出来')
    }
    setLoadingPinned(false)
  }

  useEffect(() => {
    if (!isOwner) return
    void refreshPinned()
  }, [isOwner])

  useEffect(() => {
    if (!isOwner) return
    let cancelled = false
    void (async () => {
      setLoadingArticles(true)
      const res = await listMyBlogArticles({
        page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
      })
      if (cancelled) return
      if (res.success && res.data) {
        setArticles(res.data.list)
        setTotal(res.data.total)
      } else {
        setArticles([])
        toast.error(res.message || '没加载出来')
      }
      setLoadingArticles(false)
    })()
    return () => {
      cancelled = true
    }
  }, [isOwner, keyword, page])

  if (ready && !isLogin) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(`/blog/${username}/manage/pinned`)}`}
        replace
      />
    )
  }

  if (ready && isLogin && !isOwner) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>无法管理这个博客</EmptyTitle>
          <EmptyDescription>只有博客主人可以调整置顶文章。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  async function togglePinned(article: BlogArticle, value: boolean) {
    setPendingId(article.id)
    const res = await setBlogArticlePinned(article.id, value)
    if (!res.success) {
      setPendingId(null)
      toast.error(res.message || (value ? '置顶失败' : '取消失败'))
      return
    }
    toast.success(value ? '已置顶' : '已取消置顶')
    await refreshPinned()
    setPendingId(null)
  }

  async function commitOrder(next: BlogArticle[], previous: BlogArticle[]) {
    pinnedLoadId.current += 1
    setPinned(next)
    setLoadingPinned(false)
    setReordering(true)
    const res = await reorderPinnedBlogArticles(next.map((article) => article.id))
    setReordering(false)
    if (!res.success) {
      setPinned(previous)
      toast.error(res.message || '顺序保存失败')
    }
  }

  function move(from: number, to: number) {
    if (pendingId !== null || reordering || from === to || to < 0 || to >= pinned.length) return
    const previous = pinned
    const next = movePinnedArticle(previous, from, to)
    void commitOrder(next, previous)
  }

  const pinnedIds = new Set(pinned.map((article) => article.id))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">文章置顶</h1>
          <p className="text-sm text-muted-foreground">拖动文章调整博客首页顺序</p>
        </div>
        <Badge variant="secondary">已置顶 {pinned.length} 篇</Badge>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>置顶文章</CardTitle>
            <CardDescription>拖放或使用箭头调整，修改后自动保存。</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {loadingPinned ? (
              <div className="flex flex-col gap-3 px-6 pb-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : pinned.length === 0 ? (
              <Empty>
                <EmptyMedia variant="icon"><PinIcon /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>还没有置顶文章</EmptyTitle>
                  <EmptyDescription>从文章列表中选择要放在博客首页前面的文章。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ol className={cn('divide-y', reordering && 'opacity-70')}>
                {pinned.map((article, index) => (
                  <li
                    key={article.id}
                    draggable={pendingId === null && !reordering}
                    onDragStart={() => {
                      dragFrom.current = index
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      setDragOver(index)
                    }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(event) => {
                      event.preventDefault()
                      const from = dragFrom.current
                      dragFrom.current = null
                      setDragOver(null)
                      if (from !== null) move(from, index)
                    }}
                    onDragEnd={() => {
                      dragFrom.current = null
                      setDragOver(null)
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 transition-colors',
                      dragOver === index && 'bg-muted',
                    )}
                  >
                    <span className="flex size-8 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing">
                      <GripVerticalIcon />
                    </span>
                    <span className="w-6 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{article.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{visibilityLabel[article.visibility] || article.visibility}</Badge>
                        {article.pinnedAt ? <span>{formatPinnedAt(article.pinnedAt)}置顶</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={pendingId !== null || reordering || index === 0}
                        onClick={() => move(index, index - 1)}
                        aria-label={`上移「${article.title}」`}
                      ><ArrowUpIcon /></Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={pendingId !== null || reordering || index === pinned.length - 1}
                        onClick={() => move(index, index + 1)}
                        aria-label={`下移「${article.title}」`}
                      ><ArrowDownIcon /></Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={pendingId !== null || reordering}
                        onClick={() => void togglePinned(article, false)}
                        aria-label={`取消置顶「${article.title}」`}
                      ><PinOffIcon /></Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>添加文章</CardTitle>
            <CardDescription>公开和密码文章可以置顶。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                setPage(1)
                setKeyword(query.trim())
              }}
            >
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索文章…"
              />
              <Button type="submit" variant="secondary">搜索</Button>
            </form>

            {loadingArticles ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>没有找到文章</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y rounded-lg border">
                {articles.map((article) => {
                  const eligible = canPinBlogArticle(article)
                  const isPinned = pinnedIds.has(article.id)
                  return (
                    <li key={article.id} className="flex items-center gap-3 px-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{article.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline">{visibilityLabel[article.visibility] || article.visibility}</Badge>
                          {!eligible ? <span className="text-xs text-muted-foreground">不可置顶</span> : null}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!eligible || isPinned || pendingId !== null || reordering}
                        onClick={() => void togglePinned(article, true)}
                      >
                        <PinIcon data-icon="inline-start" />
                        {isPinned ? '已置顶' : '置顶'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}

            {total > PAGE_SIZE ? (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onChange={setPage}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
