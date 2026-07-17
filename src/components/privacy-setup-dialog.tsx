import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getPrivacyStatus, updatePrivacy } from '@/api/social'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'

/**
 * 首次登录未配置公共域隐私时强制弹窗。
 * 私人域组织内这些开关不生效，但仍需完成一次确认。
 */
export function PrivacySetupDialog() {
  const { isLogin, ready } = useAuth()
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allowPublicProfile, setAllowPublicProfile] = useState(true)
  const [allowPublicFeed, setAllowPublicFeed] = useState(true)

  const check = useCallback(async () => {
    if (!ready || !isLogin) {
      setOpen(false)
      return
    }
    setChecking(true)
    const res = await getPrivacyStatus()
    setChecking(false)
    if (res.success && res.data && !res.data.privacyConfigured) {
      setAllowPublicProfile(true)
      setAllowPublicFeed(true)
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [isLogin, ready])

  useEffect(() => {
    void check()
  }, [check])

  async function handleSave() {
    setSaving(true)
    const res = await updatePrivacy({ allowPublicProfile, allowPublicFeed })
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '保存失败，请稍后重试')
      return
    }
    toast.success('隐私设置已保存')
    setOpen(false)
  }

  if (!isLogin || checking) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // 未配置完成不允许关闭
        if (!next) return
        setOpen(next)
      }}
    >
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>设置公共域隐私</DialogTitle>
          <DialogDescription>
            请先确认你在公共域的展示方式。加入校队后，这些设置不会限制队内成员查看。
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <Field orientation="horizontal">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <FieldLabel htmlFor="privacy-profile">允许他人查看个人资料</FieldLabel>
              <FieldDescription>
                关闭后，公共域中的其他人将无法打开你的资料页（默认允许）。
              </FieldDescription>
            </div>
            <Switch
              id="privacy-profile"
              checked={allowPublicProfile}
              onCheckedChange={setAllowPublicProfile}
            />
          </Field>
          <Field orientation="horizontal">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <FieldLabel htmlFor="privacy-feed">出现在公共域动态</FieldLabel>
              <FieldDescription>
                关闭后，公共域动态里不会再出现你的提交（默认会出现）。
              </FieldDescription>
            </div>
            <Switch
              id="privacy-feed"
              checked={allowPublicFeed}
              onCheckedChange={setAllowPublicFeed}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? <Spinner data-icon="inline-start" /> : null}
            确认并继续
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
