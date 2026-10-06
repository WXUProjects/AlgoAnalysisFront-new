import { useEffect, useState } from 'react'
import { Link, Navigate, useOutletContext } from 'react-router-dom'
import { ExternalLinkIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteBlogStaticSite,
  getBlogImageUploadStatus,
  listMyBlogStaticSites,
  updateBlogStaticSite,
} from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { ImageUploadApplyBanner } from '@/components/image-upload-apply-banner'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { jwt } from '@/lib/jwt'
import { BLOG_NEW_TAB_PROPS } from '@/lib/blog-nav'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import { endpoints, type BlogStaticSite } from '@shared/api'

type Draft = {
  title: string
  slug: string
  entry: string
  showInNav: boolean
  navLabel: string
  file: File | null
}

const emptyDraft = (): Draft => ({
  title: '',
  slug: '',
  entry: '',
  showInNav: false,
  navLabel: '',
  file: null,
})

export function BlogStaticSitesPage() {
  const { username, isOwner } = useOutletContext<BlogOutletContext>()
  const { isLogin, ready } = useAuth()
  const [list, setList] = useState<BlogStaticSite[]>([])
  const [loading, setLoading] = useState(true)
  const [canUpload, setCanUpload] = useState(false)
  const [pendingRequest, setPendingRequest] = useState(false)
  const [statusReady, setStatusReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [replaceId, setReplaceId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [editTarget, setEditTarget] = useState<BlogStaticSite | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BlogStaticSite | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    const [sites, status] = await Promise.all([
      listMyBlogStaticSites(),
      getBlogImageUploadStatus(),
    ])
    if (sites.success && sites.data) setList(sites.data)
    setCanUpload(Boolean(status.data?.enabled))
    setPendingRequest(Boolean(status.data?.pendingRequest))
    setStatusReady(true)
    setLoading(false)
  }

  useEffect(() => {
    if (isOwner) void load()
  }, [isOwner])

  if (ready && !isLogin) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(`/blog/${username}/manage/static`)}`}
        replace
      />
    )
  }
  if (ready && isLogin && !isOwner) {
    return <Navigate to={`/blog/${username}`} replace />
  }

  function openCreate() {
    setReplaceId(null)
    setDraft(emptyDraft())
    setOpen(true)
  }

  function openReplace(site: BlogStaticSite) {
    setReplaceId(site.id)
    setDraft({
      title: site.title,
      slug: site.slug,
      entry: site.entry === 'index.html' ? '' : site.entry,
      showInNav: site.showInNav,
      navLabel: site.navLabel === site.title ? '' : site.navLabel,
      file: null,
    })
    setOpen(true)
  }

  async function submitUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.title.trim() || !draft.slug.trim()) {
      toast.error('请填写名称和访问路径')
      return
    }
    if (!draft.file) {
      toast.error('请选择 zip 压缩包')
      return
    }
    if (!draft.file.name.toLowerCase().endsWith('.zip')) {
      toast.error('请上传 zip 压缩包')
      return
    }
    setSaving(true)
    const form = new FormData()
    form.append('file', draft.file)
    form.append('title', draft.title.trim())
    form.append('slug', draft.slug.trim().toLowerCase())
    if (draft.entry.trim()) form.append('entry', draft.entry.trim())
    form.append('showInNav', draft.showInNav ? 'true' : 'false')
    if (draft.navLabel.trim()) form.append('navLabel', draft.navLabel.trim())
    if (replaceId) form.append('id', String(replaceId))
    const headers: Record<string, string> = {}
    if (jwt.isValid()) headers.Authorization = `Bearer ${jwt.token}`
    let ok = false
    let message = '上传失败'
    try {
      const res = await fetch(endpoints.user.blog.staticSiteUpload, {
        method: 'POST',
        headers,
        body: form,
      })
      const body = (await res.json()) as { code?: number; message?: string }
      ok = res.ok && (body.code === 0 || body.code === undefined)
      message = body.message || message
    } catch {
      ok = false
    }
    setSaving(false)
    if (!ok) {
      toast.error(message)
      return
    }
    toast.success(replaceId ? '已更新' : '已添加')
    setOpen(false)
    void load()
  }

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setSaving(true)
    const res = await updateBlogStaticSite({
      id: editTarget.id,
      title: editTarget.title.trim(),
      slug: editTarget.slug.trim().toLowerCase(),
      showInNav: editTarget.showInNav,
      navLabel: editTarget.navLabel.trim(),
      navOrder: editTarget.navOrder,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '没保存上')
      return
    }
    toast.success('已保存')
    setEditTarget(null)
    void load()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await deleteBlogStaticSite(deleteTarget.id)
    setDeleting(false)
    if (!res.success) {
      toast.error(res.message || '没删掉')
      return
    }
    toast.success('已删除')
    setDeleteTarget(null)
    void load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">静态页</h1>
        <Button size="sm" onClick={openCreate} disabled={!canUpload}>
          <PlusIcon data-icon="inline-start" />
          添加
        </Button>
      </div>

      {statusReady && !canUpload ? (
        <ImageUploadApplyBanner
          enabled={false}
          pendingRequest={pendingRequest}
          onPendingChange={setPendingRequest}
        />
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          还没有静态页
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((site) => (
            <li
              key={site.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{site.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /blog/{username}/static/{site.slug}/
                  {site.showInNav ? ' · 已在导航' : ''}
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <a href={site.publicPath} {...BLOG_NEW_TAB_PROPS}>
                  <ExternalLinkIcon data-icon="inline-start" />
                  打开
                </a>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditTarget(site)}>
                <PencilIcon data-icon="inline-start" />
                设置
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openReplace(site)} disabled={!canUpload}>
                替换
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(site)}
              >
                <Trash2Icon data-icon="inline-start" />
                删除
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{replaceId ? '替换静态页' : '添加静态页'}</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={submitUpload}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="static-title">名称</Label>
              <Input
                id="static-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="static-slug">访问路径</Label>
              <Input
                id="static-slug"
                value={draft.slug}
                placeholder="hello"
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                /blog/{username}/static/{draft.slug || '…'}/
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="static-entry">入口文件</Label>
              <Input
                id="static-entry"
                value={draft.entry}
                placeholder="index.html"
                onChange={(e) => setDraft({ ...draft, entry: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="static-zip">压缩包</Label>
              <Input
                id="static-zip"
                type="file"
                accept=".zip,application/zip"
                onChange={(e) =>
                  setDraft({ ...draft, file: e.target.files?.[0] ?? null })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="static-pin">放到博客导航</Label>
              <Switch
                id="static-pin"
                checked={draft.showInNav}
                onCheckedChange={(v) => setDraft({ ...draft, showInNav: v })}
              />
            </div>
            {draft.showInNav ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="static-nav">导航名称</Label>
                <Input
                  id="static-nav"
                  value={draft.navLabel}
                  placeholder="留空则用名称"
                  onChange={(e) => setDraft({ ...draft, navLabel: e.target.value })}
                />
              </div>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner data-icon="inline-start" /> : null}
                上传
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editTarget)} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>静态页设置</DialogTitle>
          </DialogHeader>
          {editTarget ? (
            <form className="flex flex-col gap-4" onSubmit={saveMeta}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-title">名称</Label>
                <Input
                  id="edit-title"
                  value={editTarget.title}
                  onChange={(e) =>
                    setEditTarget({ ...editTarget, title: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-slug">访问路径</Label>
                <Input
                  id="edit-slug"
                  value={editTarget.slug}
                  onChange={(e) =>
                    setEditTarget({ ...editTarget, slug: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="edit-pin">放到博客导航</Label>
                <Switch
                  id="edit-pin"
                  checked={editTarget.showInNav}
                  onCheckedChange={(v) =>
                    setEditTarget({ ...editTarget, showInNav: v })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-nav">导航名称</Label>
                <Input
                  id="edit-nav"
                  value={editTarget.navLabel}
                  onChange={(e) =>
                    setEditTarget({ ...editTarget, navLabel: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  保存
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这个静态页？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title} 将从列表和导航中移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} disabled={deleting}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-xs text-muted-foreground">
        需要图片上传权限。压缩包请包含 html，默认识别 index.html。
        <Link to={`/blog/${username}`} className="ml-1 underline">
          返回博客
        </Link>
      </p>
    </div>
  )
}
