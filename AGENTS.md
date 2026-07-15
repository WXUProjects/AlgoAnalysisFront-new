# AGENTS.md — newUI-20260715

React + Vite + TypeScript 新前端。API 契约见 [`../shared/`](../shared/)。

## 强制：布局

**全站采用左右分栏布局，规范见 [`layout.md`](./layout.md)。**

- 左侧：垂直 Tab 导航，**最上方品牌固定为 `Algo-CWUX`**
- 右侧：顶部 Title/Header + 下方当前 Tab 页面内容
- 实现用 shadcn Sidebar 等，壳在 `src/layouts/AppLayout.tsx`

## 强制：文案面向 C 端用户

**界面上的中文是给最终用户看的，不是写给开发者或 Agent 的。**

### 要求

1. 口吻清晰、自然，像产品界面，不像实现备注
2. 说明「用户能做什么 / 会怎样」，不要写技术实现细节
3. 后台管理文案也要让教练/管理员一眼看懂，避免黑话

### 禁止出现在 UI 中的说法（示例）

- `CRUD`、`MQ`、`purge`、`消费`、`入队`、`补缺`、`流水线`、`软删除`
- `PENDING` / `FETCHING` / `TAGGING` 等状态码原文（须译成中文）
- 开发提示词残留：「仅停消费，不清队列」「富文本 · 置顶 · CRUD」「见 AGENTS.md」

### 改写方向

| 差 | 好 |
|----|-----|
| 暂停仅停消费，不清队列 | 暂停不会丢失待处理任务 |
| 富文本 · 置顶 · CRUD | 发布、编辑与置顶公告 |
| 重置队列 / 回填 | 重新排队 / 补全近期 |
| 软删除用户 | 移除用户 |
| 触发爬虫拉取 | 同步最新数据 |

## 强制：UI 一律 shadcn 风格

**所有页面、组件、布局的设计与实现，统一使用 shadcn/ui 体系，禁止另起一套 UI 风格。**

### 要求

1. **先加载 skill**：涉及 UI 时调用 `shadcn` skill（`.agents/skills/shadcn/`）
2. **组件来源**：优先 `npx shadcn@latest add <component>`，不要手写平行组件库
3. **样式**：语义 token（`bg-background`、`text-muted-foreground` 等），内置 `variant`/`size`，不要硬编码颜色
4. **组合**：页面用 Sidebar / Card / Tabs / Table / Form（Field）等 shadcn 模式拼，不要自造 design system
5. **未 init 时**：先 `npx shadcn@latest init`（或按 skill 流程），再写业务 UI

### 禁止

- 自写无 shadcn 基础的 Button/Input/Dialog 等
- 用 raw `bg-blue-500` 等非 token 颜色堆风格
- 混用 Ant Design / MUI / 纯自定义 CSS 框架当主 UI

### Skill 位置

```
.agents/skills/shadcn/SKILL.md
```

## 强制：动画与页面切换

**多用动画提升视觉感受，但不可滥用、乱用，更不可为了追求炫酷而用。**

1. **动画目的**：服务反馈与层次（进入/退出、加载完成、状态变化），让界面更顺、更清晰
2. **克制**：时长短、位移小、缓动自然；同屏同时动的元素要少；避免循环炫技、遮挡阅读、拖慢操作
3. **技术**：优先 GSAP（见 `.agents/skills/gsap-*`）+ 语义 token；不要为动画破坏布局与 a11y
4. **页面上下切换**：必须符合用户逻辑——路由/Tab/列表进详情等，过渡方向与信息层级一致（如进详情像「往下/往里」、返回像「往上/往回」），不要无意义的乱切、闪切

## 强制：API 必须测试

**每次使用 API、封装 API、接入新 API 时，必须实际请求验证，禁止只写代码不测。**

### 何时必须测

| 场景 | 要求 |
|------|------|
| 调用已有接口 | 用真实/测试环境打通，确认路径、参数、响应字段 |
| 新增前端 API 封装 | 至少一次成功请求 + 错误/鉴权场景抽查 |
| 改 `shared/api.ts` / `shared/api.md` | 对新路径做 curl 或 dev 反代实测 |
| 改请求参数 / 响应解析 | 回归相关页面或脚本，确认不崩 |

### 怎么测

1. **优先走 Vite 反代**（与线上一致）  
   `npm run dev` 后请求 `/api/...` → `https://algo.zhiyuansofts.cn/api/...`
2. **或直接 curl 线上**  
   ```bash
   curl -s "https://algo.zhiyuansofts.cn/api/core/bulletin/list?page=1&pageSize=1"
   curl -s -X POST "https://algo.zhiyuansofts.cn/api/user/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username":"...","password":"..."}'
   ```
