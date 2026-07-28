import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { Maximize2Icon, Minimize2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  createBlogArticle,
  getBlogArticle,
  getBlogImageUploadStatus,
  listMyBlogCategories,
  updateBlogArticle,
} from '@/api/blog'
import { uploadImage } from '@/api/upload'
import { useAuth } from '@/auth/AuthContext'
import {
  BlogImagePanel,
  type UploadProgressItem,
} from '@/components/blog-image-panel'
import { MarkdownEditor } from '@/components/markdown-editor'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  BLOG_IMAGE_UPLOAD_ENABLED_HINT,
  BLOG_IMAGE_UPLOAD_HINT,
  extractMarkdownImageUrls,
  isAllowedBlogImageUrl,
  type BlogSessionImage,
} from '@/lib/blog-image'
import {
  isDefaultSummary,
  resolveSummaryForSave,
} from '@/lib/blog-summary'
import { cn } from '@/lib/utils'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogCategory, BlogVisibility } from '@shared/api'

export function BlogEditor() {
  const { username, isOwner } = useOutletContext<BlogOutletContext>()
  const { id: idParam } = useParams()
  const editId = idParam ? Number(idParam) : 0
  const isNew = !editId
  const { isLogin, ready } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [visibility, setVisibility] = useState<BlogVisibility>('public')
  const [password, setPassword] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [imageUploadEnabled, setImageUploadEnabled] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [sessionImages, setSessionImages] = useState<BlogSessionImage[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem[]>([])
  const insertFnRef = useRef<((text: string) => void) | null>(null)

  useEffect(() => {
    void listMyBlogCategories().then((res) => {
      if (res.data) setCategories(res.data)
    })
    void getBlogImageUploadStatus().then((res) => {
      if (res.success && res.data) setImageUploadEnabled(res.data.enabled)
    })
  }, [])

  // 无分类时回落到「默认」分类
  useEffect(() => {
    if (categoryId || !categories.length) return
    if (!isNew && loading) return
    const def = categories.find((c) => c.isDefault) || categories[0]
    if (def) setCategoryId(String(def.id))
  }, [categories, categoryId, isNew, loading])

  useEffect(() => {
    if (isNew || !isOwner) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await getBlogArticle({ id: editId })
      if (cancelled) return
      if (!res.success || !res.data) {
        toast.error(res.message || '加载失败')
        setLoading(false)
        return
      }
      const a = res.data
      setTitle(a.title)
      setSlug(a.slug)
      // 系统默认摘要不回填编辑框；保存时会按正文重新生成
      const body = a.content || ''
      const sum = a.summary || ''
      setSummary(isDefaultSummary(sum, body) ? '' : sum)
      setContent(body)
      setCoverUrl(a.coverUrl || '')
      setVisibility((a.visibility as BlogVisibility) || 'public')
      setCategoryId(a.categoryId ? String(a.categoryId) : '')
      // 种子：已有正文中的图
      const urls = extractMarkdownImageUrls(body, a.coverUrl || '')
      setSessionImages(
        urls.map((url, i) => ({
          id: `seed-${i}-${url.slice(-24)}`,
          url,
          name: `图片 ${i + 1}`,
          fromUpload: false,
        })),
      )
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [editId, isNew, isOwner])

  // 正文里新出现的外链图也并入图片库
  useEffect(() => {
    const urls = extractMarkdownImageUrls(content, coverUrl)
    if (!urls.length) return
    setSessionImages((prev) => {
      const have = new Set(prev.map((p) => p.url))
      const extra: BlogSessionImage[] = []
      for (const url of urls) {
        if (have.has(url)) continue
        extra.push({
          id: `auto-${url.slice(-32)}-${extra.length}`,
          url,
          name: '图片',
          fromUpload: false,
        })
      }
      return extra.length ? [...prev, ...extra] : prev
    })
  }, [content, coverUrl])

  // 全屏时锁 body 滚动
  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [fullscreen])

  const handleImageUploaded = useCallback((img: BlogSessionImage) => {
    setSessionImages((prev) => {
      if (prev.some((p) => p.url === img.url)) return prev
      return [...prev, img]
    })
  }, [])

  const handleRegisterInsert = useCallback((fn: (text: string) => void) => {
    insertFnRef.current = fn
  }, [])

  const handleInsertFromLibrary = useCallback((md: string) => {
    if (insertFnRef.current) {
      insertFnRef.current(md)
      return
    }
    setContent((c) => {
      const needNl = c.length > 0 && !c.endsWith('\n') ? '\n' : ''
      return c + needNl + md
    })
  }, [])

  if (ready && !isLogin) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(
          isNew
            ? `/blog/${username}/manage/new`
            : `/blog/${username}/manage/edit/${editId}`,
        )}`}
        replace
      />
    )
  }

  if (ready && isLogin && !isOwner) {
    return <Navigate to={`/blog/${username}`} replace />
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error('请填写标题')
      return
    }
    if (!content.trim()) {
      toast.error('请填写正文')
      return
    }
    if (coverUrl && !isAllowedBlogImageUrl(coverUrl)) {
      toast.error(BLOG_IMAGE_UPLOAD_HINT)
      return
    }
    if (visibility === 'password' && isNew && !password.trim()) {
      toast.error('密码访问需要设置密码')
      return
    }
    setSaving(true)
    const body = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      // 空摘要 → 后端 / resolve 生成默认简述
      summary: resolveSummaryForSave(summary, content),
      content,
      coverUrl: coverUrl.trim(),
      visibility,
      password: password.trim() || undefined,
      clearPassword: visibility !== 'password',
      categoryId: Number(categoryId) || null,
    }
    const res = isNew
      ? await createBlogArticle(body)
      : await updateBlogArticle({ ...body, id: editId })
    setSaving(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '保存失败')
      return
    }
    toast.success(
      isNew
        ? '已发布'
        : '已保存；未使用的图片将自动清理',
    )
    setFullscreen(false)
    navigate(`/blog/${username}/${res.data.slug}`)
  }

  const imagePanel = (
    <BlogImagePanel
      images={sessionImages}
      content={content}
      coverUrl={coverUrl}
      uploads={uploadProgress}
      onInsert={handleInsertFromLibrary}
      collapsible
      defaultOpen={!fullscreen}
      forceShow={imageUploadEnabled || fullscreen}
      compact={fullscreen}
    />
  )

  const editorBlock = useMemo(
    () => (
      <MarkdownEditor
        value={content}
        onChange={setContent}
        fullPage={fullscreen}
        minHeight={
          fullscreen
            ? undefined
            : Math.min(
                typeof window !== 'undefined'
                  ? Math.round(window.innerHeight * 0.72)
                  : 720,
                880,
              )
        }
        linkOnlyImages
        imageUploadEnabled={imageUploadEnabled}
        resizableImages
        previewLightbox={false}
        showFullscreenToggle
        fullscreen={fullscreen}
        onFullscreenChange={setFullscreen}
        onImageUploaded={handleImageUploaded}
        onUploadProgressChange={setUploadProgress}
        onRegisterInsert={handleRegisterInsert}
        placeholder={
          imageUploadEnabled
            ? '开始写作…\n\n支持标题、列表、代码块、表格与 $公式$\n可粘贴/多选上传图片；鼠标移到预览图可设对齐/百分比/定宽\n工具栏可全屏编辑 · 未使用图片保存后自动清理'
            : '开始写作…\n\n支持标题、列表、代码块、表格与 $公式$\n图片：![说明|50%|center](https://…)\n预览图悬停可调对齐与大小'
        }
      />
    ),
    [
      content,
      fullscreen,
      imageUploadEnabled,
      handleImageUploaded,
      handleRegisterInsert,
    ],
  )

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {title.trim() || (isNew ? '写文章' : '编辑文章')}
            </p>
            <p className="text-xs text-muted-foreground">
              全屏编辑 · Esc 退出 · 预览悬停调图 · 底部可展开图片库
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFullscreen(false)}
            >
              <Minimize2Icon data-icon="inline-start" />
              退出全屏
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? '保存中…' : isNew ? '发布' : '保存'}
            </Button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3">
          <div className="min-h-0 flex-1">{editorBlock}</div>
          <div className="shrink-0 max-h-[40vh] overflow-y-auto">
            {imagePanel}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {isNew ? '写文章' : '编辑文章'}
          </h1>
          <p className="text-sm text-muted-foreground">
            支持 Markdown · 可全屏 · 预览可调图宽 ·{' '}
            {imageUploadEnabled
              ? '可上传/粘贴图片'
              : '图片请用外链（未开通上传）'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFullscreen(true)}
          >
            <Maximize2Icon data-icon="inline-start" />
            全屏编辑
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/blog/${username}/manage`}>返回列表</Link>
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? '保存中…' : isNew ? '发布' : '保存'}
          </Button>
        </div>
      </div>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel>标题</FieldLabel>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
          />
        </Field>
        <Field>
          <FieldLabel>短链（可选）</FieldLabel>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="自动根据标题生成"
          />
        </Field>
        <Field>
          <FieldLabel>分类</FieldLabel>
          <Select
            value={categoryId || undefined}
            onValueChange={setCategoryId}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                  {c.isDefault ? '（默认）' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>摘要（可选）</FieldLabel>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            placeholder="不填则保存时按正文自动生成列表简介"
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>头图（可选）</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://…"
              className="min-w-[12rem] flex-1"
            />
            {imageUploadEnabled ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={coverUploading}
                asChild
              >
                <label className="cursor-pointer">
                  {coverUploading ? '上传中…' : '上传头图'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (!f) return
                      setCoverUploading(true)
                      const res = await uploadImage(f, 'blog_cover')
                      setCoverUploading(false)
                      if (!res.success || !res.data?.url) {
                        toast.error(res.message || '头图上传失败')
                        return
                      }
                      setCoverUrl(res.data.url)
                      handleImageUploaded({
                        id: `cover-${Date.now()}`,
                        url: res.data.url,
                        name: '头图',
                        fromUpload: true,
                      })
                      toast.success('头图已上传')
                    }}
                  />
                </label>
              </Button>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {imageUploadEnabled
              ? BLOG_IMAGE_UPLOAD_ENABLED_HINT
              : BLOG_IMAGE_UPLOAD_HINT}
          </p>
        </Field>
        <Field>
          <FieldLabel>可见性</FieldLabel>
          <Select
            value={visibility}
            onValueChange={(v) => setVisibility(v as BlogVisibility)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">公开</SelectItem>
              <SelectItem value="private">不公开（仅自己）</SelectItem>
              <SelectItem value="password">密码访问</SelectItem>
            </SelectContent>
          </Select>
          {visibility === 'public' && (
            <p className="mt-1 text-xs text-muted-foreground">
              公开文章会自动出现在博客广场与你所在组织的发现推荐中
            </p>
          )}
        </Field>
        {visibility === 'password' && (
          <Field>
            <FieldLabel>
              {isNew ? '访问密码' : '访问密码（留空则保持原密码）'}
            </FieldLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        )}
      </FieldGroup>

      <div className={cn('min-h-[min(72vh,880px)]')}>{editorBlock}</div>

      {imageUploadEnabled || sessionImages.length > 0 || uploadProgress.length > 0
        ? imagePanel
        : null}

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to={`/blog/${username}/manage`}>取消</Link>
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? '保存中…' : isNew ? '发布' : '保存'}
        </Button>
      </div>
    </div>
  )
}
