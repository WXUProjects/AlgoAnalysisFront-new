import { useEffect, useId, useRef, useState } from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateSiteConfig } from '@/api/site'
import { uploadImage } from '@/api/upload'
import { useAuth } from '@/auth/AuthContext'
import { useSiteConfig } from '@/site/SiteConfigContext'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { Navigate } from 'react-router-dom'

function ImageUploadTile({
  label,
  value,
  uploading,
  sizeClass,
  onFile,
}: {
  label: string
  value: string
  uploading: boolean
  sizeClass: string
  onFile: (file: File | null) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <label
        htmlFor={inputId}
        className={cn(
          'group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/30 transition-colors',
          'hover:border-primary/50 hover:bg-muted/50',
          'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          sizeClass,
          uploading && 'pointer-events-none',
        )}
      >
        {value ? (
          <img
            src={value}
            alt=""
            className="max-h-full max-w-full object-contain p-2 transition-transform duration-200 group-hover:scale-[0.98]"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground transition-opacity group-hover:text-foreground">
            <ImageIcon className="size-6 opacity-70" />
            <span className="text-xs">点击上传</span>
          </div>
        )}

        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]',
            'opacity-0 transition-opacity duration-200',
            'group-hover:opacity-100 group-focus-within:opacity-100',
            uploading && 'opacity-100',
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-foreground" />
          ) : (
            <span className="rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm">
              {value ? '更换图片' : '选择图片'}
            </span>
          )}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/x-icon"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0] || null
            e.target.value = ''
            onFile(file)
          }}
        />
      </label>
      <p className="text-xs text-muted-foreground">jpg / png / webp / svg，点击预览区即可上传</p>
    </div>
  )
}

export function DashboardSiteSettings() {
  const { isAdmin } = useAuth()
  const { config, refresh } = useSiteConfig()
  const [title, setTitle] = useState('')
  const [logo, setLogo] = useState('')
  const [favicon, setFavicon] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null)

  useEffect(() => {
    setTitle(config.siteTitle || 'Algo-CWUX')
    setLogo(config.siteLogo || '')
    setFavicon(config.favicon || '')
  }, [config])

  if (!isAdmin) {
    return <Navigate to="/admin/statistics" replace />
  }

  async function onUpload(kind: 'logo' | 'favicon', file: File | null) {
    if (!file) return
    setUploading(kind)
    const res = await uploadImage(file, 'site')
    setUploading(null)
    if (!res.success || !res.data?.url) {
      toast.error(res.message || '上传失败')
      return
    }
    if (kind === 'logo') setLogo(res.data.url)
    else setFavicon(res.data.url)
    toast.success('上传成功，请点保存')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('站点标题不能为空')
      return
    }
    setSaving(true)
    const res = await updateSiteConfig({
      siteTitle: title.trim(),
      siteLogo: logo.trim(),
      favicon: favicon.trim(),
    })
    setSaving(false)
    if (res.success) {
      toast.success('站点配置已保存')
      await refresh()
    } else {
      toast.error(res.message || '保存失败')
    }
  }

  return (
    <PageShell stagger={false}>
      <form onSubmit={handleSave} className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>站点设置</CardTitle>
            <CardDescription>设置站点名称、Logo 与浏览器图标</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>站点标题</FieldLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Algo-CWUX"
                />
              </Field>
              <Field>
                <ImageUploadTile
                  label="站点 Logo"
                  value={logo}
                  uploading={uploading === 'logo'}
                  sizeClass="size-28"
                  onFile={(file) => void onUpload('logo', file)}
                />
              </Field>
              <Field>
                <ImageUploadTile
                  label="浏览器图标"
                  value={favicon}
                  uploading={uploading === 'favicon'}
                  sizeClass="size-20"
                  onFile={(file) => void onUpload('favicon', file)}
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              保存
            </Button>
          </CardFooter>
        </Card>
      </form>
    </PageShell>
  )
}
