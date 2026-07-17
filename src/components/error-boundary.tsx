import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>{this.props.fallbackTitle || '页面出了点问题'}</CardTitle>
              <CardDescription>
                请刷新后重试。若反复出现，可联系管理员。
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

export function RouteErrorFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>页面加载失败</CardTitle>
          <CardDescription>请返回首页或刷新后重试。</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => window.location.reload()}>刷新</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            首页
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
