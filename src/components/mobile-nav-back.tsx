import { ArrowLeftIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { goNavBack, isMobileNavRoot } from '@/lib/nav-back'
import { cn } from '@/lib/utils'

/**
 * 移动端顶栏返回（md 以下显示）。
 * 主 Tab / 入口页不显示；子页点一下回到上一页或逻辑上级。
 * 不依赖 SidebarProvider，前台 / 后台 / 博客管理壳均可挂。
 */
export function MobileNavBack({ className }: { className?: string }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (isMobileNavRoot(pathname)) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn('-ml-1 shrink-0 md:hidden', className)}
      aria-label="返回"
      onClick={() => goNavBack(navigate, pathname)}
    >
      <ArrowLeftIcon />
    </Button>
  )
}
