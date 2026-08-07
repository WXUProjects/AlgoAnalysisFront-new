import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { listAllGroups } from '@/api/group'
import { listScopes, listSquads, setScopes } from '@/api/squad'
import type { ScopeGrant, SquadInfo } from '@shared/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  orgId: number
  userId: number
  userName: string
}

/**
 * 为教练/队长设置管理范围：不选 = 全组织；可选若干分组/分队。
 */
export function ScopeGrantDialog({
  open,
  onOpenChange,
  orgId,
  userId,
  userName,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [groups, setGroups] = useState<Array<{ id: number; name: string }>>([])
  const [squads, setSquads] = useState<SquadInfo[]>([])
  const [selected, setSelected] = useState<ScopeGrant[]>([])

  useEffect(() => {
    if (!open || !userId) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      const [g, s, sc] = await Promise.all([
        listAllGroups(),
        listSquads({ orgId }),
        listScopes({ orgId, userId }),
      ])
      if (cancelled) return
      setLoading(false)
      if (g.success && g.data?.list) {
        setGroups(g.data.list.map((x) => ({ id: Number(x.id), name: x.name || `#${x.id}` })))
      }
      if (s.success && s.data) setSquads(s.data)
      if (sc.success && sc.data) setSelected(sc.data)
      else setSelected([])
    })()
    return () => {
      cancelled = true
    }
  }, [open, orgId, userId])

  function toggle(grant: ScopeGrant) {
    setSelected((prev) => {
      const exists = prev.some(
        (p) => p.scopeType === grant.scopeType && p.scopeId === grant.scopeId,
      )
      if (exists) {
        return prev.filter(
          (p) => !(p.scopeType === grant.scopeType && p.scopeId === grant.scopeId),
        )
      }
      return [...prev, grant]
    })
  }

  function isOn(type: 'group' | 'squad', id: number) {
    return selected.some((p) => p.scopeType === type && p.scopeId === id)
  }

  async function save() {
    setSaving(true)
    const res = await setScopes({ orgId, userId, grants: selected })
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '保存失败')
      return
    }
    toast.success(
      selected.length === 0
        ? '已设为全组织可见'
        : `已限制为 ${selected.length} 个范围`,
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>管理范围 · {userName}</DialogTitle>
          <DialogDescription>
            不勾选任何项 = 可看全组织。勾选后，对方在组织数据/训练报告里只能看到这些分组或分队的成员。
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>分组</Label>
              <div className="flex flex-col gap-1.5">
                {groups.length === 0 ? (
                  <p className="text-xs text-muted-foreground">还没有分组</p>
                ) : (
                  groups.map((g) => (
                    <label
                      key={g.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={isOn('group', g.id)}
                        onChange={() => toggle({ scopeType: 'group', scopeId: g.id })}
                      />
                      {g.name}
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>分队</Label>
              <div className="flex flex-col gap-1.5">
                {squads.length === 0 ? (
                  <p className="text-xs text-muted-foreground">还没有分队</p>
                ) : (
                  squads.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={isOn('squad', s.id)}
                        onChange={() => toggle({ scopeType: 'squad', scopeId: s.id })}
                      />
                      {s.name}
                      <span className="text-xs text-muted-foreground">组#{s.groupId}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={saving || loading} onClick={() => void save()}>
            {saving ? <Spinner data-icon="inline-start" /> : null}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
