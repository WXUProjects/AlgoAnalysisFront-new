import { Link } from 'react-router-dom'
import { getProblemSolution } from '@/api/community'
import { useEffect, useState } from 'react'
import { MarkdownBody } from '@/components/markdown-body'
import { StatusBadge, formatSubmitStatus } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatRelativeTime } from '@/lib/discover-feed'
import { getSubmitLink } from '@/lib/link'
import type { PreviewTarget } from './types'

type Props = {
  target: PreviewTarget | null
  onOpenChange: (open: boolean) => void
}

export function FeedPreviewSheet({ target, onOpenChange }: Props) {
  const open = Boolean(target)
  const [solutionMd, setSolutionMd] = useState('')
  const [loadingSolution, setLoadingSolution] = useState(false)

  useEffect(() => {
    if (!target || target.type !== 'activity') {
      setSolutionMd('')
      return
    }
    const a = target.item.activity
    if (!a || a.type !== 'solution') {
      setSolutionMd(target.item.body)
      return
    }
    let cancelled = false
    setLoadingSolution(true)
    void getProblemSolution(a.refId).then((res) => {
      if (cancelled) return
      setLoadingSolution(false)
      if (res.success && res.data?.contentMd) {
        setSolutionMd(res.data.contentMd)
      } else {
        setSolutionMd(target.item.body || a.excerpt || a.title)
      }
    })
    return () => {
      cancelled = true
    }
  }, [target])

  const item = target?.item
  const submit = item?.submit
  const activity = item?.activity
  const submitUrl =
    submit &&
    getSubmitLink(submit.platform, submit.contest, submit.submitId)

  const detailHref = (() => {
    if (submit?.problemId) return `/question-bank/detail/${submit.problemId}`
    if (activity?.problemId) {
      if (activity.type === 'solution') {
        return `/question-bank/detail/${activity.problemId}/solution/${activity.refId}`
      }
      return `/question-bank/detail/${activity.problemId}?tab=comments`
    }
    return null
  })()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg"
        data-discover-preview-sheet=""
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="pr-8 text-left text-base leading-snug">
            {item?.title || '预览'}
          </SheetTitle>
          <SheetDescription className="text-left">
            {item
              ? `${item.authorName} · ${item.actionLabel} · ${formatRelativeTime(item.timeSec)}`
              : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 py-4">
          {target?.type === 'comments' ? (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-muted-foreground">
                在题目详情里查看和参与讨论，不会打断你当前的浏览位置。
              </p>
              {detailHref ? (
                <Button asChild>
                  <Link to={detailHref}>打开题目讨论</Link>
                </Button>
              ) : (
                <p className="text-muted-foreground">暂无关联题目</p>
              )}
              {item?.body ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <MarkdownBody content={item.body} className="text-sm" />
                </div>
              ) : null}
            </div>
          ) : null}

          {target?.type === 'submit' && submit ? (
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={submit.status} />
                <span className="text-muted-foreground">
                  {submit.platform}
                  {submit.lang ? ` · ${submit.lang}` : ''}
                </span>
              </div>
              {item?.body ? (
                <MarkdownBody content={item.body} className="text-sm" />
              ) : null}
              <div className="flex flex-wrap gap-2">
                {submitUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={submitUrl} target="_blank" rel="noreferrer">
                      查看提交详情
                    </a>
                  </Button>
                ) : null}
                {detailHref ? (
                  <Button asChild size="sm">
                    <Link to={detailHref}>打开题目</Link>
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatSubmitStatus(submit.status)}
              </p>
            </div>
          ) : null}

          {target?.type === 'activity' ? (
            <div className="flex flex-col gap-3">
              {loadingSolution ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <MarkdownBody
                  content={solutionMd || item?.body || ''}
                  className="text-sm"
                />
              )}
              {detailHref ? (
                <Button asChild size="sm" className="self-start">
                  <Link to={detailHref}>在题目页打开</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
