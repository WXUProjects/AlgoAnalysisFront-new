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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const [renameTarget, setRenameTarget] = useState<{ id: number; name: string } | null>(
    null,
  )
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(
    null,
  )
  const [deleting, setDeleting] = useState(false)

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

  function openRename(id: number, current: string) {
    setRenameTarget({ id, name: current })
    setRenameValue(current)
  }

  async function confirmRename() {
    if (!renameTarget) return
    const next = renameValue.trim()
    if (!next || next === renameTarget.name) {
      setRenameTarget(null)
      return
    }
    setRenaming(true)
    const res = await updateBlogCategory({ id: renameTarget.id, name: next })
    setRenaming(false)
    if (!res.success) {
      toast.error(res.message || '保存失败')
      return
    }
    toast.success('已更新')
    setRenameTarget(null)
    void load()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await deleteBlogCategory(deleteTarget.id)
    setDeleting(false)
    if (!res.success) {
      toast.error(res.message || '删除失败')
      return
    }
    toast.success('已删除')
    setDeleteTarget(null)
    void load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">分类管理</h1>
        <p className="text-sm text-muted-foreground">
          给文章分个类，访客浏览更方便。主站博客会自动进「默认」分类。
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
                  onClick={() => openRename(c.id, c.name)}
                >
                  <PencilIcon data-icon="inline-start" />
                  编辑
                </Button>
                {!c.isDefault ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
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

      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open && !renaming) setRenameTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改分类名称</DialogTitle>
            <DialogDescription>当前：{renameTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-cat">新名称</Label>
            <Input
              id="rename-cat"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmRename()
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={renaming}
              onClick={() => setRenameTarget(null)}
            >
              取消
            </Button>
            <Button disabled={renaming} onClick={() => void confirmRename()}>
              {renaming ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除分类？</AlertDialogTitle>
            <AlertDialogDescription>
              删除分类「{deleteTarget?.name}」？该分类下的文章将不再归属此分类。
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
