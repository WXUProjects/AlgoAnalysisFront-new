import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { joinOrg, previewInvite } from '@/api/org'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { getHomePath } from '@/lib/home-path'
import {
  buildOrgInvitePath,
  clearInviteCode,
  rememberInviteCode,
} from '@/lib/org-invite'

/**
 * 组织邀请落地页：/join?code=识别码
 * 未登录 → 欢迎文案 + 去注册/登录；已登录未加入 → 填队内名称后加入；
 * 已是成员 → 提示已加入，可切换/进入该组织
 */
export function OrgInvite() {
  const [searchParams] = useSearchParams()
  const code = (searchParams.get('code') || '').trim()
  const navigate = useNavigate()
  const { isLogin, ready, user, orgs, currentOrg, refreshOrgs, switchOrg } =
    useAuth()
  const homeTo = getHomePath(ready ? isLogin : false)

  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [orgId, setOrgId] = useState(0)
  const [brandLogo, setBrandLogo] = useState('')
  const [joinMode, setJoinMode] = useState('')
  const [error, setError] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [joining, setJoining] = useState(false)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    if (!code) {
      setLoading(false)
      setError('邀请链接无效，请向组织管理员重新索取')
      return
    }
    rememberInviteCode(code)
    let cancelled = false
    setLoading(true)
    void previewInvite(code).then((r) => {
      if (cancelled) return
      setLoading(false)
      if (!r.success || !r.orgName) {
        setError(r.message || '邀请链接无效或已失效')
        return
      }
      setOrgName(r.orgName)
      setOrgId(r.orgId)
      setBrandLogo(r.brandLogo || '')
      setJoinMode(r.joinMode || 'auto')
    })
    return () => {
      cancelled = true
    }
  }, [code])

  useEffect(() => {
    if (user?.name) setDisplayName((prev) => prev || user.name)
  }, [user?.name])

  // 登录后刷新组织列表，避免本地缓存滞后导致已成员仍显示加入表单
  useEffect(() => {
    if (!ready || !isLogin) return
    void refreshOrgs()
  }, [ready, isLogin, refreshOrgs])

  /** 已登录且已在该组织（按我的组织列表判断） */
  const alreadyMember = useMemo(() => {
    if (!ready || !isLogin || orgId <= 0) return false
    return orgs.some((o) => o.id === orgId)
  }, [ready, isLogin, orgId, orgs])

  const isCurrentOrg = useMemo(() => {
    if (orgId <= 0) return false
    const cur = user?.orgId || currentOrg?.id || 0
    return cur === orgId
  }, [orgId, user?.orgId, currentOrg?.id])

  /** 切换到邀请组织并进入首页 */
  async function enterOrg() {
    if (orgId <= 0) {
      navigate('/', { replace: true })
      return
    }
    setActing(true)
    clearInviteCode()
    if (!isCurrentOrg) {
      const res = await switchOrg(orgId)
      if (!res.success) {
        setActing(false)
        toast.error(res.message || '切换组织失败，请稍后重试')
        return
      }
    }
    setActing(false)
    navigate('/', { replace: true })
  }

  /** 仅切换到该组织（留在本页或进入组织管理时用 toast 反馈） */
  async function handleSwitchOrg() {
    if (orgId <= 0) return
    if (isCurrentOrg) {
      toast.success(`当前已在「${orgName}」`)
      return
    }
    setActing(true)
    const res = await switchOrg(orgId)
    setActing(false)
    if (!res.success) {
      toast.error(res.message || '切换组织失败，请稍后重试')
      return
    }
    clearInviteCode()
    toast.success(`已切换到「${orgName}」`)
  }

  async function handleJoin() {
    if (!code) return
    const name = displayName.trim()
    if (!name) {
      toast.error('请填写你在组织里的名称')
      return
    }
    setJoining(true)
    const res = await joinOrg(code, name)
    setJoining(false)
    if (!res.success) {
      toast.error(res.message || '加入失败，请稍后重试')
      return
    }
    clearInviteCode()
    await refreshOrgs()
    // 后端对已成员返回 code=0 +「你已在该组织中」：刷新列表后走已加入态，不再强跳
    const msg = res.message || ''
    if (msg.includes('已在该组织') || msg.includes('已加入')) {
      toast.success(msg.includes('已在') ? '你已加入该组织' : msg)
      return
    }
    toast.success(msg || '已加入组织')
    if (orgId > 0 && joinMode !== 'review') {
      await switchOrg(orgId)
    }
    navigate('/', { replace: true })
  }

  const regHref = code
    ? `/register?invite=${encodeURIComponent(code)}`
    : '/register'
  const loginHref = code
    ? `/login?redirect=${encodeURIComponent(buildOrgInvitePath(code))}`
    : '/login'

  return (
    <PageShell className="items-center justify-center" stagger={false}>
      <Card className="w-full max-w-md gap-4 py-4 motion-lift">
        <CardHeader className="gap-2 px-4 text-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : error ? (
            <>
              <CardTitle>无法打开邀请</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          ) : alreadyMember ? (
            <>
              <div className="flex justify-center">
                <Avatar className="size-16 rounded-xl bg-muted">
                  {brandLogo ? (
                    <AvatarImage
                      src={brandLogo}
                      alt=""
                      className="object-contain p-1.5"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-xl text-lg">
                    {(orgName || '组').slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">你已加入{orgName}</CardTitle>
              <CardDescription>
                无需再次加入。可切换到该组织，或直接进入。
              </CardDescription>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <Avatar className="size-16 rounded-xl bg-muted">
                  {brandLogo ? (
                    <AvatarImage
                      src={brandLogo}
                      alt=""
                      className="object-contain p-1.5"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-xl text-lg">
                    {(orgName || '组').slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">欢迎加入{orgName}</CardTitle>
              <CardDescription>
                {joinMode === 'review'
                  ? '加入需管理员通过。注册或登录后提交申请即可。'
                  : '注册或登录后即可成为组织成员。'}
              </CardDescription>
            </>
          )}
        </CardHeader>

        {!loading && !error ? (
          alreadyMember ? (
            <>
              <CardContent className="px-4">
                <p className="text-center text-sm text-muted-foreground">
                  {isCurrentOrg
                    ? '当前正在使用该组织，可直接进入。'
                    : '切换后，页面将按该组织的内容与权限展示。'}
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 px-4">
                {!isCurrentOrg ? (
                  <Button
                    className="w-full"
                    disabled={acting}
                    onClick={() => void handleSwitchOrg()}
                  >
                    {acting ? <Spinner data-icon="inline-start" /> : null}
                    切换组织
                  </Button>
                ) : null}
                <Button
                  className="w-full"
                  variant={isCurrentOrg ? 'default' : 'outline'}
                  disabled={acting}
                  onClick={() => void enterOrg()}
                >
                  {acting ? <Spinner data-icon="inline-start" /> : null}
                  进入组织
                </Button>
                <Button variant="ghost" className="w-full" asChild>
                  <Link to={homeTo}>返回首页</Link>
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardContent className="px-4">
                {ready && isLogin ? (
                  <FieldGroup className="gap-3">
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="invite-display-name">
                        你在组织里的名称
                      </FieldLabel>
                      <Input
                        id="invite-display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="队友会看到的称呼"
                        maxLength={32}
                        disabled={joining}
                      />
                      <p className="text-xs text-muted-foreground">
                        仅在本组织展示，可与站内昵称不同
                      </p>
                    </Field>
                  </FieldGroup>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    还没有账号？注册时会自动带上本邀请；已有账号请登录后加入。
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2 px-4">
                {ready && isLogin ? (
                  <Button
                    className="w-full"
                    disabled={joining}
                    onClick={() => void handleJoin()}
                  >
                    {joining ? <Spinner data-icon="inline-start" /> : null}
                    {joinMode === 'review' ? '提交加入申请' : '加入组织'}
                  </Button>
                ) : (
                  <>
                    <Button className="w-full" asChild>
                      <Link to={regHref}>注册并加入</Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to={loginHref}>已有账号，去登录</Link>
                    </Button>
                  </>
                )}
                <Button variant="ghost" className="w-full" asChild>
                  <Link to={homeTo}>返回首页</Link>
                </Button>
              </CardFooter>
            </>
          )
        ) : error ? (
          <CardFooter className="flex flex-col gap-2 px-4">
            <Button variant="outline" className="w-full" asChild>
              <Link to={homeTo}>返回首页</Link>
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </PageShell>
  )
}
