# 博客 UI 调优文档（留存）

> 状态：自定义主题能力**已预留、默认关闭**。  
> 默认外观：与主站同一套 shadcn 语义 token（`bg-background`、`text-foreground`、`border` 等）。  
> 开放方式：站点管理员调用 `POST /api/user/blog/theme/enable`（`mode=user|batch|all`）。

---

## 1. 目标与边界

| 项 | 说明 |
|----|------|
| 路径 | 单域名 `/blog/:username`，无独立子域；主站广场 `/blog-plaza` |
| 壳 | 个人博客 **独立于主站 AppLayout**；广场走主站侧栏 |
| 数据 | 文章与主站推荐/资料共用同一 `blog_articles` 记录 |
| 登录 | 回主站 `/login?redirect=/blog/...` |
| 管理 | 仅博客主人显示「文章管理」Tab |
| 广场 | 侧栏「博客」→ 公开文流 + 活跃作者；个人壳顶栏/页脚回链广场 |
| 图片 | **禁止上传**；工具栏与封面仅允许 http(s) 链接 |
| 自定义页 CMS | **本阶段不做** |

---

## 2. 主题扩展点（代码）

| 位置 | 职责 |
|------|------|
| `src/lib/blog-theme.ts` | `resolveBlogTheme` / `blogThemeStyle` — 纯逻辑 |
| `GET /user/blog/theme/status` | `enabled` + 预留 `customTheme` |
| `POST /user/blog/theme/enable` | 站管：单用户 / 批量 / 全开 |
| `BlogLayout` | 读取 `themeEnabled`，应用 `blogThemeStyle`（当前无 payload 时无副作用） |

### 推荐接入顺序（未来开放时）

1. 后端写入用户级 `customTheme` JSON（颜色 / 字体 / 封面样式）
2. `theme/status` 返回该 JSON
3. `resolveBlogTheme({ enabled, customTheme })` 映射为 CSS 变量
4. `BlogLayout` 根节点 `style={blogThemeStyle(ctx)}`
5. **禁止**直接让用户提交任意 CSS（XSS）；只允许白名单 token 键

### 白名单 CSS 变量（建议）

```
--blog-accent
--blog-header-bg
--blog-card-radius
--blog-font-sans
```

未列入白名单的键应被丢弃。

---

## 3. 布局结构

```
BlogLayout
├── 顶栏：博客标题 / 作者 · 返回主站 · 主题切换 · 登录|管理
├── 次级 Tab：文章 | （主人）管理 | （主人）数据 | （主人）分类
└── Outlet（列表 / 正文 / 编辑器）
```

- 列表：封面 + 标题 + 摘要 + 日期 + 阅读/赞/评
- 正文：MarkdownBody（GFM / 代码 / KaTeX）+ 点赞 + 评论
- 编辑：MarkdownEditor（`linkOnlyImages`）+ 可见性 / 密码 / 推荐 / 组织同步 / 头图链接

---

## 4. 主站推荐与博客广场

文章 `recommend=true` 且 `visibility=public` 时进入 `GET /user/blog/recommend`。  
发现页「推荐」流可挂载该列表（卡片链到 `/blog/:username/:slug`），并提供「去博客广场」入口。

| 接口 | 用途 |
|------|------|
| `GET /user/blog/plaza` | 广场主列：`sort=latest\|hot\|recommend` + keyword |
| `GET /user/blog/authors` | 广场侧栏：最近有公开文的作者 |

广场仅聚合 **public** 文；密码/私密不进广场。

---

## 5. 文案约定

面向 C 端用户，避免技术黑话。图片相关统一使用：

> 暂不支持上传图片，请插入图片链接，例如：`![说明](https://example.com/pic.png)`

---

## 6. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-07-17 | 初版：独立壳、共享文章、主题钩子与文档落盘 |
