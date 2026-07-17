import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'error' | 'warning' | 'info' | 'muted' | 'purple'

const toneClass: Record<StatusTone, string> = {
  success:
    'border-transparent bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  error:
    'border-transparent bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  warning:
    'border-transparent bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
  info:
    'border-transparent bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
  purple:
    'border-transparent bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
  muted:
    'border-transparent bg-muted text-muted-foreground',
}

/**
 * 各 OJ 提交状态 → 用户可见的统一 ACM 展示名。
 * 映射不到则返回原串（trim 后）；空串视为 Judging。
 */
const ACM_STATUS_MAP: Record<string, string> = {
  // —— Accepted ——
  AC: 'Accepted',
  OK: 'Accepted',
  ACCEPTED: 'Accepted',
  答案正确: 'Accepted',

  // —— Wrong Answer ——
  WA: 'Wrong Answer',
  WRONG_ANSWER: 'Wrong Answer',
  答案错误: 'Wrong Answer',

  // —— Time Limit ——
  TLE: 'Time Limit Exceeded',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
  运行超时: 'Time Limit Exceeded',

  // —— Memory Limit ——
  MLE: 'Memory Limit Exceeded',
  MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded',
  内存超限: 'Memory Limit Exceeded',

  // —— Runtime Error（含段错误/浮点/执行出错）——
  RE: 'Runtime Error',
  RUNTIME_ERROR: 'Runtime Error',
  运行错误: 'Runtime Error',
  段错误: 'Runtime Error',
  浮点错误: 'Runtime Error',
  执行出错: 'Runtime Error',
  CRASHED: 'Runtime Error',
  INPUT_PREPARATION_CRASHED: 'Runtime Error',

  // —— Compilation Error ——
  CE: 'Compilation Error',
  COMPILATION_ERROR: 'Compilation Error',
  COMPILE_ERROR: 'Compilation Error',
  编译错误: 'Compilation Error',
  'spj编译错误': 'Compilation Error',

  // —— Presentation / Output ——
  PE: 'Presentation Error',
  PRESENTATION_ERROR: 'Presentation Error',
  格式错误: 'Presentation Error',
  OLE: 'Output Limit Exceeded',
  OUTPUT_LIMIT_EXCEEDED: 'Output Limit Exceeded',
  输出超限: 'Output Limit Exceeded',

  // —— Idleness (CF) ——
  ILE: 'Idleness Limit Exceeded',
  IDLENESS_LIMIT_EXCEEDED: 'Idleness Limit Exceeded',

  // —— 其它 CF / 通用 ——
  PARTIAL: 'Partial',
  SKIPPED: 'Skipped',
  CHALLENGED: 'Challenged',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
  SV: 'Security Violated',
  SECURITY_VIOLATED: 'Security Violated',

  // —— 评测中 ——
  TESTING: 'Judging',
  PENDING: 'Judging',
  JUDGING: 'Judging',
  IN_QUEUE: 'Judging',
  正在判题: 'Judging',

  // —— 力扣日历合成提交（无 verdict）——
  SUBMIT: 'Submitted',
}

/** 提交结果 → 标准 ACM 文案；未知原样 */
export function formatSubmitStatus(status?: string | null): string {
  const s = (status || '').trim()
  if (!s) return 'Judging'
  // 先精确匹配（含中文 key）
  if (ACM_STATUS_MAP[s]) return ACM_STATUS_MAP[s]
  const u = s.toUpperCase()
  if (ACM_STATUS_MAP[u]) return ACM_STATUS_MAP[u]
  // 宽松：含关键字
  if (s.includes('正确') && !s.includes('错误')) return 'Accepted'
  if (s.includes('答案错误') || /^wrong/i.test(s)) return 'Wrong Answer'
  if (s.includes('超时') || s.includes('时间超')) return 'Time Limit Exceeded'
  if (s.includes('内存')) return 'Memory Limit Exceeded'
  if (s.includes('编译')) return 'Compilation Error'
  if (s.includes('格式')) return 'Presentation Error'
  if (s.includes('输出超')) return 'Output Limit Exceeded'
  if (s.includes('段错误') || s.includes('运行') || s.includes('浮点'))
    return 'Runtime Error'
  if (s.includes('判题') || s.includes('评测') || s.includes('等待'))
    return 'Judging'
  return s
}

/** 提交结果 / 用户做题状态 → 色调 */
export function statusTone(status?: string | null): StatusTone {
  const label = formatSubmitStatus(status)
  // 用归一化后的 ACM 名判断，避免中英/长短码漏配
  switch (label) {
    case 'Accepted':
      return 'success'
    case 'Wrong Answer':
      return 'error'
    case 'Time Limit Exceeded':
    case 'Memory Limit Exceeded':
    case 'Idleness Limit Exceeded':
    case 'Output Limit Exceeded':
      return 'info'
    case 'Runtime Error':
      return 'purple'
    case 'Compilation Error':
    case 'Partial':
    case 'Challenged':
    case 'Judging':
      return 'warning'
    case 'Presentation Error':
    case 'Skipped':
    case 'Rejected':
    case 'Failed':
    case 'Security Violated':
    case 'Submitted':
      return 'muted'
    default:
      break
  }

  const s = (status || '').trim()
  if (!s) return 'warning'
  const u = s.toUpperCase()
  if (u === 'TRIED' || s === '尝试过') return 'warning'
  if (u === 'NONE' || s === '未做') return 'muted'
  return 'muted'
}

export function formatUserStatus(status?: string | null): string {
  switch ((status || '').toUpperCase()) {
    case 'AC':
      return '已通过'
    case 'TRIED':
      return '尝试过'
    case 'NONE':
      return '未做'
    default:
      return status || '-'
  }
}

type StatusBadgeProps = {
  status?: string | null
  /** 题库 userStatus 时格式化为中文 */
  userStatus?: boolean
  className?: string
  asChild?: boolean
  children?: ReactNode
}

export function StatusBadge({
  status,
  userStatus = false,
  className,
  asChild,
  children,
}: StatusBadgeProps) {
  const label = userStatus
    ? formatUserStatus(status)
    : formatSubmitStatus(status)
  const tone = statusTone(status)

  return (
    <Badge
      variant="outline"
      asChild={asChild}
      className={cn(toneClass[tone], className)}
    >
      {asChild ? children : (children ?? label)}
    </Badge>
  )
}
