import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { listAllGroups } from '@/api/group'
import {
  createSquad,
  deleteSquad,
  listSquadMembers,
  listSquads,
  setSquadMember,
  updateSquad,
} from '@/api/squad'
import type { GroupInfo, SquadInfo } from '@shared/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

/**
 * 分组内分队管理：创建分队、调整成员。
 */
export function SquadPanel({ canWrite }: { canWrite: boolean }) {
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [squads, setSquads] = useState<SquadInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(0)
  const [members, setMembers] = useState<
    Array<{ userId: number; username: string; name: string }>
  >([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGroupId, setNewGroupId] = useState('')
  const [creating, setCreating] = useState(false)
  const [addUserId, setAddUserId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [g, s] = await Promise.all([listAllGroups(), listSquads()])
    setLoading(false)
    if (g.success && g.data?.list) setGroups(g.data.list)
    if (s.success && s.data) {
      setSquads(s.data)
      if (!selectedId && s.data[0]) setSelectedId(s.data[0].id)
    }
  }, [selectedId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedId) {
      setMembers([])
      return
    }
    let cancelled = false
    setMembersLoading(true)
    void listSquadMembers(selectedId).then((res) => {
      if (cancelled) return
      setMembersLoading(false)
      if (res.success && res.data) setMembers(res.data)
      else setMembers([])
    })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const selected = squads.find((s) => s.id === selectedId)

  async function onCreate() {
    const gid = Number(newGroupId)
    if (!gid || !newName.trim()) {
      toast.error('请选择分组并填写分队名称')
      return
    }
    setCreating(true)
    const res = await createSquad({ groupId: gid, name: newName.trim() })
    setCreating(false)
    if (!res.success) {
      toast.error(res.message || '创建失败')
      return
    }
    toast.success('分队已创建')
    setNewName('')
    await load()
    if (res.data?.id) setSelectedId(res.data.id)
  }

  async function onRename() {
    if (!selected) return
    const name = window.prompt('分队名称', selected.name)
    if (!name?.trim()) return
    const res = await updateSquad({ id: selected.id, name: name.trim() })
    if (!res.success) toast.error(res.message || '保存失败')
    else {
      toast.success('已保存')
      void load()
    }
  }

  async function onDelete() {
    if (!selected) return
    if (!window.confirm(`确定删除分队「${selected.name}」？队员会移出分队，不会退出组织。`)) {
      return
    }
    const res = await deleteSquad(selected.id)
    if (!res.success) toast.error(res.message || '删除失败')
    else {
      toast.success('已删除')
      setSelectedId(0)
      void load()
    }
  }

  async function onAddMember() {
    const uid = Number(addUserId)
    if (!selectedId || !uid) {
      toast.error('请填写用户 ID')
      return
    }
    const res = await setSquadMember({ squadId: selectedId, userId: uid, in: true })
    if (!res.success) toast.error(res.message || '加入失败')
    else {
      toast.success('已加入分队')
      setAddUserId('')
      const m = await listSquadMembers(selectedId)
      if (m.success && m.data) setMembers(m.data)
      void load()
    }
  }

  async function onRemove(userId: number) {
    if (!selectedId) return
    const res = await setSquadMember({ squadId: selectedId, userId, in: false })
    if (!res.success) toast.error(res.message || '移出失败')
    else {
      toast.success('已移出')
      setMembers((prev) => prev.filter((m) => m.userId !== userId))
      void load()
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">分队</CardTitle>
        <CardDescription>
          分组下面还可以再拆分队。教练可按分队看训练数据；队长可被限制为只管理某一分队。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : squads.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有分队</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {squads.map((s) => {
                const gname = groups.find((g) => Number(g.id) === s.groupId)?.name
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-muted/50 ${
                        selectedId === s.id ? 'border-primary bg-muted/40' : ''
                      }`}
                    >
                      <span className="truncate font-medium">{s.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {gname || `组#${s.groupId}`} · {s.memberCount ?? 0} 人
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {canWrite ? (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <p className="text-sm font-medium">新建分队</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>所属分组</Label>
                  <Select value={newGroupId} onValueChange={setNewGroupId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择分组" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.name || `组 #${g.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>分队名称</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="例如：A 队"
                  />
                </div>
              </div>
              <Button type="button" size="sm" disabled={creating} onClick={() => void onCreate()}>
                {creating ? <Spinner data-icon="inline-start" /> : null}
                创建分队
              </Button>
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">
                    分组 ID {selected.groupId} · 分队 ID {selected.id}
                  </p>
                </div>
                {canWrite ? (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void onRename()}>
                      改名
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => void onDelete()}>
                      删除
                    </Button>
                  </div>
                ) : null}
              </div>
              {membersLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无队员</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {members.map((m) => (
                    <li
                      key={m.userId}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">
                        {m.name || m.username}
                        <span className="ml-1 text-xs text-muted-foreground">#{m.userId}</span>
                      </span>
                      {canWrite ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void onRemove(m.userId)}
                        >
                          移出
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {canWrite ? (
                <div className="flex flex-wrap items-end gap-2 border-t pt-3">
                  <div className="min-w-[8rem] flex-1 space-y-1">
                    <Label htmlFor="squad-add-uid">加入队员（用户 ID）</Label>
                    <Input
                      id="squad-add-uid"
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                      placeholder="例如 72"
                    />
                  </div>
                  <Button type="button" size="sm" onClick={() => void onAddMember()}>
                    加入
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">选择左侧分队查看队员</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
