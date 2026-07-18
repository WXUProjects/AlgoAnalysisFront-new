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
  const fav = cfg.favicon || '/favicon.png'
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = fav
  link.type = fav.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
  let apple = document.querySelector<HTMLLinkElement>(
    "link[rel='apple-touch-icon']",
  )
  if (!apple) {
    apple = document.createElement('link')
    apple.rel = 'apple-touch-icon'
    document.head.appendChild(apple)
  }
  apple.href = fav
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
