# layout.md — 页面布局规范

> 新前端统一布局。实现时用 **shadcn/ui**（Sidebar / Tabs 等），禁止另起布局体系。

## 总览

```
┌──────────────┬─────────────────────────────────────────┐
│              │  Title / Header                         │
│  垂直 Tab    ├─────────────────────────────────────────┤
│  导航栏      │                                         │
│              │  当前 Tab 对应的主内容                   │
│  Algo-CWUX   │                                         │
│  ···         │                                         │
│              │                                         │
└──────────────┴─────────────────────────────────────────┘
```

- **左右分栏**
- **左侧**：垂直 Tab 导航栏
- **右侧**：主内容区域
  - **顶部**：Title / Header
  - **下方**：当前 Tab 对应的页面内容

## 左侧导航栏

| 项 | 说明 |
|----|------|
| 位置 | 页面左侧，固定宽度，垂直排列 |
| 最上方品牌 | **Algo-CWUX**（文案固定，勿改成其他名称） |
| 形态 | 垂直 Tab / 侧栏导航项，当前路由高亮 |
| 内容 | 见下方导航项清单 |
| 实现 | 优先 shadcn `Sidebar`；移动端可折叠/Sheet |

### 导航项（与旧前端对齐）

| 标签 | 路由 | 可见性 |
|------|------|--------|
| 首页 | `/` | 全部 |
| 比赛 | `/contest` | 全部 |
| 公告 | `/bulletin` | 全部 |
| 动态 | `/all-activities` | 全部 |
| 题库 | `/question-bank` | 全部 |
| 个人资料 | `/profile` | 登录后 |
| 后台 / 教练管理 | `/dashboard` | Admin / Coach |
| 论坛 | 外链 `http://bbs.algo.zhiyuansofts.cn/` | 全部 |
| 登录 / 注册 | `/login` `/register` | 未登录 |
| 主题切换 | （控件，非路由） | 全部 |

- 侧栏最上方固定展示 **Algo-CWUX**
- 后台入口文案随角色：Admin →「后台管理」，Coach →「教练管理」

## 右侧主内容区

### 1. Title / Header（顶部）

- 展示当前页面标题（可与路由 `name` / breadcrumb 一致）
- 可选：返回、操作按钮、面包屑、用户状态等
- 与下方内容区分：Header 固定或吸顶，内容区可滚动

### 2. 页面内容（Header 下方）

- 仅渲染当前 Tab / 路由对应页面
- 业务页面写在 `src/pages/**`，不塞进侧栏组件
- 加载态、空态用 shadcn `Skeleton` / `Empty`

## 结构示意（实现参考）

```tsx
// 概念结构，组件名以实现为准
<div className="flex min-h-screen">
  <aside> {/* 左侧垂直导航 */}
    <div>Algo-CWUX</div>  {/* 最上方品牌，固定 */}
    {/* Nav items / vertical tabs */}
  </aside>
  <div className="flex flex-1 flex-col">
    <header>{/* Title / Header */}</header>
    <main>{/* Outlet：当前 Tab 页面内容 */}</main>
  </div>
</div>
```

## 约束

1. 全站（登录/注册可简化，但仍建议同壳或居中卡片）统一此分栏，不要每页一套布局
2. 品牌文案：**Algo-CWUX**
3. UI 必须 shadcn 风格（见 `AGENTS.md`）
4. 路由清单与模块实现见 `AGENTS.md`「待移植功能模块」
5. 鉴权：侧栏项按登录/角色显隐，Dashboard 路由需 coach/admin 守卫

## 与脚手架对应

| 文件 | 职责 |
|------|------|
| `src/layouts/AppLayout.tsx` | 左右分栏壳：左导航 + 右 Header + Outlet |
| `src/router.tsx` | 路由表 |
| `src/pages/*` | 各 Tab 页面内容 |
