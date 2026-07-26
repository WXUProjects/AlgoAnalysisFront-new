import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OrgRole, OrgRoleLabel } from '@/lib/roles'

/** 展示顺序：成员 → 队长 → 教练 → 团队管理员 */
const ORG_ROLE_ORDER = [
  OrgRole.Member,
  OrgRole.Captain,
  OrgRole.Coach,
  OrgRole.OrgAdmin,
] as const

/**
 * 组织内系统角色下拉（成员管理 / 跨组织管理共用）。
 * 仅当选中与当前不同的角色时触发 onRoleChange；
 * 二次确认与保存流程由调用方负责。
 */
export function OrgRoleSelect({
  value,
  onRoleChange,
  disabled,
  triggerClassName = 'w-36',
  ariaLabel,
}: {
  value?: string
  onRoleChange: (next: string) => void
  disabled?: boolean
  triggerClassName?: string
  ariaLabel?: string
}) {
  const current = value || OrgRole.Member
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
          {ORG_ROLE_ORDER.map((r) => (
            <SelectItem key={r} value={r}>
              {OrgRoleLabel[r] || r}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
