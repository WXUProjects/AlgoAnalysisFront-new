import { useState } from 'react'
import { CheckIcon, FlagIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MAX_DETAIL = 500

const PRESET_REASONS = [
  { value: 'spam', label: '垃圾广告 / 引流', hint: '推广、导流或与内容无关的信息' },
  { value: 'abuse', label: '人身攻击或不友善', hint: '辱骂、嘲讽、骚扰其他同学' },
  { value: 'illegal', label: '违法违规内容', hint: '色情、暴力或其他有害信息' },
  { value: 'plagiarism', label: '抄袭 / 侵权', hint: '照搬他人题解、博客或代码' },
  { value: 'other', label: '其他问题', hint: '以上都不是，请补充说明' },
] as const

type PresetValue = (typeof PRESET_REASONS)[number]['value']

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 被举报的内容形态，用于标题与文案（如「博客」「题解」「评论」） */
  targetLabel?: string
  /** 提交举报；返回后端结果，弹窗负责 toast 与关闭 */
  onSubmit: (reason: string) => Promise<{ success: boolean; message?: string }>
}

/**
 * 举报弹窗（博客 / 题解 / 评论通用）：原因选卡 + 可选补充说明。
 * 举报会进入「后台 · 内容审核 · 用户举报」处理台，并通知管理员。
 */
export function ReportDialog({
  open,
  onOpenChange,
  targetLabel = '内容',
  onSubmit,
}: Props) {
  const [preset, setPreset] = useState<PresetValue>('spam')
  const [detail, setDetail] = useState('')
  const [sending, setSending] = useState(false)

  const needDetail = preset === 'other'
  const canSubmit = !sending && (!needDetail || detail.trim().length > 0)

  function reset() {
    setPreset('spam')
    setDetail('')
  }

  async function submit() {
    const label = PRESET_REASONS.find((r) => r.value === preset)?.label ?? '其他'
    const extra = detail.trim()
    const reason = needDetail ? extra : extra ? `${label}：${extra}` : label
    if (!reason) {
      toast.error('请说明举报原因')
      return
    }
    setSending(true)
    const res = await onSubmit(reason)
    setSending(false)
    if (!res.success) {
      toast.error(res.message || '没提交上，过会儿再试')
      return
    }
    toast.success(res.message || '已收到举报，我们会尽快处理')
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
            <FlagIcon className="size-5 text-destructive" />
          </div>
          <DialogTitle>举报这条{targetLabel}</DialogTitle>
          <DialogDescription>
            管理员会尽快核实处理，不会公开你的身份
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div
            className="flex flex-col gap-1.5"
            role="radiogroup"
            aria-label="举报原因"
          >
            {PRESET_REASONS.map((r) => {
              const selected = preset === r.value
              return (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPreset(r.value)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                    'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{r.label}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.hint}
                    </div>
                  </div>
                  <CheckIcon
                    className={cn(
                      'size-4 shrink-0 text-primary transition-opacity',
                      selected ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-1">
            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={
                needDetail ? '请说明具体情况…' : '补充说明（可选）…'
              }
              aria-label="补充说明"
              maxLength={MAX_DETAIL}
              rows={3}
            />
            <span className="self-end text-xs tabular-nums text-muted-foreground">
              {detail.length}/{MAX_DETAIL}
            </span>
          </div>
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
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {sending ? '提交中…' : '提交举报'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
