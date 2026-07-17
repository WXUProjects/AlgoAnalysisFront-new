import { useEffect, useState } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { toast } from 'sonner'
import {
  createBlogArticle,
  getBlogArticle,
  listMyBlogCategories,
  updateBlogArticle,
} from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { MarkdownEditor } from '@/components/markdown-editor'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  BLOG_IMAGE_UPLOAD_HINT,
  isAllowedBlogImageUrl,
} from '@/lib/blog-image'
import type { BlogOutletContext } from '@/layouts/BlogLayout'
import type { BlogCategory, BlogVisibility } from '@shared/api'

export function BlogEditor() {
  const { username, isOwner } = useOutletContext<BlogOutletContext>()
  const { id: idParam } = useParams()
  const editId = idParam ? Number(idParam) : 0
  const isNew = !editId
  const { isLogin, ready, orgs } = useAuth()
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
  const [recommend, setRecommend] = useState(false)
  const [syncToMainProfile, setSyncToMainProfile] = useState(false)
  const [categoryId, setCategoryId] = useState<string>('none')
  const [orgIds, setOrgIds] = useState<number[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])

  useEffect(() => {
    void listMyBlogCategories().then((res) => {
      if (res.data) setCategories(res.data)
    })
  }, [])

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
      setSummary(a.summary || '')
      setContent(a.content || '')
      setCoverUrl(a.coverUrl || '')
      setVisibility((a.visibility as BlogVisibility) || 'public')
      setRecommend(Boolean(a.recommend))
      setSyncToMainProfile(Boolean(a.syncToMainProfile))
      setCategoryId(a.categoryId ? String(a.categoryId) : 'none')
      setOrgIds(a.orgIds || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [editId, isNew, isOwner])

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

  function toggleOrg(id: number) {
    setOrgIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
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
      summary: summary.trim(),
      content,
      coverUrl: coverUrl.trim(),
      visibility,
      password: password.trim() || undefined,
      clearPassword: visibility !== 'password',
      recommend: visibility === 'public' ? recommend : false,
      syncToMainProfile,
      categoryId:
        categoryId === 'none' ? null : Number(categoryId) || null,
      orgIds,
    }
    const res = isNew
      ? await createBlogArticle(body)
      : await updateBlogArticle({ ...body, id: editId })
    setSaving(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '保存失败')
      return
    }
    toast.success(isNew ? '已发布' : '已保存')
    navigate(`/blog/${username}/${res.data.slug}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-6" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {isNew ? '写文章' : '编辑文章'}
          </h1>
          <p className="text-sm text-muted-foreground">
            支持 Markdown · 实时预览 · 图片请用外链
          </p>
        </div>
        <div className="flex gap-2">
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
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="未分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">未分类</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
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
            placeholder="列表卡片上的简介；不填则自动截取正文"
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>头图链接（可选）</FieldLabel>
          <Input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://…"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {BLOG_IMAGE_UPLOAD_HINT}
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

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={recommend && visibility === 'public'}
            disabled={visibility !== 'public'}
            onCheckedChange={(v) => setRecommend(Boolean(v))}
          />
          开放到主站推荐页
          {visibility !== 'public' && (
            <span className="text-xs text-muted-foreground">
              （仅公开文章可推荐）
            </span>
          )}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={syncToMainProfile}
            onCheckedChange={(v) => setSyncToMainProfile(Boolean(v))}
          />
          同步到主站个人资料动态（作者开启后主站可展示）
        </label>
        {orgs.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">同步到组织</p>
            <p className="text-xs text-muted-foreground">
              勾选私有组织时，会自动同步到公共域
            </p>
            <div className="flex flex-wrap gap-3">
              {orgs.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={orgIds.includes(o.id)}
                    onCheckedChange={() => toggleOrg(o.id)}
                  />
                  {o.name}
                  {o.isSystem || o.slug === 'public' ? (
                    <span className="text-xs text-muted-foreground">公共域</span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-h-[480px]">
        <MarkdownEditor
          value={content}
          onChange={setContent}
          fullPage={false}
          minHeight={480}
          linkOnlyImages
          placeholder={
            '开始写作…\n\n支持标题、列表、代码块、表格与 $公式$\n图片请用 ![说明](https://…) 外链'
          }
        />
      </div>

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
