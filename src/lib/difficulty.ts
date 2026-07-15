import { cn } from '@/lib/utils'

/** 难度徽章 class（简单/中等/困难） */
export function difficultyBadgeClass(difficulty?: string | null): string {
  if (!difficulty) return ''
  return cn(
    difficulty === '困难' &&
      'border-transparent bg-red-500/15 text-red-700 dark:text-red-400',
    difficulty === '中等' &&
      'border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-400',
    difficulty === '简单' &&
      'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  )
}
