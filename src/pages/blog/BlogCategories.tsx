import { useEffect, useState } from 'react'
import { Link, Navigate, useOutletContext } from 'react-router-dom'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  createBlogCategory,
  deleteBlogCategory,
  listMyBlogCategories,
  updateBlogCategory,
} from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogCategory } from '@shared/api'

export function BlogCategoriesPage() {
  const { username, isOwner } = useOutletContext<BlogOutletContext>()
  const { isLogin, ready } = useAuth()
  const [list, setList] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await listMyBlogCategories()
    if (res.success && res.data) setList(res.data)
    setLoading(false)
  }

  useEffect(() => {
    if (isOwner) void load()
  }, [isOwner])

  if (ready && !isLogin) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(`/blog/${username}/manage/categories`)}`}
        replace
      />
    )
  }
  if (ready && isLogin && !isOwner) {
    return <Navigate to={`/blog/${username}`} replace />
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('请输入分类名称')
      return
    }
    setCreating(true)
    const res = await createBlogCategory(name.trim())
    setCreating(false)
    if (!res.success) {
      toast.error(res.message || '创建失败')
      return
    }
    setName('')
    toast.success('已添加')
    void load()
  }

  async function handleRename(id: number, current: string) {
    const next = prompt('新的分类名称', current)
    if (next === null || !next.trim() || next.trim() === current) return
    const res = await updateBlogCategory({ id, name: next.trim() })
    if (!res.success) {
      toast.error(res.message || '保存失败')
      return
    }
    toast.success('已更新')
    void load()
  }

  async function handleDelete(id: number, n: string) {
    if (!confirm(`删除分类「${n}」？该分类下的文章将不再归属此分类。`)) return
    const res = await deleteBlogCategory(id)
    if (!res.success) {
      toast.error(res.message || '删除失败')
      return
    }
    toast.success('已删除')
    void load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">分类管理</h1>
        <p className="text-sm text-muted-foreground">
          给文章分个类，访客浏览更方便。主站题解会自动进「默认」分类。
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex max-w-md gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="新分类名称"
        />
        <Button type="submit" disabled={creating} className="gap-1.5">
          <PlusIcon data-icon="inline-start" />
          添加
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          还没有分类
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {list.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  {c.isDefault ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      默认
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.articleCount ?? 0} 篇
                  {c.isDefault ? ' · 不可删除' : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRename(c.id, c.name)}
                >
                  <PencilIcon data-icon="inline-start" />
                  编辑
                </Button>
                {!c.isDefault ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDelete(c.id, c.name)}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    删除
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" asChild>
        <Link to={`/blog/${username}/manage`}>返回管理</Link>
      </Button>
    </div>
  )
}
