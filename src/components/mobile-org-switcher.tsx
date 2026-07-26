import type { OrgInfo } from '@shared/api'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OrgRole } from '@/lib/roles'
import { cn } from '@/lib/utils'

/**
 * 组织切换统一文案（侧边栏与移动端顶部一致）。
 * - 团队管理员：`{name} · 管理`
 * - 其他角色：仅组织名
 * 角色全称请用 roles.ts 的 orgRoleName / OrgRoleLabel。
 */
export function formatOrgSwitchLabel(name: string, myRole?: string | null): string {
  if (myRole === OrgRole.OrgAdmin) return `${name} · 管理`
  return name
}

/** 侧边栏/下拉项角色短后缀（仅团队管理员） */
export function orgRoleShortLabel(orgRole?: string | null): string {
  return orgRole === OrgRole.OrgAdmin ? '管理' : ''
}

interface MobileOrgSwitcherProps {
  orgs: OrgInfo[]
  currentOrgId?: number | null
  onSwitch: (orgId: number) => void
  className?: string
}

/**
 * 移动端顶部组织切换（AppLayout）。
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
