import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  appointableRoles,
  OrgRole,
  OrgRoleLabel,
  type OrgRoleValue,
} from '@/lib/roles'

/** 展示顺序：成员 → 队长 → 组长 → 教练 → 组织管理员 */
const ORG_ROLE_ORDER: OrgRoleValue[] = [
  OrgRole.Member,
  OrgRole.Captain,
  OrgRole.GroupLeader,
  OrgRole.Coach,
  OrgRole.OrgAdmin,
]

/**
 * 组织内系统角色下拉（成员管理 / 跨组织管理共用）。
 * - allowedRoles：可选项；不传则展示全部五档
 * - 仅当选中与当前不同的角色时触发 onRoleChange
 */
export function OrgRoleSelect({
  value,
  onRoleChange,
  disabled,
  triggerClassName = 'w-36',
  ariaLabel,
  allowedRoles,
  actorRole,
}: {
  value?: string
  onRoleChange: (next: string) => void
  disabled?: boolean
  triggerClassName?: string
  ariaLabel?: string
  /** 显式可选项；优先于 actorRole */
  allowedRoles?: readonly string[]
  /** 按操作者等级过滤可任命角色（站管/组织管理员传 org_admin） */
  actorRole?: string | null
}) {
  const current = value || OrgRole.Member
  let options: string[] = [...ORG_ROLE_ORDER]
  if (allowedRoles && allowedRoles.length > 0) {
    options = ORG_ROLE_ORDER.filter((r) => allowedRoles.includes(r))
  } else if (actorRole) {
    const can = new Set(appointableRoles(actorRole))
    // 始终展示当前角色（便于看现状），但若当前不在可任命列表仍显示
    options = ORG_ROLE_ORDER.filter((r) => can.has(r) || r === current)
  }
  // 保证当前值在列表中
  if (!options.includes(current)) {
    options = [current, ...options]
  }

  return (
    <Select
      value={current}
      disabled={disabled}
      onValueChange={(next) => {
        if (next && next !== current) onRoleChange(next)
      }}
    >
      <SelectTrigger className={triggerClassName} aria-label={ariaLabel || '设置角色'}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((r) => (
            <SelectItem key={r} value={r}>
              {OrgRoleLabel[r] || r}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
