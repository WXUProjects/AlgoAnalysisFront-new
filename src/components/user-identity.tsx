import { Link } from 'react-router-dom'
import type { SharedOrgAlias } from '@shared/api'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  /** C 端订阅档 plus|pro（badge 数据源） */
  subTier?: string | null
  /** 目标在当前观众组织内的角色（org_admin 等；非当前域成员为空） */
  orgRole?: string | null
}

/** 解析主展示文案：name 优先，否则 @username */
export function resolveDisplayName(
  user: Pick<UserIdentityData, 'name' | 'username'>,
): string {
  const n = (user.name || '').trim()
  if (n) return n
  return user.username || '用户'
}

type BadgeItem = {
  key: string
  label: string
  variant: 'default' | 'secondary' | 'outline'
  className?: string
  title?: string
}

function renderBadge(b: BadgeItem) {
  return (
    <Badge
      key={b.key}
      variant={b.variant}
      className={cn('max-w-[8rem] truncate font-normal', b.className)}
      title={b.title}
    >
      {b.label}
    </Badge>
  )
}

/**
 * 徽章溢出折叠：最多显示 maxVisible 个，多余收进「+N」，
 * 鼠标悬停在 +N 上弹出被折叠的徽章。
 */
function CollapsibleBadges({
  badges,
  maxVisible = 3,
}: {
  badges: BadgeItem[]
  maxVisible?: number
}) {
  if (badges.length === 0) return null
  const visible = badges.slice(0, maxVisible)
  const hidden = badges.slice(maxVisible)
  return (
    <>
      {visible.map(renderBadge)}
      {hidden.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="max-w-[8rem] cursor-default truncate font-normal"
            >
              +{hidden.length}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {hidden.map((b) => (
                <span
                  key={b.key}
                  className="inline-flex items-center rounded-full bg-background/15 px-2 py-0.5 text-xs"
                  title={b.title}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </>
  )
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
  /** C 端会员 badge（Pro/Plus 会员；不受视图限制，始终可显） */
  showSubBadge = false,
  /** 单行模式：所有徽章与用户名同一行（用于关注/粉丝等紧凑列表） */
  singleRow = false,
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
  showSubBadge?: boolean
  singleRow?: boolean
}) {
  const display = resolveDisplayName(user)
  // 主名已是队内名时仍可展示「组织名」；displayName 与主名相同则只标组织
  const orgBadges: BadgeItem[] = (user.sharedOrgs || [])
    .filter((a) => a.orgName || a.displayName)
    .map((a) => {
      const org = (a.orgName || '校队').trim()
      const dn = (a.displayName || '').trim()
      // 主名已是该称呼时只标组织，避免「伞恩晨 · 伞恩晨」
      const label =
        dn && dn !== display.trim() ? `${org} · ${dn}` : org
      return {
        key: `org:${a.orgId || a.orgName}`,
        label,
        variant: 'secondary' as const,
        title:
          dn && dn !== display.trim() ? `${org}内称呼：${dn}` : `都在这：${org}`,
      }
    })

  const roleBadges: BadgeItem[] = []
  if (showRoleBadges) {
    if (user.isSiteAdmin) {
      roleBadges.push({ key: 'site_admin', label: '站点管理员', variant: 'default' })
    }
  }
  // 组织管理员（目标在当前观众组织内的角色；不受公共域视图限制）
  if (user.orgRole === 'org_admin') {
    roleBadges.push({
      key: 'org_admin',
      label: '组织管理员',
      variant: 'outline',
      className:
        'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700/60 dark:bg-sky-950/50 dark:text-sky-300',
    })
  }
  if (showRoleBadges) {
    // 自定义站点角色：站管已有专属徽章，这里只补角色名
    for (const name of user.siteRoles || []) {
      const label = (name || '').trim()
      if (label) roleBadges.push({ key: `site_role:${label}`, label, variant: 'secondary' })
    }
  }
  // C 端会员 badge：与视图无关，只要会员就显示（资料页 showSubBadge=true）
  const subBadge: BadgeItem | null =
    showSubBadge && user.subTier === 'pro'
      ? {
          key: 'sub_pro',
          label: 'Pro 会员',
          variant: 'outline',
          className:
            'border-amber-300 bg-amber-100 font-medium text-[11px] text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/50 dark:text-amber-300',
        }
      : showSubBadge && user.subTier === 'plus'
        ? {
            key: 'sub_plus',
            label: 'Plus 会员',
            variant: 'outline',
            className:
              'border-zinc-300 bg-zinc-100 font-medium text-[11px] text-zinc-700 dark:border-zinc-600/50 dark:bg-zinc-800/60 dark:text-zinc-300',
          }
        : null

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

  // 第一行：用户名旁至多一个 badge，优先会员档位；其余身份/组织徽章放第二行
  const primaryBadge =
    subBadge ?? (roleBadges.length > 0 ? roleBadges[0] : null)
  const secondaryBadges =
    (subBadge ? roleBadges : roleBadges.slice(1)).concat(orgBadges)

  if (singleRow) {
    return (
      <div className={cn('min-w-0 flex flex-col gap-0.5', className)}>
        <div
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-1.5',
            nameRowClassName,
          )}
        >
          {nameEl}
          <CollapsibleBadges
            badges={subBadge ? [subBadge, ...roleBadges, ...orgBadges] : [...roleBadges, ...orgBadges]}
          />
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

  return (
    <div className={cn('min-w-0 flex flex-col gap-0.5', className)}>
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-center gap-1.5',
          nameRowClassName,
        )}
      >
        {nameEl}
        {primaryBadge ? renderBadge(primaryBadge) : null}
      </div>
      {secondaryBadges.length > 0 ? (
        <div
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-1.5',
            nameRowClassName,
          )}
        >
          <CollapsibleBadges badges={secondaryBadges} />
        </div>
      ) : null}
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
