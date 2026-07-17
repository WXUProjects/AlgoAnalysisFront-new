import { useEffect, useState } from 'react'
import { Link, Navigate, useOutletContext } from 'react-router-dom'
import { getBlogAnalytics } from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogAnalytics as Analytics } from '@shared/api'

export function BlogAnalyticsPage() {
  const { username, isOwner } = useOutletContext<BlogOutletContext>()
  const { isLogin, ready } = useAuth()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOwner) return
    void getBlogAnalytics().then((res) => {
      if (res.success && res.data) setData(res.data)
      setLoading(false)
    })
  }, [isOwner])

  if (ready && !isLogin) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(`/blog/${username}/manage/analytics`)}`}
        replace
      />
    )
  }
  if (ready && isLogin && !isOwner) {
    return <Navigate to={`/blog/${username}`} replace />
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-6" />
      </div>
    )
  }

  const cards = [
    { label: '文章数', value: data?.totalArticles ?? 0 },
    { label: '总阅读', value: data?.totalViews ?? 0 },
    { label: '总点赞', value: data?.totalLikes ?? 0 },
    { label: '总评论', value: data?.totalComments ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">数据概览</h1>
        <p className="text-sm text-muted-foreground">
          阅读、点赞与评论的基础统计
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {c.value}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3 font-medium">阅读最多的文章</div>
        <ul className="divide-y">
          {(data?.topArticles || []).length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              暂无数据
            </li>
          ) : (
            data!.topArticles.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <Link
                  to={`/blog/${username}/${a.slug}`}
                  className="font-medium hover:text-primary"
                >
                  {a.title}
                </Link>
                <span className="text-muted-foreground">
                  {a.viewCount} 阅读 · {a.likeCount} 赞 · {a.commentCount} 评
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
      <Button variant="outline" asChild>
        <Link to={`/blog/${username}/manage`}>返回管理</Link>
      </Button>
    </div>
  )
}
