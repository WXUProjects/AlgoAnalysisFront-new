import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { ChevronDownIcon, Maximize2Icon, Minimize2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  createBlogArticle,
  getBlogArticle,
  getBlogImageUploadStatus,
  listBlogTags,
  listMyBlogCategories,
  updateBlogArticle,
} from '@/api/blog'
import type { BlogTagCount } from '@shared/api'
import { uploadImage } from '@/api/upload'
import { useAuth } from '@/auth/AuthContext'
import {
  BlogImagePanel,
  type UploadProgressItem,
} from '@/components/blog-image-panel'
import { ImageUploadApplyBanner } from '@/components/image-upload-apply-banner'
import { MarkdownEditor } from '@/components/markdown-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  BLOG_IMAGE_UPLOAD_ENABLED_HINT,
  BLOG_IMAGE_UPLOAD_HINT,
  applyBlogCoverInput,
  buildBlogArticleWriteRequest,
  extractMarkdownImageUrls,
  firstContentImageUrl,
  isAllowedBlogImageUrl,
  isBlogHostedUploadUrl,
  type BlogSessionImage,
} from '@/lib/blog-image'
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
  const [content, setContent] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  /** 头图为空时默认勾选：保存时由服务端取正文第一张图 */
  const [useFirstImageAsCover, setUseFirstImageAsCover] = useState(true)
  const [visibility, setVisibility] = useState<BlogVisibility>('public')
  const [password, setPassword] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [remoteTags, setRemoteTags] = useState<BlogTagCount[]>([])
  const [syncToMainProfile, setSyncToMainProfile] = useState(true)
  const [imageUploadEnabled, setImageUploadEnabled] = useState(false)
  const [imageUploadPending, setImageUploadPending] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [sessionImages, setSessionImages] = useState<BlogSessionImage[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem[]>([])
  const insertFnRef = useRef<((text: string) => void) | null>(null)

  function addTag(raw: string) {
    const parts = raw
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
    if (!parts.length) return
    setTags((prev) => {
      const next = [...prev]
      for (const p of parts) {
        if (next.some((t) => t.toLowerCase() === p.toLowerCase())) continue
        if (next.length >= 20) break
        next.push(p)
      }
      return next
    })
    setTagDraft('')
  }

  function removeTag(name: string) {
    setTags((prev) => prev.filter((t) => t !== name))
  }

  useEffect(() => {
    void listMyBlogCategories().then((res) => {
      if (res.data) setCategories(res.data)
    })
    void getBlogImageUploadStatus().then((res) => {
      if (res.success && res.data) {
        setImageUploadEnabled(res.data.enabled)
        setImageUploadPending(Boolean(res.data.pendingRequest))
      }
    })
  }, [])

  useEffect(() => {
    if (!username) return
    void listBlogTags(username).then((res) => {
      if (res.success && res.data) setRemoteTags(res.data)
    })
  }, [username])

  const tagSuggestions = useMemo(() => {
    const q = tagDraft.trim().toLowerCase()
    if (!q) return [] as string[]
    const selected = new Set(tags.map((t) => t.toLowerCase()))
    return remoteTags
      .map((t) => t.name)
      .filter((n) => !selected.has(n.toLowerCase()) && n.toLowerCase().includes(q))
      .slice(0, 8)
  }, [tagDraft, tags, remoteTags])

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
        toast.error(res.message || '没加载出来')
        setLoading(false)
        return
      }
      const a = res.data
      setTitle(a.title)
      setSlug(a.slug)
      // 摘要仅按正文自动生成，编辑页不提供手写入口
      const body = a.content || ''
      setContent(body)
      const nextCover = (a.coverUrl || '').trim()
      const firstInBody = firstContentImageUrl(body)
      // 空头图，或头图就是正文第一张 → 自动模式（每次保存重识别）
      const autoCover = !nextCover || (Boolean(firstInBody) && nextCover === firstInBody)
      setUseFirstImageAsCover(autoCover)
      setCoverUrl(autoCover ? '' : nextCover)
      setVisibility((a.visibility as BlogVisibility) || 'public')
      setCategoryId(a.categoryId ? String(a.categoryId) : '')
      setTags(Array.isArray(a.tags) ? a.tags.filter(Boolean) : [])
      setSyncToMainProfile(
        a.syncToMainProfile === undefined || a.syncToMainProfile === null
          ? true
          : Boolean(a.syncToMainProfile),
      )
      // 图片栏只展示本站上传图，不展示外链
      const urls = extractMarkdownImageUrls(body, a.coverUrl || '').filter(
        isBlogHostedUploadUrl,
      )
      setSessionImages(
        urls.map((url, i) => ({
          id: `seed-${i}-${url.slice(-24)}`,
          url,
          name: `图片 ${i + 1}`,
          fromUpload: true,
        })),
      )
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [editId, isNew, isOwner])

  // 正文里新出现的本站上传图并入图片栏（外链不进栏）
  useEffect(() => {
    const urls = extractMarkdownImageUrls(content, coverUrl).filter(
      isBlogHostedUploadUrl,
    )
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
          fromUpload: true,
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

  // editorBlock 必须在所有 early return 之前计算，否则违反 Rules of Hooks
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
        placeholder="开始写作…"
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
      toast.error('标题要写哦')
      return
    }
    if (!content.trim()) {
      toast.error('正文要写哦')
      return
    }
    if (!useFirstImageAsCover && coverUrl && !isAllowedBlogImageUrl(coverUrl)) {
      toast.error(BLOG_IMAGE_UPLOAD_HINT)
      return
    }
    if (visibility === 'password' && isNew && !password.trim()) {
      toast.error('访问密码要设一个')
      return
    }
    setSaving(true)
    const body = buildBlogArticleWriteRequest({
      title,
      slug,
      content,
      coverUrl,
      useFirstImageAsCover,
      visibility,
      password,
      categoryId,
      tags,
      syncToMainProfile,
    })
    const res = isNew
      ? await createBlogArticle(body)
      : await updateBlogArticle({ ...body, id: editId })
    setSaving(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '没保存上')
      return
    }
    toast.success(isNew ? '已发布' : '已保存')
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
            <p className="text-xs text-muted-foreground">按 Esc 退出全屏</p>
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
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFullscreen(true)}
          >
            <Maximize2Icon data-icon="inline-start" />
            全屏
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/blog/${username}/manage`}>返回列表</Link>
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? '保存中…' : isNew ? '发布' : '保存'}
          </Button>
        </div>
      </div>

      <Collapsible className="group/tips rounded-lg border bg-muted/20">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>写作提示</span>
            <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=open]/tips:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="flex flex-col gap-1.5 border-t px-3 py-2.5 text-sm text-muted-foreground">
            <li>工具栏可插入标题、列表、代码、表格与公式</li>
            <li>
              快捷键：粗体 ⌘B · 斜体 ⌘I · 链接 ⌘K · 撤销 ⌘Z
            </li>
            <li>
              {imageUploadEnabled
                ? '可以粘贴或上传图片；在预览图上能调整大小和对齐'
                : '图片可以插外链；开通上传后能直接粘贴图片'}
            </li>
            <li>选中文字后粘贴网址，会自动变成链接</li>
            <li>需要专注时点「全屏」</li>
          </ul>
        </CollapsibleContent>
      </Collapsible>

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
          <FieldLabel>链接名{isNew ? '（可选）' : ''}</FieldLabel>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={isNew ? '不填则按标题生成' : ''}
            disabled={!isNew}
            readOnly={!isNew}
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
              <SelectGroup>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                    {c.isDefault ? '（默认）' : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>封面（可选）</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={coverUrl}
              onChange={(e) => {
                const next = applyBlogCoverInput(
                  { coverUrl, useFirstImageAsCover },
                  e.target.value,
                )
                setCoverUrl(next.coverUrl)
                setUseFirstImageAsCover(next.useFirstImageAsCover)
              }}
              placeholder="图片链接"
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
                  {coverUploading ? '上传中…' : '上传封面'}
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
                        toast.error(res.message || '封面上传失败')
                        return
                      }
                      const next = applyBlogCoverInput(
                        { coverUrl, useFirstImageAsCover },
                        res.data.url,
                      )
                      setCoverUrl(next.coverUrl)
                      setUseFirstImageAsCover(next.useFirstImageAsCover)
                      handleImageUploaded({
                        id: `cover-${Date.now()}`,
                        url: res.data.url,
                        name: '封面',
                        fromUpload: true,
                      })
                      toast.success('封面已上传')
                    }}
                  />
                </label>
              </Button>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Checkbox
              id="blog-use-first-image-cover"
              checked={useFirstImageAsCover}
              onCheckedChange={(v) => setUseFirstImageAsCover(v === true)}
            />
            <FieldLabel
              htmlFor="blog-use-first-image-cover"
              className="!mt-0 font-normal"
            >
              没有头图时，用正文第一张图
            </FieldLabel>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {imageUploadEnabled
              ? BLOG_IMAGE_UPLOAD_ENABLED_HINT
              : BLOG_IMAGE_UPLOAD_HINT}
          </p>
        </Field>
        <Field>
          <FieldLabel>谁可以看</FieldLabel>
          <Select
            value={visibility}
            onValueChange={(v) => setVisibility(v as BlogVisibility)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="public">公开</SelectItem>
                <SelectItem value="private">仅自己</SelectItem>
                <SelectItem value="password">需要密码</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        {visibility === 'password' ? (
          <Field>
            <FieldLabel>
              {isNew ? '访问密码' : '访问密码（不填则保持原密码）'}
            </FieldLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        ) : null}
        {visibility === 'public' ? (
          <Field className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="blog-sync-main"
                checked={syncToMainProfile}
                onCheckedChange={(v) => setSyncToMainProfile(v === true)}
              />
              <FieldLabel htmlFor="blog-sync-main" className="!mt-0 font-normal">
                同步到主站
              </FieldLabel>
            </div>
          </Field>
        ) : null}
        <Field className="sm:col-span-2">
          <FieldLabel>标签</FieldLabel>
          <div className="relative flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1 pr-1">
                  {t}
                  <button
                    type="button"
                    className="rounded-sm p-0.5 hover:bg-muted"
                    aria-label={`移除 ${t}`}
                    onClick={() => removeTag(t)}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    if (tagSuggestions.length > 0) {
                      const exact = tagSuggestions.find(
                        (h) => h.toLowerCase() === tagDraft.trim().toLowerCase(),
                      )
                      addTag(exact || tagSuggestions[0])
                    } else {
                      addTag(tagDraft)
                    }
                  } else if (
                    e.key === 'Backspace' &&
                    !tagDraft &&
                    tags.length > 0
                  ) {
                    removeTag(tags[tags.length - 1])
                  } else if (e.key === 'Escape') {
                    setTagDraft('')
                  }
                }}
                onBlur={() => {
                  // 延迟，便于点选建议
                  window.setTimeout(() => {
                    if (tagDraft.trim()) addTag(tagDraft)
                  }, 120)
                }}
                placeholder={tags.length ? '搜索或添加' : '搜索已有标签或输入新标签'}
                className="h-8 min-w-[8rem] flex-1"
              />
            </div>
            {tagSuggestions.length > 0 ? (
              <ul className="absolute top-full z-20 mt-1 max-h-40 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md">
                {tagSuggestions.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      className="flex w-full rounded-sm px-2 py-1.5 text-left hover:bg-accent"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        addTag(name)
                      }}
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Field>
      </FieldGroup>

      <ImageUploadApplyBanner
        enabled={imageUploadEnabled}
        pendingRequest={imageUploadPending}
        onPendingChange={setImageUploadPending}
      />

      <div className={cn('min-h-[min(72vh,880px)]')}>{editorBlock}</div>

      {imageUploadEnabled || sessionImages.length > 0 || uploadProgress.length > 0
        ? imagePanel
        : null}
    </div>
  )
}
