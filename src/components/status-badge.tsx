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

/** 提交结果 / 用户做题状态 → 色调 */
export function statusTone(status?: string | null): StatusTone {
  const s = (status || '').trim()
  if (!s) return 'muted'
  const u = s.toUpperCase()

  // 通过
  if (
    u === 'AC' ||
    u === 'OK' ||
    u === 'ACCEPTED' ||
    s === '答案正确' ||
    s === '已通过' ||
    (s.includes('正确') && !s.includes('错误'))
  ) {
    return 'success'
  }

  // 编译错误
  if (
    u === 'CE' ||
    u === 'COMPILATION_ERROR' ||
    u === 'COMPILE_ERROR' ||
    s === '编译错误' ||
    s.includes('编译')
  ) {
    return 'warning'
  }

  // 超时
  if (
    u === 'TLE' ||
    u === 'TIME_LIMIT_EXCEEDED' ||
    u === 'MLE' ||
    u === 'MEMORY_LIMIT_EXCEEDED' ||
    s === '运行超时' ||
    s.includes('超时') ||
    s.includes('时间超') ||
    s.includes('内存超')
  ) {
    return 'info'
  }

  // 运行时 / 段错误
  if (
    u === 'RE' ||
    u === 'RUNTIME_ERROR' ||
    s === '运行错误' ||
    s === '段错误' ||
    s.includes('运行时') ||
    s.includes('Runtime')
  ) {
    return 'purple'
  }

  // 错误答案
  if (
    u === 'WA' ||
    u === 'WRONG_ANSWER' ||
    s === '答案错误' ||
    s.includes('错误') ||
    s.includes('Wrong')
  ) {
    return 'error'
  }

  // 尝试过 / 评测中
  if (
    u === 'TRIED' ||
    s === '尝试过' ||
    u === 'TESTING' ||
    u === 'PENDING' ||
    u === 'JUDGING' ||
    s.includes('评测') ||
    s.includes('等待')
  ) {
    return 'warning'
  }

  // 未做
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
  const label = userStatus ? formatUserStatus(status) : status || '-'
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
