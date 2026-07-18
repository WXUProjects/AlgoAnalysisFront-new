import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  activateBlog,
  getBlogActivationStatus,
  getBlogAgreement,
} from '@/api/blog'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 开通成功后回调 */
  onActivated?: () => void
  /** 强制展示（管理发文等） */
  force?: boolean
}

/**
 * 初次开通博客：阅读协议 + 勾选同意，不同意则不能开通。
 */
export function BlogActivateDialog({
  open,
  onOpenChange,
  onActivated,
}: Props) {
  const { isLogin, ready } = useAuth()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('个人博客开通协议')
  const [content, setContent] = useState('')
  const [version, setVersion] = useState('')
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (!open) return
    setAgreed(false)
    setLoading(true)
    void getBlogAgreement().then((res) => {
      setLoading(false)
      if (res.success && res.data) {
        setTitle(res.data.title || '个人博客开通协议')
        setContent(res.data.content || '')
        setVersion(res.data.agreementVersion || '')
        if (res.data.activated) {
          onOpenChange(false)
          onActivated?.()
        }
      } else {
        toast.error(res.message || '协议加载失败')
      }
    })
  }, [open, onOpenChange, onActivated])

  async function handleActivate() {
    if (!agreed) {
      toast.error('请先阅读并勾选同意开通协议')
      return
    }
    if (!isLogin) {
      toast.error('请先登录')
      return
    }
    setSubmitting(true)
    const res = await activateBlog({
      accept: true,
      agreementVersion: version || undefined,
      emailNotifyEnabled: false,
      emailNotifyStrategy: 'off',
    })
    setSubmitting(false)
    if (!res.success || !res.data?.activated) {
      toast.error(res.message || '开通失败')
      return
    }
    toast.success('个人博客已开通')
    onOpenChange(false)
    onActivated?.()
  }

  if (ready && !isLogin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>开通个人博客</DialogTitle>
            <DialogDescription>
              请先登录主站账号，完成统一登录后再签署开通协议。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button asChild>
              <Link
                to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              >
                去登录
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            开通前须阅读并同意本协议。不同意则无法开通个人博客。
            {version ? `（版本 ${version}）` : null}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              加载协议…
            </div>
          ) : (
            <div className="h-[min(50vh,360px)] overflow-y-auto rounded-md border bg-muted/30 p-3">
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
                {content || '暂无协议内容'}
              </pre>
            </div>
          )}
          <div className="mt-4 flex items-start gap-2">
            <Checkbox
              id="blog-agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              disabled={loading || submitting}
            />
            <Label
              htmlFor="blog-agree"
              className="cursor-pointer text-sm leading-snug font-normal"
            >
              我已阅读并同意《个人博客开通协议》，愿意遵守中国法律法规与平台规则
            </Label>
          </div>
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            不同意
          </Button>
          <Button
            type="button"
            disabled={!agreed || loading || submitting}
            onClick={() => void handleActivate()}
          >
            {submitting ? (
              <>
                <Spinner className="size-4" />
                开通中…
              </>
            ) : (
              '同意并开通'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 管理入口：检查是否已开通，未开通则弹出协议 */
export async function ensureBlogActivated(): Promise<boolean> {
  const res = await getBlogActivationStatus()
  if (res.success && res.data?.activated) return true
  return false
}
