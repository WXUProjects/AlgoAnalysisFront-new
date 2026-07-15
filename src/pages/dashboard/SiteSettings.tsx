import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { updateSiteConfig } from '@/api/site'
import { uploadImage } from '@/api/upload'
import { useAuth } from '@/auth/AuthContext'
import { useSiteConfig } from '@/site/SiteConfigContext'
import { ImageUploadTile } from '@/components/image-upload-tile'
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
import { Navigate } from 'react-router-dom'

export function DashboardSiteSettings() {
  const { isAdmin } = useAuth()
  const { config, refresh } = useSiteConfig()
  const [title, setTitle] = useState('')
  const [logo, setLogo] = useState('')
  const [favicon, setFavicon] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null)

  useEffect(() => {
    setTitle(config.siteTitle || 'GoAlgo')
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
                  placeholder="GoAlgo"
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
