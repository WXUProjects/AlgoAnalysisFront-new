import { reportCommunity } from '@/api/community'
import type { CommunityTargetType } from '@shared/api'
import { ReportDialog } from '@/components/report-dialog'

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
 * 举报评论 / 题解弹窗（通用 ReportDialog 的社区封装）。
 */
export function CommunityReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  ownerUserId,
  myUserId,
}: Props) {
  return (
    <ReportDialog
      open={open}
      onOpenChange={onOpenChange}
      targetLabel={targetType === 'solution' ? '题解' : '评论'}
      onSubmit={async (reason) => {
        if (myUserId && ownerUserId && myUserId === ownerUserId) {
          return { success: false, message: '不能举报自己的内容' }
        }
        return reportCommunity({ targetType, targetId, reason })
      }}
    />
  )
}
