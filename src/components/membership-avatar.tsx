import { cn } from '@/lib/utils'

export type MembershipTier = 'plus' | 'pro' | null | string

/** 会员光环：纯辉光无实心边框，大范围光晕 */
const tierGlow: Record<string, string> = {
  plus: cn(
    'shadow-[0_0_16px_rgba(180,180,200,0.45),0_0_40px_rgba(170,175,195,0.28),0_0_70px_rgba(160,165,185,0.14)]',
    'dark:shadow-[0_0_18px_rgba(200,200,215,0.42),0_0_44px_rgba(190,195,210,0.26),0_0_76px_rgba(180,185,200,0.12)]',
  ),
  pro: cn(
    'shadow-[0_0_18px_rgba(245,158,11,0.5),0_0_45px_rgba(234,179,8,0.32),0_0_80px_rgba(251,191,36,0.16),0_0_120px_rgba(251,191,36,0.06)]',
    'dark:shadow-[0_0_20px_rgba(251,191,36,0.48),0_0_48px_rgba(245,158,11,0.3),0_0_85px_rgba(234,179,8,0.15),0_0_130px_rgba(234,179,8,0.05)]',
  ),
}

interface MembershipAvatarProps {
  tier?: MembershipTier
  className?: string
  children: React.ReactNode
}

/**
 * 会员头像光环：纯辉光无实心边框，大范围柔光。
 * box-shadow 方案，不占布局，不染透明背景。
 */
export function MembershipAvatar({
  tier,
  className,
  children,
}: MembershipAvatarProps) {
  const glow = tier ? tierGlow[tier] : undefined
  if (!glow) return <>{children}</>
  return (
    <span className={cn('inline-flex shrink-0 select-none rounded-full', glow, className)}>
      {children}
    </span>
  )
}
