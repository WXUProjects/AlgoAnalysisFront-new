import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellIcon, CheckCheckIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  clearAllNotifications,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
} from '@/api/notification'
import type { NotificationItem } from '@shared/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

/** 前台标签页：每 5 分钟刷一次角标；后台/隐藏时停轮询 */
const UNREAD_POLL_MS = 5 * 60_000

function parsePayload(raw?: string): Record<string, unknown> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw) as unknown
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function notifLink(n: NotificationItem): string | null {
  const p = parsePayload(n.payload)
  const blogUser = String(
    p.blogUsername || p.authorUsername || '',
  ).trim()
  const blogSlug = String(p.blogSlug || p.slug || '').trim()

  // 站点运营：注册 / 冻结 / 解冻 / 待审核 / 举报
  if (n.type === 'user_registered') {
    const kw = String(p.username || '').trim()
    return kw ? `/admin/site-users?keyword=${encodeURIComponent(kw)}` : '/admin/site-users'
  }
  if (n.type === 'user_frozen' || n.type === 'user_unfrozen') {
    return '/profile'
  }
  if (n.type === 'review_pending') {
    if (n.refType === 'problem_edit') return '/admin/problem-edits'
    if (n.refType === 'blog_article' || n.refType === 'blog_image_upload') {
      return '/admin/blog'
    }
    return '/admin/problem-edits'
  }
  if (
    n.type === 'image_upload_approved' ||
    n.type === 'image_upload_rejected'
  ) {
    return null
  }
  // 举报通知统一落到举报处理台（后台 · 内容审核 · 用户举报），原文链接在处理台内提供
  if (n.type === 'blog_report') {
    return '/admin/reports'
  }
  if (n.type === 'community_report') {
    return n.refType === 'solution'
      ? '/admin/reports?type=solution'
      : '/admin/reports?type=comment'
  }

  if (blogUser && blogSlug) {
    return `/blog/${blogUser}/${blogSlug}`
  }
  if (
    n.refType === 'blog_article' ||
    n.type === 'blog_article_like' ||
    n.type === 'blog_comment' ||
    n.type === 'blog_comment_reply' ||
    n.type === 'blog_comment_like' ||
    n.type === 'blog_moderation'
  ) {
    if (blogUser) return `/blog/${blogUser}`
  }
  if (n.type === 'org_join_approved' || n.type === 'org_join_rejected') {
    return '/orgs'
  }
  // 邀请你加入 → 去「我的组织」同意/拒绝；对方同意/拒绝 → 组织管理员回去看
  if (n.type === 'org_invited') {
    return '/org'
  }
  if (n.type === 'org_invite_accepted' || n.type === 'org_invite_declined') {
    return '/admin/org'
  }
  // 工单通知：RefID 恒 0（uint 放不下 UUID），跳转读 Payload.ticket_id → 服务会话
  if (n.refType === 'ticket') {
    const ticketId = String(p.ticket_id || '').trim()
    return ticketId ? `/service?ticket=${encodeURIComponent(ticketId)}` : '/service'
  }
  if (n.problemId > 0) {
    if (n.refType === 'solution' && n.refId > 0) {
      return `/question-bank/detail/${n.problemId}/solution/${n.refId}`
    }
    if (
      n.refType === 'comment' ||
      n.type === 'mention' ||
      n.type === 'comment_reply' ||
      n.type === 'comment_like'
    ) {
      return `/question-bank/detail/${n.problemId}?tab=comments`
    }
    if (n.type === 'solution_like' && n.refId > 0) {
      return `/question-bank/detail/${n.problemId}/solution/${n.refId}`
    }
    if (
      n.type === 'problem_edit_approved' ||
      n.type === 'problem_edit_rejected'
    ) {
      return `/question-bank/detail/${n.problemId}`
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
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const pollRef = useRef<number | null>(null)

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

  // 前台每 5 分钟轮询；标签页隐藏时停掉；回到前台立刻补一次
  useEffect(() => {
    if (!enabled) return

    const stopPoll = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    const startPoll = () => {
      stopPoll()
      if (document.visibilityState !== 'visible') return
      pollRef.current = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          void refreshCount()
        }
      }, UNREAD_POLL_MS)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshCount()
        startPoll()
      } else {
        stopPoll()
      }
    }

    void refreshCount()
    startPoll()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopPoll()
      document.removeEventListener('visibilitychange', onVisibility)
    }
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

  async function onClearAll() {
    setClearing(true)
    const res = await clearAllNotifications()
    setClearing(false)
    if (!res.success) {
      toast.error(res.message || '清空失败')
      return
    }
    setList([])
    setUnread(0)
    setClearOpen(false)
    toast.success(res.data ? `已清空 ${res.data} 条通知` : '通知已清空')
  }

  if (!enabled) return null

  return (
    <>
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
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>站内通知</SheetTitle>
            <SheetDescription>
              注册与账号状态、审核与举报、点赞回复等都会显示在这里，网站与管理中心共用同一列表
            </SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
            <span className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} 条未读` : '还没有未读'}
            </span>
            <div className="flex items-center gap-1">
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={list.length === 0 && unread === 0}
                onClick={() => setClearOpen(true)}
              >
                <Trash2Icon className="size-3.5" />
                清空全部
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {loading && (
              <p className="py-6 text-center text-sm text-muted-foreground">加载中…</p>
            )}
            {!loading && list.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">还没有通知</p>
            )}
            <ul className="flex flex-col gap-1.5 pb-2">
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

      <AlertDialog
        open={clearOpen}
        onOpenChange={(next) => {
          if (!clearing) setClearOpen(next)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空全部通知？</AlertDialogTitle>
            <AlertDialogDescription>
              会永久删除你收件箱里的所有通知（含已读与未读），删除后无法恢复。若只想去掉红点，请用「全部已读」。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={clearing}
              onClick={(e) => {
                e.preventDefault()
                void onClearAll()
              }}
            >
              {clearing ? '清空中…' : '确认清空'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
