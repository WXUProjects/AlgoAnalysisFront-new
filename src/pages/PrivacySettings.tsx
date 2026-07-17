import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getPrivacy, updatePrivacy } from '@/api/social'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'

export function PrivacySettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [allowPublicProfile, setAllowPublicProfile] = useState(true)
  const [allowPublicFeed, setAllowPublicFeed] = useState(true)

  useEffect(() => {
    let cancelled = false
    void getPrivacy().then((res) => {
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '加载失败，请稍后重试')
        return
      }
      setAllowPublicProfile(res.data.allowPublicProfile)
      setAllowPublicFeed(res.data.allowPublicFeed)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    setSaving(true)
    const res = await updatePrivacy({ allowPublicProfile, allowPublicFeed })
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '保存失败，请稍后重试')
      return
    }
    toast.success('已保存')
  }

  return (
    <PageShell>
      <div>
        <h2 className="text-lg font-semibold">隐私设置</h2>
        <p className="text-sm text-muted-foreground">
          只影响公共域。在校队等私人组织里，队友仍可查看你的资料与动态。
        </p>
      </div>

      <Card className="max-w-xl gap-4 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">公共域展示</CardTitle>
          <CardDescription>
            决定公共域里别人能看到你的哪些内容
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <FieldGroup className="gap-5">
              <Field orientation="horizontal">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <FieldLabel htmlFor="set-profile">允许他人查看个人资料</FieldLabel>
                  <FieldDescription>
                    关闭后，公共域中的其他人将无法打开你的资料页
                  </FieldDescription>
                </div>
                <Switch
                  id="set-profile"
                  checked={allowPublicProfile}
                  onCheckedChange={setAllowPublicProfile}
                />
              </Field>
              <Field orientation="horizontal">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <FieldLabel htmlFor="set-feed">出现在公共域动态</FieldLabel>
                  <FieldDescription>
                    关闭后，公共域动态里不会再出现你的提交
                  </FieldDescription>
                </div>
                <Switch
                  id="set-feed"
                  checked={allowPublicFeed}
                  onCheckedChange={setAllowPublicFeed}
                />
              </Field>
              <Button
                type="button"
                className="w-fit"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? <Spinner data-icon="inline-start" /> : null}
                保存
              </Button>
            </FieldGroup>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