3. **需鉴权的接口**：先 login 拿 `jwtToken`，再带  
   `Authorization: Bearer <token>`
4. **密码**：客户端 SHA256 后再传（与旧前端一致）

### 完成标准（未满足则不算做完）

- [ ] 请求能通（非 404 / 网关错误）
- [ ] 状态码与业务 `code`/`success` 符合预期
- [ ] 前端用到的字段与真实 JSON 一致（注意 camelCase / 嵌套）
- [ ] 需要登录的接口验证 401/未登录与带 token 两种情况
- [ ] 若改了契约：已同步 `../shared/api.md` + `../shared/api.ts`

### 禁止

- 凭记忆猜路径或字段
- 只改类型/路径不发真实请求
- 在 UI 里硬编码 API 路径（用 `@shared/api` 的 `endpoints`）

## API 约定

- 路径：`/api/user/*`、`/api/core/*`、`/api/agent/*`
- 文档：[`../shared/api.md`](../shared/api.md)
- 类型：[`../shared/api.ts`](../shared/api.ts)
- 别名：`import { endpoints } from '@shared/api'`

## 常用命令

```bash
npm install
npm run dev      # 反代已配好
npm run build
```

---

## 功能模块清单（新前端已上线）

**旧前端 `../CWXU-Algo-Frontend` 已弃用：不要再访问、修改或照抄其 UI 文案。**  
以下为已实现/历史清单，仅作范围参考；用户可见文案须面向 C 端，禁止把开发术语（CRUD、MQ、消费、流水线等）直接写进界面。

### 角色

| roleId | 角色 | 说明 |
|--------|------|------|
| 1 | Admin | 后台、改角色、删用户、全局爬虫、题库 AI 运维 |
| 2 | Coach | 教练管理、改分组、看队员 |
| 其他 | 用户 | 登录后个人数据、绑 OJ 等 |

### 路由一览

| 路径 | 名称 | 守卫 | 说明 |
|------|------|------|------|
| `/` | Home | 无 | 数据总览 |
| `/login` | Login | 无 | 登录 |
| `/register` | Register | 无 | 注册 |
| `/profile` | Profile | 登录 | 个人/他人资料 `?id=` |
| `/change-profile` | ChangeProfile | 登录 | 编辑资料 + 绑 OJ（旧路径 `/changeProfile`） |
| `/all-activities` | AllActivities | 无 | 提交动态（旧 `/allActivities`） |
| `/bulletin` | Bulletin | 无 | 公告列表 |
| `/contest` | Contest | 无 | 比赛列表 |
| `/contest/:id` | ContestDetails | 无 | 比赛详情 + 站内榜 |
| `/question-bank` | QuestionBank | 无 | 题库列表 |
| `/question-bank/detail/:id` | QuestionBankDetail | 无 | 题目详情 |
| `/star` | Star | 登录 | 收藏（半成品，可先占位） |
| `/problem` | — | — | redirect → `/question-bank` |
| `/problem/upload` | ProblemUpload | 登录 | 上传题单（半成品） |
| `/dashboard` | Dashboard | Admin/Coach | 默认 → statistics |
| `/dashboard/statistics` | Statistics | Admin/Coach | 全站统计 |
| `/dashboard/group` | Group | Admin/Coach | 分组 CRUD |
| `/dashboard/user` | User | Admin/Coach | 用户/队员管理 |
| `/dashboard/bulletin` | BulletinManage | Admin/Coach | 公告管理 |
| `/dashboard/problem-progress` | ProblemProgress | Admin/Coach | 题库流水线运维 |
| `*` | NotFound | 无 | 404 |

### 页面功能明细

#### 公开 / 核心

| 模块 | 必须实现的能力 |
|------|----------------|
| **Home** | period 统计卡片（AC/提交切换、生涯/今/年/月/周）；提交/AC 双热力图；登录后算法画像 + AI 总结；OJ 快捷入口；首页公告摘要 |
| **Login** | 用户名+密码；客户端 SHA256；JWT；跳转 `redirect` 或 `/` |
| **Register** | 账号/密码/确认/姓名/邮箱；`groupId` 默认 0；成功去登录 |
| **Profile** | `?id=` 看他人；头像/OJ 绑定与外链；本人：更新 OJ、编辑资料、退出；AC/提交对比；热力图；近期动态；算法画像；最近比赛 |
| **ChangeProfile** | 改姓名/邮箱；邮件通知开关；绑定 OJ（AtCoder/洛谷/牛客/CF/QOJ/力扣）；`?oj=` 预选平台 |
| **AllActivities** | 全站或单用户提交流；cursor 无限滚动；链到资料/题库 |
| **Bulletin** | 分页列表；展开 HTML；置顶；`?expand=` 自动展开 |
| **Contest** | 分页列表；全站或 `?id=` 用户；跳 OJ / 站内详情 |
| **ContestDetails** | 比赛信息 + ranking；分组筛选；分页 |
| **QuestionBank** | 关键词/平台/难度/标签/用户状态筛选；排序；分页；URL query 同步 |
| **QuestionBankDetail** | Markdown+KaTeX 题面；标签/难度；AI 解法；提交历史 |
| **NotFound** | 404 |

