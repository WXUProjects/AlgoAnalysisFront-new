# 博客 UI 调优文档（留存）

> 状态：**三主题已上线**。默认 **Chirpy**（1:1 复刻 [lumenvestige.github.io](https://lumenvestige.github.io/) / jekyll-theme-chirpy）；备选 **简约**、**Mizuki**（适配 [LyraVoid/Mizuki](https://github.com/LyraVoid/Mizuki)，非默认，动画轻度–中度）。  
> 作者可在「外观设置」切换主题，并自定义 Chirpy/Mizuki 外链图标。  
> 页脚**备案信息始终使用主站** `footerIcp`（`SiteConfig`）。

---

## 1. 目标与边界

| 项 | 说明 |
|----|------|
| 路径 | 单域名 `/blog/:username`，无独立子域；主站广场 `/blog-plaza` |
| 壳 | 个人博客 **独立于主站 AppLayout**；广场走主站侧栏 |
| 默认主题 | `chirpy`（Chirpy） |
| 备选主题 | `simple`（简约）· `mizuki`（Mizuki，[GitHub](https://github.com/LyraVoid/Mizuki)） |
| 外链 | Chirpy 侧栏 / Mizuki 资料卡 图标可配置（github / x / email / rss / …） |
| 备案 | 页脚 ICP 读主站站点配置，不按博客作者自定义 |
| 数据 | 文章与主站推荐/资料共用同一 `blog_articles` 记录 |
| 登录 | 回主站 `/login?redirect=/blog/...` |
| 管理 | **独立新开页** `/blog/:u/manage/*`（`BlogAdminLayout`），与阅读壳分离 |
| 进博客 | 主站任意入口 → 个人博客 **一律新标签**（`BlogLink` / `target=_blank`） |
| 图片 | **禁止上传**；工具栏与封面仅允许 http(s) 链接 |

---

## 2. 主题系统

| 位置 | 职责 |
|------|------|
| `src/lib/blog-theme.ts` | `themeId` / `socialLinks` 解析；默认 `chirpy` |
| `src/styles/blog-chirpy.css` | Chirpy 色板与布局（侧栏 260/300px、卡片、归档时间线…） |
| `src/styles/blog-mizuki.css` | Mizuki 色板与布局（hue 系 oklch、毛玻璃顶栏、圆角卡片） |
| `src/components/blog/chirpy-shell.tsx` | Chirpy 壳：侧栏 / 顶栏 / 右栏 / 页脚 |
| `src/components/blog/simple-shell.tsx` | 简约壳：原顶栏 + Tab |
| `src/components/blog/mizuki-shell.tsx` | Mizuki 壳：浮动顶栏 / 渐变横幅 / 右侧资料卡（无樱花/轮播等重特效） |
| `BlogLayout` | 读 `by-username` 的 `themeId`/`subtitle`/`socialLinks` 并切换壳 |
| `GET /user/blog/theme/status` | 返回主题配置 |
| `POST /user/blog/theme/config` | **作者**保存 `themeId` + `subtitle` + `socialLinks` |
| `POST /user/blog/theme/enable` | 站管遗留：自由 CSS 能力开关（未使用） |
| `blog_site_configs` 表 | 后端持久化 |

### Chirpy 路由

| 路径 | 说明 |
|------|------|
| `/blog/:u` | 首页文章列表 |
| `/blog/:u/categories` | 公开分类 |
| `/blog/:u/archives` | 归档时间线 |
| `/blog/:u/about` | 关于 |
| `/blog/:u/manage` | 文章管理（独立壳，新开页） |
| `/blog/:u/manage/settings` | 外观设置（主人） |

### Chirpy 功能对齐

| 功能 | 状态 |
|------|------|
| 侧栏导航 首页/分类/归档/关于 | ✅ |
| 顶栏搜索 + 结果面板 | ✅ |
| 右栏最近更新 / 分类标签 | ✅ |
| 正文目录 TOC | ✅ |
| 阅读时长 / 复制链接 | ✅ |
| 相关文章 | ✅ |
| 点赞 / 评论 | ✅ |
| 社交外链自定义 | ✅ |
| 文章管理新开独立页 | ✅ |

---

## 3. 布局结构

### Chirpy（默认）

```
ChirpyShell
├── 左侧固定栏：头像 / 站名 / 导航 / 明暗 + 社交图标
├── 主区顶栏：面包屑 · 搜索 · 回广场/主站
├── 主列 Outlet + （首页）右侧「最近更新 / 分类」
└── 页脚：© 作者 · 主站备案 · 主题 Chirpy
```

### 简约

```
SimpleShell
├── 顶栏：标题 · 广场 · 主站 · 主题切换 · 登录
├── Tab：文章 | 管理…
└── Outlet + 页脚（含主站备案）
```

### Mizuki（可选，非默认）

```
MizukiShell  ← 适配 https://github.com/LyraVoid/Mizuki
├── 毛玻璃浮动顶栏：品牌 · 导航 · 搜索 · 明暗
├── 首页软渐变横幅（无轮播 / 无波浪 / 无樱花）
├── 主列文章卡片（左色条 + 圆角）+ 右侧资料卡 / 最近更新 / 分类 / TOC
└── 页脚：© · 备案 · 主题来源 GitHub 链接
```

动画：进入淡入/微上移、hover 阴影与 1px 抬起、按钮 120–180ms；`prefers-reduced-motion` 关闭。

---

## 4. 主站推荐与博客广场

文章 `recommend=true` 且 `visibility=public` 时进入 `GET /user/blog/recommend`。  
广场：`GET /user/blog/plaza` + `GET /user/blog/authors`（仅 public）。

---

## 5. 文案约定

面向 C 端用户。图片相关统一使用：

> 暂不支持上传图片，请插入图片链接，例如：`![说明](https://example.com/pic.png)`

---

## 6. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-07-17 | 初版：独立壳、共享文章、主题钩子与文档落盘 |
| 2026-07-17 | Chirpy 默认主题 1:1 复原；简约=原壳；社交链接可配；备案走主站 |
| 2026-07-17 | 新增可选主题 Mizuki（适配 LyraVoid/Mizuki，轻度动画，非默认） |
