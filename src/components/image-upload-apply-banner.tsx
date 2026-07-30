import { useState } from 'react'
import { toast } from 'sonner'
import { applyBlogImageUpload } from '@/api/blog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MIN_REASON = 5
const MAX_REASON = 500

type Props = {
  /** 已开通上传时不展示 */
  enabled: boolean
  pendingRequest: boolean
  onPendingChange?: (pending: boolean) => void
  className?: string
}

/**
 * 博客 / 题解编辑区：无图片上传权限时提示申请，提交理由后等待站管审批。
 */
export function ImageUploadApplyBanner({
  enabled,
  pendingRequest,
  onPendingChange,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (enabled) return null

  async function submit() {
    const r = reason.trim()
    if (r.length < MIN_REASON) {
      toast.error(`请填写至少 ${MIN_REASON} 字的申请理由`)
      return
    }
    if (r.length > MAX_REASON) {
      toast.error(`申请理由最多 ${MAX_REASON} 字`)
      return
    }
    setSubmitting(true)
    const res = await applyBlogImageUpload({ reason: r })
    setSubmitting(false)
    if (!res.success) {
      toast.error(res.message || '提交失败，请稍后重试')
      return
    }
    toast.success(res.message || '已提交申请，请等待站点管理员审批')
    setOpen(false)
    setReason('')
    onPendingChange?.(true)
  }

  return (
    <>
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm',
          className,
        )}
      >
        {pendingRequest ? (
          <p className="text-muted-foreground">
            已提交图片上传申请，等待站点管理员审批。审批前可粘贴图片链接。
          </p>
        ) : (
          <>
            <p className="min-w-0 flex-1 text-muted-foreground">
              暂未开通图片上传。可申请权限，或先粘贴图片链接。
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setOpen(true)}
            >
              申请图片上传权限
            </Button>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>申请图片上传权限</DialogTitle>
            <DialogDescription>
              说明用途后提交，站点管理员审批通过即可在博客与题解中直接上传图片。
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="image-upload-reason">申请理由</FieldLabel>
            <Textarea
              id="image-upload-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：写题解需要配图说明算法过程"
              rows={4}
              maxLength={MAX_REASON}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {reason.trim().length}/{MAX_REASON}，至少 {MIN_REASON} 字
            </p>
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? '提交中…' : '提交申请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
