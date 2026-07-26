import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SITE_IDENTITY_ORDER,
  SiteIdentity,
  SiteIdentityLabel,
  type SiteIdentityValue,
} from '@/lib/roles'

/**
 * 站点内置身份下拉（站点用户管理用）：按权限从大到小排列。
 * 仅当选中与当前不同的身份时触发 onIdentityChange；
 * 二次确认与保存流程由调用方负责。
 */
export function SiteIdentitySelect({
  value,
  onIdentityChange,
  disabled,
  triggerClassName = 'w-40',
  ariaLabel,
}: {
  value?: SiteIdentityValue
  onIdentityChange: (next: SiteIdentityValue) => void
  disabled?: boolean
  triggerClassName?: string
  ariaLabel?: string
}) {
  const current = value || SiteIdentity.User
  return (
    <Select
      value={current}
      disabled={disabled}
      onValueChange={(next) => {
        const v = next as SiteIdentityValue
        if (v && v !== current) onIdentityChange(v)
      }}
    >
      <SelectTrigger
        className={triggerClassName}
        aria-label={ariaLabel || '设置站点身份'}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {SITE_IDENTITY_ORDER.map((v) => (
            <SelectItem key={v} value={v}>
              {SiteIdentityLabel[v] || v}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
