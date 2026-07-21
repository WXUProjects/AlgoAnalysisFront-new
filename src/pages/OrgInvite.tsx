import { useEffect, useState } from 'react'
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
 * 未登录 → 欢迎文案 + 去注册/登录；已登录 → 填写队内名称后加入
 */
export function OrgInvite() {
  const [searchParams] = useSearchParams()
  const code = (searchParams.get('code') || '').trim()
  const navigate = useNavigate()
  const { isLogin, ready, user, refreshOrgs, switchOrg } = useAuth()
  const homeTo = getHomePath(ready ? isLogin : false)

  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [orgId, setOrgId] = useState(0)
  const [brandLogo, setBrandLogo] = useState('')
  const [joinMode, setJoinMode] = useState('')
  const [error, setError] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [joining, setJoining] = useState(false)

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
    toast.success(res.message || '已加入组织')
    clearInviteCode()
    await refreshOrgs()
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
