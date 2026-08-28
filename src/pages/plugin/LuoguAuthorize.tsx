import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheckIcon } from 'lucide-react'
import { createLuoguAuthorizeCode } from '@/api/luogu-plugin'
import { RequireLogin } from '@/auth/RequireLogin'
import { PageShell } from '@/components/page-shell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import {
  buildLuoguAuthorizeCodeRequest,
  createAuthorizationCodeMessenger,
  parseLuoguAuthorizeQuery,
} from '@/lib/luogu-plugin-auth'

const RISK_TEXT = '本工具会使用你当前的洛谷登录状态读取提交记录。频繁同步可能触发洛谷风控，极端情况下存在账号受限或封禁风险。建议每天少量同步，只在需要时操作。'
const RISK_ACKNOWLEDGEMENT = '我已阅读并了解上述风险，自愿使用洛谷同步工具。'

function LuoguAuthorizeContent() {
  const [searchParams] = useSearchParams()
  const query = parseLuoguAuthorizeQuery(searchParams)
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const sendCode = useRef(
    createAuthorizationCodeMessenger((message, targetOrigin) => {
      const opener = window.opener
      if (!opener) throw new Error('opener unavailable')
      opener.postMessage(message, targetOrigin)
    }),
  )

  async function authorize() {
    if (!query.ok || !accepted || submitting) return
    if (!window.opener) {
      setError('无法返回洛谷同步工具。请关闭此页并返回洛谷后重新连接。')
      return
    }

    setSubmitting(true)
    setError('')
    const result = await createLuoguAuthorizeCode(
      buildLuoguAuthorizeCodeRequest(query.value),
    )
    setSubmitting(false)

    const code = result.data?.code
    if (!result.success || !code) {
      setError(result.message || '授权没有完成，请稍后重试。')
      return
    }

    if (sendCode.current(query.value.state, code)) {
      window.close()
    } else {
      setError('无法返回洛谷同步工具。请关闭此页并返回洛谷后重新连接。')
    }
  }

  if (!query.ok) {
    return (
      <PageShell className="items-center justify-center" stagger={false}>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>无法完成授权</CardTitle>
            <CardDescription>请返回洛谷同步工具后重新连接。</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <ShieldCheckIcon />
              <AlertTitle>授权信息无效</AlertTitle>
              <AlertDescription>{query.message}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell className="items-center justify-center" stagger={false}>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>授权洛谷同步工具</CardTitle>
          <CardDescription>确认风险后即可连接当前洛谷账号。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Alert>
            <ShieldCheckIcon />
            <AlertTitle>使用风险</AlertTitle>
            <AlertDescription>{RISK_TEXT}</AlertDescription>
          </Alert>
          <FieldGroup>
            <Field orientation="horizontal">
              <Checkbox
                id="luogu-risk-accepted"
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked === true)}
              />
              <FieldContent>
                <FieldLabel htmlFor="luogu-risk-accepted" className="font-normal">
                  {RISK_ACKNOWLEDGEMENT}
                </FieldLabel>
              </FieldContent>
            </Field>
          </FieldGroup>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>授权没有完成</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button disabled={!accepted || submitting} onClick={authorize}>
            {submitting ? <Spinner data-icon="inline-start" /> : null}
            同意并授权
          </Button>
        </CardFooter>
      </Card>
    </PageShell>
  )
}

export function LuoguAuthorize() {
  return (
    <RequireLogin>
      <LuoguAuthorizeContent />
    </RequireLogin>
  )
}
