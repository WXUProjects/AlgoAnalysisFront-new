import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const features: {
  title: string
  desc: ReactNode
  highlight?: boolean
  upcoming?: boolean
}[] = [
  {
    title: '能力分析',
    highlight: true,
    desc: '汇总各 OJ 做题记录，按题型、知识点与难度展示熟悉程度。',
  },
  {
    title: '多平台数据同步',
    desc: '自动同步 Codeforces、AtCoder、洛谷、牛客等平台的提交与比赛，还有热力图和时段统计。',
  },
  {
    title: '多组织隔离',
    desc: '公共域对所有人开放；各校队有独立的成员、分组、公告和后台，数据互不相通。',
  },
  {
    title: '角色与权限',
    desc: '支持站点管理员、教练、队长、成员；队员凭邀请码申请，教练审批。',
  },
  {
    title: '题库与提交',
    desc: '浏览、筛选题目，查看题面与提交历史，支持个人和队内复盘。',
  },
  {
    title: '比赛与动态',
    desc: '比赛列表、站内榜，以及全站或队内的提交动态。',
  },
  {
    title: '日报与周报',
    desc: '自动汇总每日、每周的训练情况，生成日报和周报发送到邮箱。',
  },
  {
    title: '数据导出',
    upcoming: true,
    desc: '计划支持导出队员与队内训练数据，方便考核和留档。',
  },
]

const personLinkClass =
  'font-medium text-foreground underline-offset-4 hover:underline'

export function About() {
  return (
    <PageShell className="mx-auto max-w-2xl gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">关于我们</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          GoAlgo · 校队训练数据与管理平台
        </p>
        <p className="mt-2 text-sm text-foreground">
          用户交流群 QQ{' '}
          <span className="font-medium tabular-nums">925338346</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">项目背景</CardTitle>
          <CardDescription>
            由无锡学院算法协会内部平台发展而来
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            GoAlgo 前身为
            <span className="font-medium text-foreground">
              无锡学院算法协会内部监测平台
            </span>
            ，用于汇总各 OJ 的提交与比赛记录，便于查看训练进度。
          </p>
          <p>
            初版在
            <a
              href="https://wlwxy.cwxu.edu.cn/info/1226/1915.htm"
              target="_blank"
              rel="noreferrer"
              className={personLinkClass}
            >
              无锡学院物联网工程学院刘伟教授
            </a>
            指导下，由
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`${personLinkClass} cursor-pointer bg-transparent p-0 font-inherit`}
                >
                  伞恩晨
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex flex-col gap-1 p-2">
                <a
                  href="https://github.com/srcenchen"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded px-2 py-1 text-xs hover:bg-background/20"
                >
                  GitHub
                </a>
                <a
                  href="http://www.zhiyuansofts.cn/%E4%BC%9E%E6%81%A9%E6%99%A8%E7%AE%80%E5%8E%86.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded px-2 py-1 text-xs hover:bg-background/20"
                >
                  简历
                </a>
              </TooltipContent>
            </Tooltip>
            、
            <a
              href="https://github.com/AoralsFout"
              target="_blank"
              rel="noreferrer"
              className={personLinkClass}
            >
              宗柏屹
            </a>
            、
            <a
              href="https://github.com/hyhgfrgh/"
              target="_blank"
              rel="noreferrer"
              className={personLinkClass}
            >
              张万里
            </a>
            完成设计与实现，后扩展为面向多校队的
            <span className="font-medium text-foreground"> GoAlgo</span>
            。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">功能概览</CardTitle>
          <CardDescription>个人进度与队内管理</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-3">
            {features.map((f) => (
              <li
                key={f.title}
                className={
                  f.highlight
                    ? 'rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm'
                    : 'text-sm'
                }
              >
                <p
                  className={
                    f.highlight
                      ? 'font-semibold text-primary'
                      : 'font-medium text-foreground'
                  }
                >
                  {f.title}
                  {f.upcoming ? (
                    <span className="ml-2 text-xs font-semibold text-primary">
                      即将上线
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">院校合作</CardTitle>
          <CardDescription>
            可为校队开通独立空间
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            面向算法协会、ACM
            集训队及相关院系开放。每个校队有独立的成员与公告，品牌名和同步策略可单独配置。
          </p>
          <div>
            <p className="font-medium text-foreground">合作内容</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <span className="text-foreground">独立组织空间</span>
                ：成员、分组、公告与队内统计，都和本校绑定
              </li>
              <li>
                <span className="text-foreground">成员与角色</span>
                ：邀请码加入与审批，教练、队长分工
              </li>
              <li>
                <span className="text-foreground">品牌与同步</span>
                ：侧栏名称、标志可按校队设置，同步开关与间隔也可按组织配置
              </li>
              <li>
                <span className="text-foreground">平台维护</span>
                ：功能与稳定性由平台统一更新
              </li>
            </ul>
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-foreground">
            <p>
              <span className="text-muted-foreground">微信</span>
              <span className="ml-3 font-medium tabular-nums">srcenchen</span>
            </p>
            <p className="mt-2">
              <span className="text-muted-foreground">邮箱</span>
              <a
                href="mailto:srcenchen@gmail.com"
                className="ml-3 font-medium text-primary underline-offset-4 hover:underline"
              >
                srcenchen@gmail.com
              </a>
            </p>
          </div>
          <p>
            联系时请注明学校或团队名称、人数与主要需求。
          </p>        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">致谢</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            感谢
            <a
              href="https://wlwxy.cwxu.edu.cn/info/1226/1915.htm"
              target="_blank"
              rel="noreferrer"
              className={personLinkClass}
            >
              刘伟教授
            </a>
            的指导，以及无锡学院算法协会同学的使用反馈。
          </p>
          <p>也谢谢所有提过建议、帮忙测过的同学和伙伴。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">关于「公共域」</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            现在默认在公共空间。有校队邀请码就去「我的组织」加入；新组织由站点管理员创建和管理。
          </p>
          <Separator className="my-2" />
          <p>
            加入校队请前往{' '}
            <Link
              to="/org"
              className="text-primary underline-offset-4 hover:underline"
            >
              我的组织
            </Link>
            ；还没登录就先{' '}
            <Link
              to="/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              登录
            </Link>
            。
          </p>
        </CardContent>
      </Card>
    </PageShell>
  )
}
