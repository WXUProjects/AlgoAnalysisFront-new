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

function applyBrand(cfg: SiteConfig) {
  const title = cfg.siteTitle || 'GoAlgo'
  document.title = title

  const fav = cfg.favicon || '/favicon.svg'
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = fav
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
