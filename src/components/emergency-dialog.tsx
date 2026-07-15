import { useCallback, useEffect, useState } from 'react'
import type { EmergencyInfo } from '@shared/api'
import { listActiveEmergencies } from '@/api/emergency'
import {
  getEmergencyAckMaxId,
  setEmergencyAckMaxId,
} from '@/lib/emergency-ack'
import { MarkdownBody } from '@/components/markdown-body'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * 全站紧急弹窗：拉取生效通知，过滤本地已确认 id，逐条展示后「我知道了」。
 */
export function EmergencyDialogHost() {
  const [queue, setQueue] = useState<EmergencyInfo[]>([])
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    const res = await listActiveEmergencies()
    if (!res.success || !res.data?.length) {
      setQueue([])
      setOpen(false)
      return
    }
    const ack = getEmergencyAckMaxId()
    const pending = res.data.filter((n) => n.id > ack)
    if (!pending.length) {
      setQueue([])
      setOpen(false)
      return
    }
    setQueue(pending)
    setIndex(0)
    setOpen(true)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const current = queue[index]
  const isLast = index >= queue.length - 1
  const progress =
    queue.length > 1 ? `${index + 1} / ${queue.length}` : undefined

  function handleNext() {
    if (!isLast) {
      setIndex((i) => i + 1)
      return
    }
    const maxId = Math.max(...queue.map((n) => n.id))
    setEmergencyAckMaxId(maxId)
    setOpen(false)
    setQueue([])
  }

  function onOpenChange(next: boolean) {
    // 禁止点遮罩/ESC 关闭，必须点「我知道了」
    if (!next) return
    setOpen(next)
  }

  if (!current) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="flex max-h-[min(90vh,880px)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg md:max-w-xl"
      >
        <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 text-left">
          <DialogTitle className="text-base leading-snug sm:text-lg">
            {current.title || '重要通知'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {progress ? `紧急通知 · ${progress}` : '紧急通知'}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <MarkdownBody
            content={current.content}
            mode="auto"
            className="text-sm"
          />
        </div>
        <DialogFooter className="shrink-0 border-t px-5 py-3 sm:justify-end">
          <Button type="button" onClick={handleNext}>
            {isLast ? '我知道了' : '下一条'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
