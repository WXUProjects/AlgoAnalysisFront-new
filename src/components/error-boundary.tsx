import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  CHUNK_RELOAD_KEY,
  isChunkLoadError,
} from '@/lib/lazy-with-retry'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary:', error, info.componentStack)
    // 部署后 chunk 失效：自动硬刷一次
    if (isChunkLoadError(error) && typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem(CHUNK_RELOAD_KEY) !== '1') {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
          window.location.reload()
        }
      } catch {
        /* ignore */
      }
    }
  }

  render() {
    if (this.state.error) {
      const chunky = isChunkLoadError(this.state.error)
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {this.props.fallbackTitle ||
                  (chunky ? '页面资源已更新' : '页面出了点问题')}
              </CardTitle>
              <CardDescription>
                {chunky
                  ? '站点刚更新了前端资源，刷新后即可继续。'
                  : '请刷新后重试。若反复出现，可联系管理员。'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                onClick={() => {
                  this.setState({ error: null })
                  window.location.reload()
                }}
              >
                刷新页面
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ error: null })
                  window.location.href = '/'
                }}
              >
                返回首页
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}

/** React Router errorElement：捕获懒加载失败等路由级错误 */
export function RouteErrorFallback() {
  const error = useRouteError()
  const chunky = isChunkLoadError(error)

  useEffect(() => {
    if (!chunky || typeof window === 'undefined') return
    try {
      if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      window.location.reload()
    } catch {
      /* ignore */
    }
  }, [chunky])

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {chunky ? '页面资源已更新' : '页面加载失败'}
          </CardTitle>
          <CardDescription>
            {chunky
              ? '站点刚更新了前端资源，正在为你自动刷新…若未跳转请点下方按钮。'
              : '请返回首页或刷新后重试。从分享链接进入时偶发，多半是网络或资源更新导致。'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => window.location.reload()}>刷新</Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = '/'
            }}
          >
            首页
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
