import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { listAllGroups } from '@/api/group'
import { listOrgMembers, setSquadCaptain } from '@/api/org'
import {
  createSquad,
  deleteSquad,
  listSquadMembers,
  listSquads,
  setSquadMember,
  updateSquad,
} from '@/api/squad'
import type { GroupInfo, OrgMemberInfo, SquadInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
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
import { Badge } from '@/components/ui/badge'
import { Perm } from '@/lib/permissions'

type SquadMemberRow = {
  userId: number
  username: string
  name: string
  isCaptain?: boolean
}

/**
 * 分组内分队管理：创建分队、模糊搜索加人、队内任命队长。
 */
export function SquadPanel({ canWrite }: { canWrite: boolean }) {
  const { currentOrg, user, can } = useAuth()
  const orgId = currentOrg?.id || user?.orgId || 0
  const canAppoint = can(Perm.OrgMemberRole)

  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [squads, setSquads] = useState<SquadInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(0)
  const [members, setMembers] = useState<SquadMemberRow[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGroupId, setNewGroupId] = useState('')
  const [creating, setCreating] = useState(false)

  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState<OrgMemberInfo[]>([])
  const [searching, setSearching] = useState(false)
  const [captainIds, setCaptainIds] = useState<Set<number>>(new Set())

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

  const refreshCaptains = useCallback(async () => {
    if (!orgId || !selectedId) {
      setCaptainIds(new Set())
      return
    }
    // 从成员列表 scopes 推断本分队队长（分页拉全量 staff 成本高，改为按 keyword 空拉一页够用时）
    // 更稳：listOrgMembers 多页；此处拉较大 pageSize
    const r = await listOrgMembers(orgId, { page: 1, pageSize: 100 })
    if (!r.success) return
    const ids = new Set<number>()
    for (const m of r.list) {
      const scopes = m.scopes || []
      if (
        scopes.some(
          (sc) => sc.scopeType === 'squad' && Number(sc.scopeId) === selectedId,
        )
      ) {
        ids.add(m.userId)
      }
    }
    setCaptainIds(ids)
  }, [orgId, selectedId])

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
    void listSquadMembers(selectedId).then(async (res) => {
      if (cancelled) return
      setMembersLoading(false)
      if (res.success && res.data) setMembers(res.data)
      else setMembers([])
      await refreshCaptains()
    })
    return () => {
      cancelled = true
    }
  }, [selectedId, refreshCaptains])

  useEffect(() => {
    if (!search.trim() || !orgId) {
      setCandidates([])
      return
    }
    const t = window.setTimeout(async () => {
      setSearching(true)
      const r = await listOrgMembers(orgId, {
        page: 1,
        pageSize: 20,
        keyword: search.trim(),
      })
      setSearching(false)
      if (r.success) {
        const inSquad = new Set(members.map((m) => m.userId))
        setCandidates(r.list.filter((m) => !inSquad.has(m.userId)))
      }
    }, 300)
    return () => window.clearTimeout(t)
  }, [search, orgId, members])

  const selected = squads.find((s) => s.id === selectedId)
  const groupName =
    groups.find((g) => Number(g.id) === selected?.groupId)?.name ||
    (selected ? `分组 #${selected.groupId}` : '')

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
    if (
      !window.confirm(
        `确定删除分队「${selected.name}」？队员会移出分队，不会退出组织；该分队队长职务会解除。`,
      )
    ) {
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

  async function onAddMember(userId: number) {
    if (!selectedId || !userId) return
    const res = await setSquadMember({
      squadId: selectedId,
      userId,
      in: true,
    })
    if (!res.success) toast.error(res.message || '加入失败')
    else {
      toast.success('已加入分队')
      setSearch('')
      setCandidates([])
      const m = await listSquadMembers(selectedId)
      if (m.success && m.data) setMembers(m.data)
      void load()
    }
  }

  async function onRemove(userId: number) {
    if (!selectedId) return
    const res = await setSquadMember({
      squadId: selectedId,
      userId,
      in: false,
    })
    if (!res.success) toast.error(res.message || '移出失败')
    else {
      toast.success('已移出')
      setMembers((prev) => prev.filter((m) => m.userId !== userId))
      void load()
    }
  }

  async function onToggleCaptain(userId: number, name: string, on: boolean) {
    if (!orgId || !selectedId) return
    const res = await setSquadCaptain(orgId, userId, selectedId, on)
    if (!res.success) toast.error(res.message || '操作失败')
    else {
      toast.success(
        on
          ? `已任命「${name}」为「${groupName} / ${selected?.name || '分队'}」队长`
          : `已解除「${name}」在本分队的队长职务`,
      )
      await refreshCaptains()
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">分队</CardTitle>
        <CardDescription>
          分组下可建多支分队。可模糊搜索加人；可在队内直接任命队长。一人可兼任多队队长，也可同时担任组长。
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
                const gname =
                  groups.find((g) => Number(g.id) === s.groupId)?.name
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
              <Button
                type="button"
                size="sm"
                disabled={creating}
                onClick={() => void onCreate()}
              >
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
                    所属分组：{groupName}
                  </p>
                </div>
                {canWrite ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void onRename()}
                    >
                      改名
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void onDelete()}
                    >
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
                  {members.map((m) => {
                    const label = m.name || m.username
                    const isCap = captainIds.has(m.userId)
                    return (
                      <li
                        key={m.userId}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-1.5 truncate">
                          <span className="truncate">{label}</span>
                          {isCap ? (
                            <Badge variant="secondary" className="shrink-0">
                              队长
                            </Badge>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 gap-1">
                          {canAppoint ? (
                            <Button
                              type="button"
                              size="sm"
                              variant={isCap ? 'outline' : 'secondary'}
                              onClick={() =>
                                void onToggleCaptain(m.userId, label, !isCap)
                              }
                            >
                              {isCap ? '卸任队长' : '设为队长'}
                            </Button>
                          ) : null}
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
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
              {canWrite ? (
                <div className="space-y-2 border-t pt-3">
                  <Label htmlFor="squad-add-search">加入队员</Label>
                  <Input
                    id="squad-add-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="按组织内名称或用户名搜索"
                  />
                  {searching ? (
                    <p className="text-xs text-muted-foreground">搜索中…</p>
                  ) : null}
                  {candidates.map((c) => (
                    <div
                      key={c.userId}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {c.name || c.orgDisplayName || c.username}
                        {c.username ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            @{c.username}
                          </span>
                        ) : null}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void onAddMember(c.userId)}
                      >
                        加入
                      </Button>
                    </div>
                  ))}
                  {search.trim() && !searching && candidates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      没有找到可加入的成员
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              选择左侧分队查看队员
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
