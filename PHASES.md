# newUI 三阶段实施计划

> 状态：阶段 1 ✅ · 阶段 2 ✅ · 阶段 3 ✅（三阶段交付完成）。  
> 协作：每阶段开始前由用户触发「开始阶段 N」，再细 plan 小任务，确认后才写代码。  
> 包管理：统一 **yarn**。

---

## 阶段 1 — 地基（能登录、能走壳）✅

**目标**：可运行的 shadcn 壳 + 鉴权链路，业务页仍可占位。

| 块 | 状态 |
|----|------|
| 基建 | ✅ Tailwind v4 + shadcn components + light/dark + sonner |
| 布局 | ✅ `AppLayout` Sidebar（Algo-CWUX）+ Header + 角色显隐 + 退出 |
| 基础设施 | ✅ axios HTTP、JWT、SHA256、AuthContext、RequireAuth/RequireCoach |
| 页面 | ✅ Login / Register / NotFound；其余 Placeholder |
| 验收 | ✅ login 实测成功（roleId=1 Admin）；build 通过 |

**关键路径**

- `src/lib/{jwt,hash,http,utils}.ts`
- `src/api/auth.ts`
- `src/auth/*`
- `src/layouts/AppLayout.tsx`
- `src/pages/{Login,Register,NotFound,Placeholder}.tsx`
- `src/router.tsx`

**实测记录（只读，已复原）**

- 公开：`GET /api/core/bulletin/list` 通
- 登录失败：错误密码 → `success:false`
- 登录成功：`sanenchen` + SHA256 密码 → `jwtToken`，payload `roleId=1 userId=2`
- Profile 读：`GET /api/user/profile/get-by-id?userId=2` 通（未改任何写接口）

---

## 阶段 2 — 核心业务（用户日常路径）✅

**目标**：公开 + 个人主路径可真实用 API。

| 块 | 状态 |
|----|------|
| API 层 | ✅ profile/spider/statistic/submitLog/bulletin/contest/group/problem/agent + 响应 normalize |
| 共享 | ✅ link/format/markdown、Pagination、HeatmapSimple、AlgoProfileSimple、PageShell(GSAP) |
| 社区 | ✅ Bulletin / Contest / ContestDetails / AllActivities(Load more) |
| 个人 | ✅ Profile / ChangeProfile |
| 首页/题库 | ✅ Home 简版热力图·画像·AI；QB URL 同步；Detail MD+KaTeX |
| 验收 | ✅ yarn build 通过；公开 API 实测通（只读） |

**关键路径**

- `src/api/*`、`src/lib/{link,format,markdown,http}.ts`
- `src/pages/{Home,Profile,ChangeProfile,Bulletin,AllActivities,Contest,ContestDetails,QuestionBank,QuestionBankDetail}.tsx`
- `src/components/{pagination,page-shell,heatmap-simple,algo-profile-simple}.tsx`

**实测（只读，未改账号数据）**

- period / heatmap / bulletin / contest list+ranking / submit-log
- problem list/get/submissions / user-profile / agent.summary

---

## 阶段 3 — 后台 + 增强 + 收尾 ✅

**目标**：Admin/Coach 后台齐，图表精修，半成品路由清理。

| 块 | 状态 |
|----|------|
| Dashboard 壳 | ✅ 子导航 + RequireCoach |
| Statistics | ✅ 卡片 + recharts 趋势 + Admin updateAll |
| Group | ✅ CRUD + 成员加/移 |
| User | ✅ Admin 改角色/软删；Coach 改分组 |
| BulletinManage | ✅ Tiptap 富文本 CRUD |
| ProblemProgress | ✅ 5s 轮询 + Admin 运维 |
| 图表 | ✅ TrendChart / AlgoProfileChart / 热力图年份切换 |
| Star/Upload | ✅ 路由与侧栏已移除 |
| 验收 | ✅ `yarn build` 通过 |

**实测（Admin sanenchen，写操作已复原）**

| 操作 | 结果 |
|------|------|
| progress 读 | 通 |
| toggleAnalyze pause→resume | 通，已恢复运行 |
| toggleFetch pause→resume | 通，已恢复运行 |
| group create id=14 → delete | 通，已删除 |
| bulletin create | 后端返回「权限不足，仅教练和管理员可发布公告」（JWT roleId=1 仍拒）— UI 已接好，需后端权限核对 |
| setUserRole(2,1) | 保持 Admin |
| retryFailed | 通 |
| updateAll | 已触发 |
| resetAll / backfill | 未默认狂点；UI 有二次确认 |
| 软删 sanenchen | 前端硬禁 |

**关键路径**

- `src/pages/dashboard/*`
- `src/api/{role,group,bulletin,spider,problem,profile}.ts`
- `src/components/{rich-text-editor,charts/*}.tsx`

---

## 协作约定

1. **每阶段开始前**用户说「开始阶段 N」，再细 plan 该阶段小任务，确认后再写代码  
2. **API 必实测**；路径只用 `shared/api`  
3. **UI 一律 shadcn**  
4. 旧前端已弃用：不要访问/修改 `CWXU-Algo-Frontend`  

## 参考

- 模块清单：`AGENTS.md`
- 布局：`layout.md`
- API：`../shared/api.md`、`../shared/api.ts`
