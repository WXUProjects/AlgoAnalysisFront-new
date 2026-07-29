import { useEffect, useState } from 'react'
import { Link, Navigate, useOutletContext } from 'react-router-dom'
import {
  EyeIcon,
  HeartIcon,
  MessageCircleIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { deleteBlogArticle, listMyBlogArticles } from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
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
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useListQueryState } from '@/hooks/use-list-query-state'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogArticle } from '@shared/api'

const visLabel: Record<string, string> = {
  public: '公开',
  private: '不公开',
  password: '密码',
}

const DEFAULT_PAGE_SIZE = 20

export function BlogManage() {
  const { username, isOwner } = useOutletContext<BlogOutletContext>()
  const { isLogin, ready } = useAuth()
  const { page, pageSize, setPage, setPageSize, patch, searchParams } =
    useListQueryState({ defaultPageSize: DEFAULT_PAGE_SIZE })
  const keyword = searchParams.get('keyword') || ''
  const [list, setList] = useState<BlogArticle[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState(keyword)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(
    null,
  )
  const [deleting, setDeleting] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    setQ(keyword)
  }, [keyword])

  useEffect(() => {
    if (!isOwner) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      const res = await listMyBlogArticles({
        page,
        pageSize,
        keyword: keyword || undefined,
      })
      if (cancelled) return
      if (res.success && res.data) {
        setList(res.data.list)
        setTotal(res.data.total)
      } else {
        setList([])
        toast.error(res.message || '加载失败')
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [isOwner, page, pageSize, keyword, reloadTick])

  if (ready && !isLogin) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(`/blog/${username}/manage`)}`}
        replace
      />
    )
  }

  if (ready && isLogin && !isOwner) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
        只有博客主人可以管理文章
        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link to={`/blog/${username}`}>打开博客</Link>
          </Button>
        </div>
      </div>
    )
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await deleteBlogArticle(deleteTarget.id)
    setDeleting(false)
    if (!res.success) {
      toast.error(res.message || '删除失败')
      return
    }
    toast.success('已删除')
    setDeleteTarget(null)
    setReloadTick((n) => n + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">文章管理</h1>
          <p className="text-sm text-muted-foreground">共 {total} 篇</p>
        </div>
        <Button asChild className="gap-1.5">
          <Link to={`/blog/${username}/manage/new`}>
            <PlusIcon className="size-4" />
            写文章
          </Link>
        </Button>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          patch({ keyword: q.trim() || null })
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索我的文章…"
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">
          搜索
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          暂无文章，可点击「写文章」
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {list.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/blog/${username}/manage/edit/${a.id}`}
                  className="font-medium hover:text-primary"
                >
                  {a.title}
                </Link>
                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{visLabel[a.visibility] || a.visibility}</span>
                  {a.recommend && <span>推荐</span>}
                  <span className="inline-flex items-center gap-0.5">
                    <EyeIcon className="size-3" />
                    {a.viewCount ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <HeartIcon className="size-3" />
                    {a.likeCount ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <MessageCircleIcon className="size-3" />
                    {a.commentCount ?? 0}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/blog/${username}/${a.slug}`}>查看</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/blog/${username}/manage/edit/${a.id}`}>编辑</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  onClick={() => setDeleteTarget({ id: a.id, title: a.title })}
                  aria-label="删除"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > 0 ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
        />
      ) : null}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除文章？</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{deleteTarget?.title}」？删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {deleting ? '删除中…' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