#### 管理后台

| 模块 | 必须实现的能力 |
|------|----------------|
| **Dashboard 壳** | 子导航：统计 / 公告 / 题库识别 / 组 / 用户 |
| **Statistics** | 用户数、组数、AC/提交时段；趋势图；**Admin**：一键全局更新 OJ |
| **Group** | 组 CRUD；成员列表；搜用户加组/移出；跳转资料 |
| **User** | 列表分页；**Admin** 改角色/软删；**Coach** 改分组 |
| **BulletinManage** | 公告 CRUD；HTML 编辑；置顶 |
| **ProblemProgress** | 状态计数、队列、进行中/失败列表；**Admin**：暂停/恢复分析与爬取、重置、回填、重试失败 |

#### 已移除 / 不做

| 模块 | 说明 |
|------|------|
| **Star** | 阶段 3 已从路由与侧栏移除（旧前端无真实 API） |
| **Problem Upload** | 阶段 3 已从路由与侧栏移除（旧前端未接 API） |
| **Rank** | 旧路由已注释；全站排行可后续接 `statistic/rank` |

### 共享组件（移植时用 shadcn 重做）

| 能力 | 旧组件参考 | 新实现方向 |
|------|------------|------------|
| 布局壳 | App + BaseLayout | `AppLayout` + layout.md |
| 热力图 | Calendar | 自研或图表库 + Card |
| 算法画像 | AlgoProfileCharts | shadcn Chart / recharts |
| 排行列表 | Rank | Table + Avatar |
| 公告摘要 | BulletinBoard | Card 列表 |
| Toast | ToastNotification | sonner |
| 确认框 | confirm | AlertDialog |
| Loading | LoadingOverlay | Skeleton / Spinner |
| 页脚 | Footer | 可选放 Header 或内容底 |

### 基础设施（须先有）

| 模块 | 说明 |
|------|------|
| JWT | localStorage `jwtToken`；payload：`userId/username/name/roleId/exp` |
| 密码 | SHA256 客户端哈希 |
| Auth 状态 | `isLogin` / `isAdmin`(roleId=1) / `isCoach`(roleId=2) / profile |
| HTTP | 统一客户端；`Authorization: Bearer`；路径用 `@shared/api` |
| 主题 | 旧 4 套可简化为 light/dark；`data-theme` 或 class |
| 路由守卫 | 登录页 redirect；Dashboard 需 Admin\|Coach |

### API 对应（实现页时对齐 shared）

```
user.auth:        login, register
user.profile:     getById, getByName, update, list, moveGroup, setEmailEnabled, delete
user.role:        list, setUserRole
user.group:       list, create, delete, update, get
core.submitLog:   getById
core.spider:      set, update, updateAll
core.statistic:   heatmap, period, rank
core.contest:     list, history, ranking
core.bulletin:    list, get, create, update, delete
core.problem:     list, get, submissions, userProfile, progress,
                  backfill, emergencyStop, resume, resetAll, retryFailed,
                  toggleAnalyze, toggleFetch
agent.summary:    recent
```

### 实现优先级

1. **P0 壳**：shadcn init → AppLayout（Algo-CWUX 侧栏 + Header）→ 鉴权 → Toast  
2. **P0 业务**：Login/Register → Home → Profile/ChangeProfile → Contest → Bulletin → QuestionBank → AllActivities  
3. **P0 后台**：Statistics / Group / User / BulletinManage / ProblemProgress  
4. **P1**：热力图、算法画像、Markdown 题面、AI 总结  
5. **P2**：Star / Upload / Rank / 装饰动效  

### 侧栏导航（启用项）

首页 · 比赛 · 公告 · 动态 · 题库 · 个人资料(登录) · 后台/教练(Admin/Coach) · 论坛(外链) · 主题 · 登录/注册(未登录)

品牌：**Algo-CWUX**（侧栏最上方）

### 参考路径

| 用途 | 路径 |
|------|------|
| 旧业务逻辑 | `../CWXU-Algo-Frontend/src/views/**`、`utils/api.ts` |
| API 契约 | `../shared/api.md`、`../shared/api.ts` |
| 布局 | `./layout.md` |
| 脚手架路由 | `src/router.tsx` |
| 布局壳 | `src/layouts/AppLayout.tsx` |
