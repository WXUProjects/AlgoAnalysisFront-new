import type { OrgInfo } from '@shared/api'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/**
 * 组织切换统一文案（侧边栏与移动端顶部一致）。
 * - 团队管理员：`{name} · 管理`
 * - 其他角色：仅组织名
 */
export function formatOrgSwitchLabel(name: string, myRole?: string | null): string {
  if (myRole === 'org_admin') return `${name} · 管理`
  return name
}

/** @deprecated 与 formatOrgSwitchLabel 同义，保留给旧测试/调用 */
export function buildOrgTriggerText(
  orgName: string,
  myRole?: string | null,
  _isSiteAdmin?: boolean,
): string {
  return formatOrgSwitchLabel(orgName, myRole)
}

/** 侧边栏/下拉项角色短后缀（仅 org_admin） */
export function orgRoleShortLabel(orgRole?: string | null): string {
  if (orgRole === 'org_admin') return '管理'
  return ''
}

export function orgRoleFullName(orgRole?: string | null): string {
  if (!orgRole || orgRole === 'member') return '成员'
  if (orgRole === 'org_admin') return '团队管理员'
  if (orgRole === 'coach') return '教练'
  if (orgRole === 'captain') return '队长'
  return orgRole
}

export function siteAdminRoleName(): string {
  return '站点管理员'
}

interface MobileOrgSwitcherProps {
  orgs: OrgInfo[]
  currentOrgId?: number | null
  /** 保留入参兼容布局调用；展示文案与侧边栏一致，不因站管改变标签 */
  isSiteAdmin?: boolean
  onSwitch: (orgId: number) => void
  className?: string
}

/**
 * 移动端顶部组织切换（AppLayout + AdminLayout）。
 * 文案规则与侧边栏「当前组织」完全一致。
 */
export function MobileOrgSwitcher({
  orgs,
  currentOrgId,
  onSwitch,
  className,
}: MobileOrgSwitcherProps) {
  const current = orgs.find((o) => o.id === currentOrgId) ?? orgs[0]
  if (!current) return null

  const triggerText = formatOrgSwitchLabel(current.name, current.myRole)

  return (
    <Select
      value={String(current.id)}
      onValueChange={(v) => onSwitch(Number(v))}
    >
      <SelectTrigger
        size="sm"
        className={cn(
          'ml-auto h-11 shrink-0 max-w-[152px] min-w-0 text-xs md:hidden',
          '*:data-[slot=select-value]:line-clamp-none',
          className,
        )}
        aria-label="当前组织"
      >
        <SelectValue placeholder="选择组织" aria-label={triggerText}>
          <span className="truncate">{triggerText}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {orgs.map((o) => (
            <SelectItem key={o.id} value={String(o.id)}>
              {formatOrgSwitchLabel(o.name, o.myRole)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
