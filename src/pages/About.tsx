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
            <Link to="/org" className="text-primary underline-offset-4 hover:underline">
              我的组织
            </Link>
            ；未登录用户请先{' '}
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">
              登录
            </Link>
            。
          </p>
        </CardContent>
      </Card>
    </PageShell>
  )
}
