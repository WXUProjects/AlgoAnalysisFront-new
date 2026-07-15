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
    title: '看清队员擅长什么',
    highlight: true,
    desc: (
      <>
        很多人刷题刷了一学期，教练和本人却仍说不清：到底哪一类题顺手、哪一块总卡壳。GoAlgo
        会把各平台上的
        <span className="font-semibold text-primary">真实做题记录</span>
        收拢起来，据此判断队员对不同题型、知识点与难度的
        <span className="font-semibold text-primary">熟悉程度</span>
        。换句话说，不是再堆一张提交列表，而是尽量回答：这个人练到哪里了、该往哪里补。这是我们最看重的能力之一。
      </>
    ),
  },
  {
    title: '多平台成绩自动汇总',
    desc: 'Codeforces、AtCoder、洛谷、牛客……队员各自刷题，成绩散落在不同网站。平台会自动同步提交与比赛记录，用热力图和时段统计把「这段时间练了多少、练得稳不稳」摊开给人看，少一点手工抄表。',
  },
  {
    title: '每个校队有自己的空间',
    desc: '公共域对所有人开放；各校队可以有独立的成员、分组、公告与管理后台，彼此数据分开。像同一栋楼里的不同训练室——共用基础设施，但各自的训练安排与名单不会搅在一起。',
  },
  {
    title: '角色分清，管理省心',
    desc: '站点管理员管全局，组织内可设教练、队长、成员。队员用团队识别码申请加入，教练审批即可。日常发公告、分小组、看进度，不必再为「谁能改什么」反复扯皮。',
  },
  {
    title: '题库与训练复盘',
    desc: '站内可浏览、筛选题目，查看题面与提交历史。练完之后回看自己或队友的轨迹，比「只记得做过」更有用，也更方便组队讨论。',
  },
  {
    title: '智能训练小结',
    desc: '可按校队需要开启近期训练总结与邮件提醒。它帮你把一段日子的练习节奏和薄弱方向说清楚一点，当作旁观者的整理，而不是替你做决定。',
  },
  {
    title: '比赛与队内动态',
    desc: '比赛列表、站内榜，以及全站或队内的提交动态，让教练和队员不必挨个问「你最近刷了吗」，进度自然浮现。',
  },
  {
    title: '日报与周报',
    desc: (
      <>
        已支持按日、按周自动汇总做题与训练情况，生成
        <span className="font-semibold text-primary">日报与周报</span>
        。教练少催一次「交一下周报」，队员也能对照自己这一周到底练得怎样。
      </>
    ),
  },
  {
    title: '训练数据导出',
    upcoming: true,
    desc: (
      <>
        <span className="font-semibold text-primary">计划中</span>
        ：支持导出队员与队内训练数据。需要写总结、做考核或留档时，不必再从零拼表，把平台里已经沉淀的记录带出去用。
      </>
    ),
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
          GoAlgo · 给刷题的人和带队的人用的训练与数据平台
        </p>
        <p className="mt-2 text-sm text-foreground">
          欢迎加入 GoAlgo 用户交流群 QQ 群{' '}
          <span className="font-medium tabular-nums">925338346</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">我们从哪里来</CardTitle>
          <CardDescription>
            先解决自己人的麻烦，再慢慢做成更多人能用的服务
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            GoAlgo 的前身，是
            <span className="font-medium text-foreground">
              无锡学院算法协会的内部监测平台
            </span>
            。协会同学分散在各个在线判题网站上刷题，教练想看训练进度，往往只能一个个问、一张张表对。我们想把这些零散的提交与比赛记录收拢到一处，让日常训练和赛前备战少一点「凭感觉」。
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
            的指导下，由
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
                  href="http://yangcongxueyuan.test.upcdn.net/%E4%BC%9E%E6%81%A9%E6%99%A8%E7%AE%80%E5%8E%86.pdf"
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
            一起完成设计与实现。后来在此基础上逐步做成今天的
            <span className="font-medium text-foreground"> GoAlgo</span>
            ：不止服务一个协会，也让更多校队和学习者能在同一套体系里管理训练、看清进度。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">我们能帮你做什么</CardTitle>
          <CardDescription>
            个人练得清楚一点，带队也少一点盲区
          </CardDescription>
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
                  {f.highlight ? (
                    <span className="ml-2 text-xs font-semibold text-primary">
                      核心亮点
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </li>
            ))}
          </ul>
          <Separator />
          <p className="text-sm leading-relaxed text-muted-foreground">
            你此刻所在的是系统默认的「公共域」，可以先体验基础能力。加入某支校队后，可切换到所属组织，查看队内统计、公告与管理功能。个人账号与各平台绑定、提交记录会跟着你走，不因切换组织而丢失。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">与院校合作</CardTitle>
          <CardDescription>
            想给本校集训队一块独立、好管的训练空间，欢迎来聊
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            如果贵校算法协会、ACM
            集训队或相关院系希望合作，我们可在 GoAlgo
            上为你们建立独立的校队空间：成员与公告归本校管理，品牌可按队伍定制，同步与智能小结也可按需要开关。不必从零搭一套系统，把精力留在训练本身。
          </p>
          <div>
            <p className="font-medium text-foreground">合作后大致会得到</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <span className="text-foreground">独立的校队空间</span>
                ：成员、分组、公告与队内统计与本校绑定，与公共域及其他校队分开。
              </li>
              <li>
                <span className="text-foreground">可辨认的品牌</span>
                ：侧栏名称、标志等可按校队配置，队员进来就知道这是「自己队」的站。
              </li>
              <li>
                <span className="text-foreground">轻一些的管理</span>
                ：识别码加入与审批，教练、队长角色分工清楚，发公告、分小组不必另起炉灶。
              </li>
              <li>
                <span className="text-foreground">训练数据一处看</span>
                ：多平台自动同步，热力图与提交动态帮教练跟上进度，少做重复统计。
              </li>
              <li>
                <span className="text-foreground">节奏可自己调</span>
                ：数据同步与智能小结可按组织开关与间隔配置，在成本与体验之间取舍。
              </li>
              <li>
                <span className="text-foreground">跟着平台一起长</span>
                ：题库、比赛、稳定性与新能力由平台持续更新，校队侧专注带人与备赛。
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
            来信时不妨写明学校或团队名称、大概人数，以及最希望先解决的问题，我们会尽快回复。
          </p>
        </CardContent>
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
            在方向与工程实践上的指导，也感谢无锡学院算法协会同学在使用中提出的真实反馈——很多改进，正是从「这样用起来别扭」里长出来的。
          </p>
          <p>
            同样感谢所有提过建议、帮过测试、默默用过一段时间的同学与伙伴。有人认真用，平台才有继续做下去的理由。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">关于「公共域」</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            你现在看到的是系统默认的公共空间。若已有校队识别码，可在「我的组织」里加入；新组织一般由站点管理员创建与管理。
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
            ；尚未登录的话，请先{' '}
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
