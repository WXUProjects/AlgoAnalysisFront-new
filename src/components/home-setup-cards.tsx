import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2Icon,
  CheckCircle2Icon,
  LinkIcon,
  ListChecksIcon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react'
import { getProfileById } from '@/api/profile'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { userSyncHealth } from '@/lib/spider-health'
import { OrgRole } from '@/lib/roles'
import { cn } from '@/lib/utils'

function storageKey(parts: Array<string | number>) {
  return `goalgo:setup:${parts.join(':')}`
}

function readDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeDismissed(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
}

/**
 * 首页冷启动引导：绑 OJ / 加入组织 / 教练清单。
 * 可 dismiss，按 userId（+ orgId）隔离。
 */
export function HomeSetupCards() {
  const { isLogin, user, orgs, currentOrg, isCoach, isCaptain, isOrgAdmin } = useAuth()
  const [spidersLen, setSpidersLen] = useState<number | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<number | undefined>(undefined)
  const [spiders, setSpiders] = useState<
    Array<{ lastSyncAt?: number; lastFailAt?: number; lastError?: string }>
  >([])
  const [tick, setTick] = useState(0)

  const uid = user?.userId || 0

  useEffect(() => {
    if (!isLogin || !uid) return
    let cancelled = false
    void getProfileById(uid).then((res) => {
      if (cancelled || !res.success || !res.data) return
      setSpidersLen(res.data.spiders?.length ?? 0)
      setLastSyncAt(res.data.lastSyncAt)
      setSpiders(res.data.spiders || [])
    })
    return () => {
      cancelled = true
    }
  }, [isLogin, uid])

  const onlyPublic =
    isLogin &&
    (orgs || []).filter((o) => !o.isSystem).length === 0

  const isStaff =
    isOrgAdmin ||
    isCoach ||
    isCaptain ||
    currentOrg?.myRole === OrgRole.OrgAdmin ||
    currentOrg?.myRole === OrgRole.Coach ||
    currentOrg?.myRole === OrgRole.Captain

  const nonSystemOrg =
    currentOrg && !currentOrg.isSystem && (currentOrg.id || 0) > 0

  const bindKey = storageKey(['bind-oj', uid])
  const joinKey = storageKey(['join-org', uid])
  const coachKey = storageKey(['coach', uid, currentOrg?.id || 0])

  const showBind =
    isLogin &&
    spidersLen === 0 &&
    !readDismissed(bindKey)
  const showJoin = isLogin && onlyPublic && !readDismissed(joinKey)
  const showCoach =
    isLogin &&
    isStaff &&
    nonSystemOrg &&
    !readDismissed(coachKey)

  const syncHint = useMemo(() => {
    if (!isLogin || spidersLen === null || spidersLen === 0) return null
    return userSyncHealth(spiders as never, lastSyncAt)
  }, [isLogin, spidersLen, spiders, lastSyncAt])

  // re-render after dismiss
  void tick

  if (!isLogin) return null
  if (!showBind && !showJoin && !showCoach && !syncHint) return null

  return (
    <div className="flex flex-col gap-3">
      {showBind ? (
        <Card className="border-dashed shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <LinkIcon className="size-4 text-muted-foreground" />
                绑定 OJ 账号
              </CardTitle>
              <CardDescription>
                绑定后才会自动同步提交与比赛记录，首页数据才会「活」起来。
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                writeDismissed(bindKey)
                setTick((t) => t + 1)
              }}
            >
              稍后
            </Button>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <Button asChild size="sm">
              <Link to="/change-profile?focus=oj">去绑定</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {syncHint ? (
        <Card
          className={cn(
            'shadow-none',
            syncHint.kind === 'failed'
              ? 'border-destructive/40'
              : 'border-amber-500/30',
          )}
        >
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-base">{syncHint.label}</CardTitle>
            <CardDescription>{syncHint.detail}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <Button asChild size="sm" variant="secondary">
              <Link to="/change-profile?focus=oj">检查绑定</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {showJoin ? (
        <Card className="border-dashed shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2Icon className="size-4 text-muted-foreground" />
                加入校队 / 组织
              </CardTitle>
              <CardDescription>
                你目前只在公共域。向教练要团队识别码，加入后可看队内统计与公告。
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                writeDismissed(joinKey)
                setTick((t) => t + 1)
              }}
            >
              知道了
            </Button>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <Button asChild size="sm">
              <Link to="/org">输入识别码</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/discover?tab=orgs">浏览组织</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {showCoach ? (
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecksIcon className="size-4 text-muted-foreground" />
                {currentOrg?.name || '组织'} · 开箱清单
              </CardTitle>
              <CardDescription>
                把队伍跑起来：邀请队员、看本周队况、导出训练报告。
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                writeDismissed(coachKey)
                setTick((t) => t + 1)
              }}
            >
              不再显示
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0">
            <ChecklistLink
              to="/admin/org"
              icon={<UsersIcon className="size-3.5" />}
              title="复制邀请链接 / 处理加入申请"
            />
            <ChecklistLink
              to="/admin/statistics"
              icon={<SparklesIcon className="size-3.5" />}
              title="打开本周队况与训练报告"
            />
            <ChecklistLink
              to="/admin/user"
              icon={<CheckCircle2Icon className="size-3.5" />}
              title="查看成员与分组"
            />
            <ChecklistLink
              to="/admin/bulletin"
              icon={<ListChecksIcon className="size-3.5" />}
              title="发一条组织公告"
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function ChecklistLink({
  to,
  icon,
  title,
}: {
  to: string
  icon: ReactNode
  title: string
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="h-auto justify-start gap-2 py-2 text-left font-normal"
    >
      <Link to={to}>
        <span className="text-muted-foreground">{icon}</span>
        <span>{title}</span>
      </Link>
    </Button>
  )
}
