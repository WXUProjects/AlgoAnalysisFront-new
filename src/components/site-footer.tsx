import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useSiteConfig } from '@/site/SiteConfigContext'

const DEFAULT_ICP = '苏ICP备2025217901号'
const ICP_URL = 'https://beian.miit.gov.cn/'
const SCHOOL_URL = 'https://www.cwxu.edu.cn/'

const DEVELOPERS = [
  { name: 'Ehsan', github: 'srcenchen' },
  { name: 'AoralsFout', github: 'AoralsFout' },
  { name: 'wanli_', github: 'hyhgfrgh' },
] as const

function githubAvatar(login: string) {
  return `https://github.com/${login}.png?size=64`
}

function githubUrl(login: string) {
  return `https://github.com/${login}`
}

export function SiteFooter() {
  const { config } = useSiteConfig()
  const year = new Date().getFullYear()
  const icp = (config.footerIcp || '').trim() || DEFAULT_ICP

  return (
    <footer className="mt-auto shrink-0 border-t bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p>
              © {year} 无锡学院算法协会版权所有
            </p>
            <p>
              <a
                href={SCHOOL_URL}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                无锡学院
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
              开发者
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {DEVELOPERS.map((d) => (
                <a
                  key={d.github}
                  href={githubUrl(d.github)}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 rounded-md outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  title={`${d.name} · @${d.github}`}
                >
                  <Avatar size="sm" className="ring-1 ring-border">
                    <AvatarImage src={githubAvatar(d.github)} alt={d.name} />
                    <AvatarFallback>{d.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs group-hover:underline">{d.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
          <a
            href={ICP_URL}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {icp}
          </a>
          <span className="text-muted-foreground/80">GoAlgo</span>
        </div>
      </div>
    </footer>
  )
}
