import { Link } from 'react-router-dom'
import type { SharedOrgAlias } from '@shared/api'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type UserIdentityData = {
  username: string
  /** 主展示名（当前域称呼 / 公共域昵称） */
  name?: string | null
  sharedOrgs?: SharedOrgAlias[] | null
  /** 全站特殊身份（仅公共域视图展示 badge） */
  isSiteAdmin?: boolean | null
  /** 自定义站点角色名（仅公共域视图展示 badge） */
  siteRoles?: string[] | null
}

/** 解析主展示文案：name 优先，否则 @username */
export function resolveDisplayName(
  user: Pick<UserIdentityData, 'name' | 'username'>,
): string {
  const n = (user.name || '').trim()
  if (n) return n
  return user.username || '用户'
}

/**
 * 用户主展示名 + 共属组织徽章。
 * 主名：当前域称呼；不在当前域则为公共域昵称。
 * 徽章：双方共属的其他域（含公共域；切换组织后仍显示），后端已做隐私裁剪。
 */
export function UserIdentity({
  user,
  className,
  nameClassName,
  nameRowClassName,
  linkToProfile = true,
  showUsername = true,
  size = 'default',
  /** 公共域下展示全站特殊身份 badge */
  showRoleBadges = false,
}: {
  user: UserIdentityData
  className?: string
  nameClassName?: string
  /** 主名 + 身份/组织徽章那一行（用于居中等） */
  nameRowClassName?: string
  /** 主名是否链到资料页 */
  linkToProfile?: boolean
  /** 是否显示 @username 副行 */
  showUsername?: boolean
  size?: 'default' | 'lg' | 'sm'
  showRoleBadges?: boolean
}) {
  const display = resolveDisplayName(user)
  // 主名已是队内名时仍可展示「组织名」；displayName 与主名相同则只标组织
  const badges = (user.sharedOrgs || []).filter((a) => a.orgName || a.displayName)
  const roleBadges: { key: string; label: string }[] = []
  if (showRoleBadges) {
    if (user.isSiteAdmin) {
      roleBadges.push({ key: 'site_admin', label: '站点管理员' })
    }
    // 自定义站点角色：站管已有专属徽章，这里只补角色名
    for (const name of user.siteRoles || []) {
      const label = (name || '').trim()
      if (label) roleBadges.push({ key: `site_role:${label}`, label })
    }
  }

  const nameEl = linkToProfile && user.username ? (
    <Link
      to={`/profile/${user.username}`}
      className={cn(
        'truncate font-medium hover:underline',
        size === 'lg' && 'text-base sm:text-lg lg:text-xl',
        size === 'sm' && 'text-sm',
        nameClassName,
      )}
    >
      {display}
    </Link>
  ) : (
    <span
      className={cn(
        'truncate font-medium',
        size === 'lg' && 'text-base sm:text-lg lg:text-xl',
        size === 'sm' && 'text-sm',
        nameClassName,
      )}
    >
      {display}
    </span>
  )

  return (
    <div className={cn('min-w-0 flex flex-col gap-0.5', className)}>
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-center gap-1.5',
          nameRowClassName,
        )}
      >
        {nameEl}
        {roleBadges.map((b) => (
          <Badge
            key={b.key}
            variant={b.key === 'site_admin' ? 'default' : 'secondary'}
            className="max-w-[8rem] truncate font-normal"
          >
            {b.label}
          </Badge>
        ))}
        {badges.length > 0 &&
          badges.slice(0, 3).map((a) => (
            <SharedOrgBadge key={a.orgId || a.orgName} alias={a} primary={display} />
          ))}
        {badges.length > 3 && (
          <Badge variant="outline" className="max-w-[8rem] truncate font-normal">
            +{badges.length - 3}
          </Badge>
        )}
      </div>
      {showUsername && user.username ? (
        <p
          className={cn(
            'truncate text-muted-foreground',
            size === 'lg' ? 'text-xs sm:text-sm' : 'text-xs',
          )}
        >
          @{user.username}
        </p>
      ) : null}
    </div>
  )
}

function SharedOrgBadge({
  alias,
  primary,
}: {
  alias: SharedOrgAlias
  primary: string
}) {
  const org = (alias.orgName || '校队').trim()
  const dn = (alias.displayName || '').trim()
  // 主名已是该称呼时只标组织，避免「伞恩晨 · 伞恩晨」
  const label =
    dn && dn !== primary.trim() ? `${org} · ${dn}` : org
  return (
    <Badge
      variant="secondary"
      className="max-w-[12rem] truncate font-normal"
      title={dn && dn !== primary.trim() ? `${org}内称呼：${dn}` : `都在这：${org}`}
    >
      {label}
    </Badge>
  )
}
