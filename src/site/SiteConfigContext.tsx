import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getSiteConfig, type SiteConfig } from '@/api/site'

const DEFAULT: SiteConfig = {
  siteTitle: 'GoAlgo',
  siteLogo: '',
  favicon: '',
  footerIcp: '',
  payfmConfigured: false,
}

type Ctx = {
  config: SiteConfig
  loading: boolean
  refresh: () => Promise<void>
}

const SiteConfigContext = createContext<Ctx>({
  config: DEFAULT,
  loading: true,
  refresh: async () => {},
})

/** 只应用 favicon；浏览器标题由布局按路由动态设置（页面名 - 站点名） */
function applyBrand(cfg: SiteConfig) {
  const fav = cfg.favicon || '/favicon.svg?v=2'
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = fav
  // 注意带 ?v= 版本号，不能用 endsWith 判断后缀
  link.type = /\.svg(\?|#|$)/i.test(fav) ? 'image/svg+xml' : 'image/png'
  let apple = document.querySelector<HTMLLinkElement>(
    "link[rel='apple-touch-icon']",
  )
  if (!apple) {
    apple = document.createElement('link')
    apple.rel = 'apple-touch-icon'
    document.head.appendChild(apple)
  }
  // iOS 不认 svg 的 apple-touch-icon，默认图标退回 png
  apple.href = cfg.favicon || '/apple-touch-icon.png?v=2'
}

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const res = await getSiteConfig()
    if (res.success && res.data) {
      setConfig(res.data)
      applyBrand(res.data)
    } else {
      applyBrand(DEFAULT)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ config, loading, refresh }),
    [config, loading, refresh],
  )

  return (
    <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>
  )
}

export function useSiteConfig() {
  return useContext(SiteConfigContext)
}
