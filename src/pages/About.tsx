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

const features = [
  {
    title: '多平台数据汇总',
    desc: '自动同步 Codeforces、AtCoder、洛谷、牛客等平台提交与比赛记录，热力图与时段统计一目了然。',
  },
  {
    title: '多组织（校队）隔离',
    desc: '单域名多租户：公共域默认开放，各校队独立成员、分组、公告与管理后台，数据互不干扰。',
  },
  {
    title: '校队管理与角色',
    desc: '站点管理员与组织管理员分工清晰；支持教练、队长、成员等组织内角色，识别码加入与审批。',
  },
  {
    title: '题库与训练辅助',
    desc: '站内题库浏览、筛选与题目详情；结合提交历史，方便复盘与组队训练。',
  },
  {
    title: 'AI 总结与画像',
    desc: '可按组织策略开启 AI 训练总结与邮件推送，辅助了解近期练习节奏与薄弱方向。',
  },
  {
    title: '比赛与动态',
    desc: '比赛列表、站内榜与全站/组织内动态流，便于教练与队员跟进训练进度。',
  },
]

export function About() {
  return (
    <PageShell className="mx-auto max-w-2xl gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">关于我们</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          GoAlgo · 面向 ACMer 与校队的算法训练与数据平台
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">项目渊源</CardTitle>
          <CardDescription>从校内监测平台到开放的多组织服务</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            本项目前身为
            <span className="font-medium text-foreground">
              无锡学院算法协会内部监测平台
            </span>
            ，用于汇总协会成员在各 OJ
            上的提交与训练数据，服务日常训练与竞赛备战。
          </p>
          <p>
            平台曾在
            <span className="font-medium text-foreground">
              无锡学院物联网工程学院刘伟教授
            </span>
            指导下开发，由
            <span className="font-medium text-foreground">
              伞恩晨、宗柏屹、张万里
            </span>
            共同完成初版设计与实现。
          </p>
          <p>
            后续在此基础上演进为
            <span className="font-medium text-foreground"> GoAlgo</span>
            ：支持多组织（校队）隔离、站点与组织管理、题库与 AI
            总结等能力，面向更广泛的算法学习者与训练团队。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">站点特色与功能</CardTitle>
          <CardDescription>为个人训练与校队管理而设计</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f.title} className="text-sm">
                <p className="font-medium text-foreground">{f.title}</p>
                <p className="mt-0.5 leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </li>
            ))}
          </ul>
          <Separator />
          <p className="text-sm leading-relaxed text-muted-foreground">
            你现在所在的是系统默认「公共域」。加入校队后，可切换到所属组织，查看队内统计、公告与管理功能；个人
            OJ 绑定与提交记录始终跟随账号。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">院校合作</CardTitle>
          <CardDescription>建立自己的组织域，服务本校训练体系</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            若贵校算法协会、ACM
            集训队或相关院系希望与我们合作，在 GoAlgo
            上建立独立的组织（校队域）、配置品牌与成员管理、按需开通同步与
            AI 策略，欢迎与我们取得联系。
          </p>
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
            来信时请尽量说明学校 / 团队名称、预计规模与希望使用的功能，我们会尽快回复。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">致谢</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            感谢刘伟教授在方向与工程实践上的指导，以及无锡学院算法协会同学在使用与反馈中的支持。
          </p>
          <p>
            也感谢所有为平台提出建议、协助测试与持续贡献的同学与伙伴。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">公共域说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            当前展示的是系统默认组织「公共域」。你可在「我的组织」中使用团队识别码加入校队，或由站点管理员创建与管理组织。
          </p>
          <Separator className="my-2" />
          <p>
            如需加入已有校队，请前往{' '}
            <Link
              to="/org"
              className="text-primary underline-offset-4 hover:underline"
            >
              我的组织
            </Link>
            ；未登录用户请先{' '}
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
