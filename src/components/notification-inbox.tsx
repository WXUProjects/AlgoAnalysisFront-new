import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellIcon, CheckCheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
} from '@/api/notification'
import type { NotificationItem } from '@shared/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

function notifLink(n: NotificationItem): string | null {
  if (n.problemId > 0) {
    if (n.refType === 'solution' && n.refId > 0) {
      return `/question-bank/detail/${n.problemId}?tab=solutions&solutionId=${n.refId}`
    }
    if (n.refType === 'comment' || n.type === 'mention') {
      return `/question-bank/detail/${n.problemId}?tab=comments`
    }
    return `/question-bank/detail/${n.problemId}`
  }
  return null
}

export function NotificationInbox({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [list, setList] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)

  const refreshCount = useCallback(async () => {
    if (!enabled) return
    const res = await getUnreadNotificationCount()
    if (res.success) setUnread(res.data ?? 0)
  }, [enabled])

  const loadList = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    const res = await listNotifications({ page: 1, pageSize: 30 })
    setLoading(false)
    if (res.success && res.data) {
      setList(res.data.list)
      setUnread(res.data.unreadCount)
    } else if (!res.success) {
      toast.error(res.message || '通知加载失败')
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    void refreshCount()
    const t = window.setInterval(() => void refreshCount(), 60_000)
    return () => window.clearInterval(t)
  }, [enabled, refreshCount])

  useEffect(() => {
    if (open) void loadList()
  }, [open, loadList])

  async function onClickItem(n: NotificationItem) {
    if (!n.isRead) {
      await markNotificationsRead([n.id])
      setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
      setUnread((c) => Math.max(0, c - 1))
    }
  }

  async function onReadAll() {
    const res = await markAllNotificationsRead()
    if (!res.success) {
      toast.error(res.message || '操作失败')
      return
    }
    setList((prev) => prev.map((x) => ({ ...x, isRead: true })))
    setUnread(0)
    toast.success('已全部标为已读')
  }

  if (!enabled) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="站内通知">
          <BellIcon className="size-4" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px] leading-none"
            >
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>站内通知</SheetTitle>
          <SheetDescription>审核结果、@ 提醒等会显示在这里</SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-xs text-muted-foreground">
            {unread > 0 ? `${unread} 条未读` : '暂无未读'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={unread === 0}
            onClick={() => void onReadAll()}
          >
            <CheckCheckIcon className="size-3.5" />
            全部已读
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">加载中…</p>
          )}
          {!loading && list.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">还没有通知</p>
          )}
          <ul className="space-y-1.5 pb-4">
            {list.map((n) => {
              const href = notifLink(n)
              const inner = (
                <div
                  className={cn(
                    'rounded-lg border px-3 py-2.5 transition-colors',
                    n.isRead ? 'bg-background' : 'border-primary/20 bg-primary/5',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {!n.isRead && (
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    {formatTime(n.createdAt)}
                  </p>
                </div>
              )
              return (
                <li key={n.id}>
                  {href ? (
                    <Link
                      to={href}
                      onClick={() => {
                        void onClickItem(n)
                        setOpen(false)
                      }}
                      className="block outline-none"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => void onClickItem(n)}
                    >
                      {inner}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  )
}
