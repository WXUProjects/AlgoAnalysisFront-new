import { useState } from 'react'
import { toast } from 'sonner'
import { reportCommunity } from '@/api/community'
import type { CommunityTargetType } from '@shared/api'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const PRESET_REASONS = [
  { value: 'spam', label: '垃圾广告 / 引流' },
  { value: 'abuse', label: '人身攻击或不友善' },
  { value: 'illegal', label: '违法违规内容' },
  { value: 'other', label: '其他' },
] as const

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: CommunityTargetType
  targetId: number
  /** 被举报内容的作者 id；用于前端拦截自举报 */
  ownerUserId?: number
  myUserId?: number
}

/**
 * 举报评论 / 题解弹窗。
 */
export function CommunityReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  ownerUserId,
  myUserId,
}: Props) {
  const [preset, setPreset] = useState<string>('spam')
  const [detail, setDetail] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (myUserId && ownerUserId && myUserId === ownerUserId) {
      toast.error('不能举报自己的内容')
      return
    }
    const label =
      PRESET_REASONS.find((r) => r.value === preset)?.label || '其他'
    const reason =
      preset === 'other'
        ? detail.trim()
        : detail.trim()
          ? `${label}：${detail.trim()}`
          : label
    if (!reason) {
      toast.error('请说明举报原因')
      return
    }
    setSending(true)
    const res = await reportCommunity({ targetType, targetId, reason })
    setSending(false)
    if (!res.success) {
      toast.error(res.message || '提交失败，请稍后重试')
      return
    }
    toast.success(res.message || '已收到举报，我们会尽快处理')
    setDetail('')
    setPreset('spam')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>举报</DialogTitle>
          <DialogDescription>
            请选择原因。我们会尽快核实处理，不会公开你的身份。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Field>
            <FieldLabel>原因</FieldLabel>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择原因" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PRESET_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="report-detail">补充说明（可选）</FieldLabel>
            <Textarea
              id="report-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={
                preset === 'other' ? '请说明具体情况…' : '可补充更多信息…'
              }
              maxLength={500}
              rows={3}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            disabled={sending}
            onClick={() => void submit()}
          >
            {sending ? '提交中…' : '提交举报'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
