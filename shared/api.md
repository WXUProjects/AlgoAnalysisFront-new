# CWXU-Algo API Reference

> 来源：`cwxu-algo/api/**/**_http.pb.go` + `openapi.yaml`  
> 网关：`/v1/{user|core|agent}/*`  
> 前端开发代理：`/api/*` → `https://algo.zhiyuansofts.cn/api/*`  
> 生产路径：`https://algo.zhiyuansofts.cn/api/...`（网关已将 `/api` 映射到 `/v1`）

鉴权：需要登录的接口在 Header 携带 `Authorization: Bearer <jwtToken>`。

---

## 约定

| 项 | 说明 |
|---|---|
| Base (dev) | `/api` （Vite 反代） |
| Base (prod) | `https://algo.zhiyuansofts.cn/api` |
| 后端真实路径 | `/v1/...` |
| Content-Type | `application/json` |
| 密码 | 客户端 SHA256 后再传 |

---

## User Service (`/api/user`)

### Auth

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/user/auth/login` | 否 | 登录（用户名或邮箱 + 密码），返回 jwtToken |
| POST | `/user/auth/logout` | 否 | 清除 HttpOnly 会话 Cookie |
| POST | `/user/auth/register` | 否 | 邮箱验证码注册 |
| POST | `/user/auth/refresh` | 是 | 按 DB 重签 JWT |
| POST | `/user/auth/send-code` | 否 | 发送邮箱验证码（注册/找回密码） |
| POST | `/user/auth/reset-password` | 否 | 邮箱验证码重置密码 |
| POST | `/user/auth/change-password` | 是 | 登录态改密；body: `{ oldPassword, newPassword }`（均为客户端 SHA256） |

**LoginReq**
```json
{ "username": "string", "password": "string" }
```
`username` 可为**用户名或邮箱**（含 `@` 时按邮箱匹配，大小写不敏感）。密码为客户端 SHA256 后的 hex。

**LoginRes**
```json
{ "success": true, "message": "string", "jwtToken": "string" }
```
**RegisterReq**

```json
{
  "username": "string",
  "password": "string",
  "name": "string",
  "email": "string",
  "groupId": 0,
  "code": "string"
}
```

`username`：3–64 位，仅 `A-Za-z0-9_-`（字母、数字、下划线、短横线），**不允许中文及其它特殊符号**。  
`name` = **全局昵称**（非真实姓名；加入校队时另填「组织内名称」）。  
`code` = 邮箱验证码（先调 `send-code`，`purpose=register`）。邮箱全局唯一。

**RegisterRes**
```json
{ "success": true, "message": "string" }
```

**SendCodeReq**
```json
{ "email": "string", "purpose": "register" }
```
`purpose`: `register` | `reset` | `change_email`。验证码 10 分钟有效，同一邮箱 60 秒内不可重复发送。`change_email` 须登录，用于绑定/更换邮箱（发往**新**邮箱）。

**SendCodeRes**
```json
{ "success": true, "message": "string" }
```

**ResetPasswordReq**
```json
{ "email": "string", "code": "string", "password": "string" }
```
`password` 为客户端 SHA256 后的新密码。

**ResetPasswordRes**
```json
{ "success": true, "message": "string" }
```

### Profile

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/user/profile/get-by-id` | 否 | query: `userId`；公共域受隐私约束，私人域组织内隐私配置失效 |
| GET | `/user/profile/get-by-username` | 否 | query: `username` 精确匹配；返回同 get-by-id |
| GET | `/user/profile/get-by-name` | 否 | query: `name` 模糊（用户名/昵称） |
| GET | `/user/profile/list` | 否 | query: `pageNum`, `pageSize`, `scope=org\|site`（org=当前组织；site=全站仅站管；空=兼容旧逻辑）；**org 视图 `name`=组织内名称**；site 为全局昵称；项含 `isSiteAdmin`、`orgs[{orgId,name,role}]`、`emailEnabled`/`emailWeeklyEnabled`/`emailAllowedByOrg`/`emailWeeklyAllowedByOrg`（日报周报接收状态与是否可开）、`problemFetchEnabled`/`problemAiEnabled`（题面爬取/AI 有效状态）、`createdAt`（注册时间 unix 秒）、`spiderIntervalMin`/`aiSummaryIntervalMin`（有效定时间隔）、`spiderIntervalOverridden`/`aiSummaryIntervalOverridden`（是否站管个人覆盖） |
| POST | `/user/profile/sync-policies` | 否（内部） | body: `{ userIds }` → 每人一条策略：多组织 **MIN 间隔**、开关任一开启 |
| POST | `/user/profile/update` | 是 | 更新头像/邮箱；`name` 已忽略（昵称改「我的组织」）；邮箱变更须 `emailCode`（`purpose=change_email`） |
| POST | `/user/profile/move-group` | 是 | 移动用户组 |
| POST | `/user/profile/set-email-enabled` | 是 | body: `{ userId, enabled, kind?: daily\|weekly }`；本人 / 站点管理员 / **当前组织 staff 管理本组织成员**；无组织授权时不可开启日报/周报 |
| POST | `/user/profile/set-problem-pipeline` | 是(站点管理员) | body: `{ userId, enabled, kind: fetch\|ai }`；个人覆盖：近窗提交是否触发题面爬取 / 题面 AI（默认按是否非公共域组织） |
| POST | `/user/profile/set-sync-intervals` | 是(站点管理员) | body: `{ userId, setSpider?, spiderIntervalMin?, setAi?, aiSummaryIntervalMin? }`；个人覆盖爬取/AI 总结间隔（分钟，**优先级最高**）；间隔 `0` 表示清除覆盖回落组织 MIN；范围 5–10080 |
| GET | `/user/profile/ids-by-group` | 否 | query: `groupId` |
| POST | `/user/profile/get-by-ids` | 否 | body: `{ userIds, orgId? }`；`name`=该组织 `org_display_name`（空则 username）；`orgId` 缺省用 JWT 当前组织，再回落公共域 |
| GET | `/user/profile/non-public-org-user-ids` | 否（内部） | 题面流水线资格：`userIds`/`fetchUserIds`=爬取资格，`aiUserIds`=AI 资格（默认非公共域组织 + 个人覆盖） |
| POST | `/user/profile/delete` | 是(站点管理员) | **硬删除**用户：清空 org 成员/申请/粘贴板 + core 的 OJ 绑定/提交/比赛记录，再删账号；不可删自己与站点管理员 |
| GET | `/user/profile/following-ids` | 否 | query: `userId`（0=当前用户）→ 关注的 userIds |
| POST | `/user/profile/filter-public-feed-user-ids` | 否 | body: `{ userIds }` → 公共域动态可见的子集（未配置隐私默认可见） |

### Social / Privacy

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/user/social/follow` | 是 | body: `{ userId }` 关注 |
| POST | `/user/social/unfollow` | 是 | body: `{ userId }` 取消关注 |
| GET | `/user/social/following` | 否 | query: `userId`, `page`, `pageSize` → 关注列表 |
| GET | `/user/social/followers` | 否 | query: `userId`, `page`, `pageSize` → 粉丝列表 |
| GET | `/user/social/counts` | 否 | query: `userId` → `{ followingCount, followerCount }` |
| GET | `/user/social/relation` | 否（可选 JWT） | query: `userId` → `{ isFollowing, isFollower }` |
| GET | `/user/social/search` | 否 | query: `q`, `page`, `pageSize` → 搜索用户 |
| GET | `/user/privacy/get` | 是 | 本人隐私：`privacyConfigured`, `allowPublicProfile`(默认 true), `allowPublicFeed`(默认 true) |
| POST | `/user/privacy/update` | 是 | body: `{ allowPublicProfile?, allowPublicFeed? }`；保存后 `privacyConfigured=true` |
| GET | `/user/privacy/status` | 否（可选 JWT） | `{ privacyConfigured }`；未登录视为 true（不弹窗） |

**隐私规则**：仅在**公共域**生效。私人域组织内上述配置全部失效。未登录访客视作公共域上下文。未配置过隐私时默认「允许看资料 + 加入动态」，登录后强制弹窗完成首次配置。

**动态 / 题库过滤**（core）：`submit-log/get-by-id` 支持 `followingOnly`；`problem/list` 与 `problem/submissions` 支持 `followingOnly`。

### Upload / Site

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/user/upload` | 是 | multipart `file` + 可选 `purpose`=`avatar\|site\|bulletin\|misc`，返回 `{ url }`（≤3MB 图片）。**url 带真实扩展名**（如 `.png`/`.jpg`） |
| GET | `/user/static/*` | 否 | 已上传文件；支持带后缀精确匹配；无后缀/错后缀时会按 stem 探测磁盘上的 `.png/.jpg/...` |
| GET | `/user/site/config` | 否 | 站点标题/logo/favicon/footerIcp（默认 GoAlgo） |
| GET | `/user/site/admin-config` | 是(站点管理员) | 完整站点配置（SMTP / AI 密钥脱敏） |
| POST | `/user/site/config` | 是(站点管理员) | 更新品牌 + 页脚备案 + SMTP + AI 模型密钥；密钥空串表示不修改 |
| POST | `/user/site/test-email` | 是(站点管理员) | 发送测试邮件；body 可临时覆盖 SMTP |
| POST | `/user/site/visit-ping` | 否（可选 JWT） | 页面访问上报；body `{ path?, visitorId? }`；同 path 约 30s 节流；登录用户计 DAU/MAU；真实 IP（CF-Connecting-IP / X-Real-IP / XFF） |
| GET | `/user/site/access-stats` | 是(站点管理员) | 访问与用量：`?days=30&ipLimit=200&pathLimit=20` |
| POST | `/user/site/backup/export` | 是(站点管理员) | 创建全量/按 scope 导出任务；body `{ scopes?: string[] }`（默认 `["all"]`）；返回 `{ jobId }`；后台慢慢导出 |
| POST | `/user/site/backup/import` | 是(站点管理员) | multipart：`file`=zip + `confirm=RESTORE`；按包内数据 **清空再写入** 完美复现；返回 `{ jobId }` |
| GET | `/user/site/backup/jobs` | 是(站点管理员) | 最近备份任务列表 |
| GET | `/user/site/backup/jobs/{id}` | 是(站点管理员) | 任务状态：`pending\|running\|done\|failed`、progress、message、downloadable |
| GET | `/user/site/backup/jobs/{id}/download` | 是(站点管理员) | 下载导出完成的 zip（`goalgo-backup-v1`） |
| DELETE | `/user/site/backup/jobs/{id}` | 是(站点管理员) | 删除已结束任务及磁盘文件 |

**备份 scope（预留细粒度）**：`all` \| `site` \| `users` \| `orgs` \| `pastes` \| `visits` \| `platforms` \| `submits` \| `contests` \| `problems` \| `bulletins` \| `emergency` \| `daily_stats` \| `files`。  
需 user 服务能连 `algo_core_data`（默认由 `dbname=algo_user` 推导，或 `CWXU_CORE_DATABASE_SOURCE`）。导入时 `config_encryption_key` 指纹须与导出时一致。

**GetAccessStatsRes（审核/运营看板）**

```json
{
  "code": 0,
  "registeredUsers": 1200,
  "mau": 86,
  "today": { "date": "2026-07-16", "pv": 120, "dau": 18, "uv": 40, "uniqueIp": 35, "newUsers": 3 },
  "yesterday": { "date": "2026-07-15", "pv": 90, "dau": 15, "uv": 32, "uniqueIp": 28, "newUsers": 1 },
  "series": [{ "date": "2026-07-01", "pv": 50, "dau": 10, "uv": 20, "uniqueIp": 15, "newUsers": 2 }],
  "totalPv": 3000,
  "totalDauSum": 400,
  "topPaths": [{ "path": "/", "category": "首页", "pv": 50, "share": 41.6 }],
  "categories": [{ "category": "题库", "pv": 30, "share": 25 }],
  "ips": [{ "ip": "1.2.3.4", "pv": 5, "lastPath": "/contest", "lastSeen": 1721000000 }],
  "apiRequestsToday": 15000,
  "apiPeakConcurrent": 42,
  "apiInflight": 3,
  "spiderEnqueuedToday": 200,
  "spiderOkToday": 180,
  "spiderFailToday": 5,
  "spiderRowsToday": 3200,
  "clientIpAvailable": true,
  "metricNote": "..."
}
```

指标说明：

| 字段 | 含义 |
|------|------|
| `registeredUsers` | 注册用户总数 |
| `today.dau` / `mau` | 日活 / 月活（登录用户访问去重） |
| `today.pv` | 页面浏览量 PV（同 path 约 30s 节流） |
| `series[].newUsers` / `today.newUsers` | 当日新注册用户数（上海时区自然日） |
| `today.uniqueIp` / `ips[]` | 独立 IP 数与明细列表 |
| `categories` / `topPaths` | 服务模块使用分布与热门页面 |
| `apiRequestsToday` / `apiPeakConcurrent` | 今日 API 请求量 / 并发峰值 |
| `spider*Today` / `spiderRowsToday` | 爬虫入队/成功/失败 / 新写入提交条数 |

**GetConfigRes（公开）**

```json
{
  "siteTitle": "GoAlgo",
  "siteLogo": "",
  "favicon": "",
  "footerIcp": "苏ICP备2025217901号"
}
```

**GetAdminConfigRes / UpdateConfigReq（业务配置）**

```json
{
  "siteTitle": "GoAlgo",
  "siteLogo": "",
  "favicon": "",
  "footerIcp": "苏ICP备2025217901号",
  "smtpHost": "smtp.163.com",
  "smtpPort": 465,
  "smtpUsername": "xxx@163.com",
  "smtpPassword": "",
  "smtpPasswordMasked": "••••••••",
  "smtpPasswordSet": true,
  "smtpFrom": "xxx@163.com",
  "clearSmtpPassword": false,
  "agentModel": "glm-4-7-251222",
  "agentSecret": "",
  "agentSecretMasked": "••••••••",
  "agentSecretSet": true,
  "clearAgentSecret": false,
  "aiAnalyzeEndpoint": "http://host/api",
  "aiAnalyzeModel": "glm-5",
  "aiAnalyzeSecret": "",
  "aiAnalyzeSecretMasked": "••••••••",
  "aiAnalyzeSecretSet": true,
  "clearAiAnalyzeSecret": false
}
```

说明：`smtp` / `agent` / `ai_analyze` 原 yaml 配置已迁入站点设置；服务 yaml 仅作启动兜底。保存后写入 DB 并同步 Redis。`footerIcp` 为空时前端页脚使用默认备案号。

### Paste（粘贴板 / Pastebin）

HTTP 手写路由。创建需登录；公开查看不需登录。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/user/paste/create` | 是 | body: `{ title?, content, language?, expire? }`；`expire`=`never\|1h\|1d\|1w\|1m\|1y`；内容 ≤512KB；返回 `{ data: Paste }` |
| GET | `/user/paste/get` | 否 | query: `slug`；过期返回 404 |
| GET | `/user/paste/mine` | 是 | 我创建的最近 50 条（不含正文） |
| POST | `/user/paste/delete` | 是 | body: `{ slug }`；本人或站点管理员 |

**Paste**

```json
{
  "id": 1,
  "slug": "aB3xY9kLmN",
  "title": "string",
  "content": "string",
  "language": "go",
  "userId": 1,
  "createdAt": 1710000000,
  "expireAt": null
}
```

前端路由：`/tools` 工具入口；`/tools/paste` 创建；`/p/:slug` 公开查看。

### Org（GoAlgo 多租户）

HTTP 手写路由（非 proto）+ Auth proto。JWT 含 `isSiteAdmin` / `orgId` / `orgRole`（`member|coach|captain|org_admin`）。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/user/auth/refresh` | 是 | 按 DB 重签 JWT（任命后 F5 同步权限） |
| POST | `/user/auth/logout` | 否 | 清除 HttpOnly 会话 Cookie |
| GET | `/user/org/discover` | 否（可选 JWT） | 组织广场：`page`/`pageSize`/`q` → `{id,name,brandLogo,memberCount,isSystem,isMember?,isCurrent?}` 无识别码 |
| GET | `/user/org/list` | 是 | 我的组织；项含 `myRole`、`orgDisplayName`、`isCurrent`、`seatLimit`、`memberCount`；`?all=1` 站点管理员看全部 |
| GET | `/user/org/get` | 是 | query: `id`（默认当前组织）；含 `seatLimit`、`memberCount`；若本人是成员则含 `myRole`、`orgDisplayName` |
| POST | `/user/org/create` | 站点管理员 | `{ name, slug?, adminUserId?, joinMode?, seatLimit? }`；默认 `seatLimit=50` |
| POST | `/user/org/update` | 组织/站点管理员 | 品牌/开关/joinMode；间隔与 **seatLimit（用户数上限）仅站点管理员** |
| POST | `/user/org/delete` | 站点管理员 | `{ id }` **硬删除**；**公共域不可删**；成员迁回公共域；挂在该组织分组上的用户迁到公共域默认分组 |
| POST | `/user/org/switch` | 是 | `{ orgId }` → 新 `jwtToken`；**同时写入默认组织**（下次打开自动进入，无需单独设默认） |
| POST | `/user/org/join` | 是 | `{ inviteCode, orgDisplayName }` 团队识别码 + **组织内名称（必填）**；**不改**默认组织 |
| POST | `/user/org/leave` | 是 | `{ orgId }`；**公共域不可退出**；若离开的是默认组织则回落公共域 |
| GET | `/user/org/members` | 成员 | query: `orgId`；返回 `name`（组织内名称，空则 username）、`orgDisplayName`（原始字段，**不再返回 nickname**） |
| POST | `/user/org/members/set-role` | 组织/站点管理员 | `{ orgId, userId, role: member\|coach\|captain\|org_admin }`；若不在组织则加入并 **设为默认组织** |
| POST | `/user/org/members/remove` | 组织/站点管理员 | `{ orgId, userId }`；不可移出公共域；若移出默认组织则回落公共域 |
| POST | `/user/org/members/add` | 站点/组织管理员 | `{ orgId, userId?\|username?, role?, orgDisplayName? }` 搜索加入；**设为默认组织**；组织内名称可填，默认用对方全局昵称 |
| POST | `/user/org/members/set-display-name` | 本人或组织/站点管理员 | `{ orgId, userId?, orgDisplayName }` 改组织内名称 |
| GET | `/user/org/member-ids` | 否/登录 | query: `orgId` → `{ userIds }`（core 隔离用） |
| GET | `/user/profile/ids-by-org` | 否 | query: `orgId` → 组织成员 ids（gRPC/HTTP） |
| GET | `/user/profile/non-public-org-user-ids` | 否（内部） | 非公共域组织用户 ids（题面 AI：仅这些用户的提交触发分析） |
| GET | `/user/org/invite` | 组织管理员 | query: `orgId` → 团队识别码 |
| POST | `/user/org/invite/rotate` | 组织管理员 | `{ orgId }` 更换识别码 |
| GET | `/user/org/join-requests` | 组织管理员 | 待审批列表 |
| POST | `/user/org/join-requests/review` | 组织管理员 | `{ id, approve }` |
| POST | `/user/platform/set-site-admin` | 站点管理员 | `{ userId, isSiteAdmin }` |

默认组织（`users.current_org_id`）：注册时为 **公共域** `slug=public`（全员自动加入，不可退出）。  
**管理员拉入**某组织后，该组织成为用户默认组织（下次打开自动进入）。用户之后只需 **switch 切换**，切换即记忆，无需刻意「修改默认组织」。

**用户数上限（seatLimit）**

| 规则 | 说明 |
|------|------|
| 默认 | 每个组织默认 **50** 人；站点管理员可在创建/更新时设置 |
| 普通组织 | `memberCount` = 组织成员总数；达上限后无法 join / add / 审批通过 / set-role 拉入 |
| 公共域 | `memberCount` 仅统计 **只属于公共域、未加入其它组织** 的用户；注册占用公共域席位 |
| 权限 | 仅 **站点管理员** 可改 `seatLimit` |

**名称语义（已合并）**

| 字段 | 含义 | 范围 |
|------|------|------|
| `users.name` | **昵称** | 全站个人资料；**与公共域组织内称呼同步** |
| `org_members.org_display_name` | **组织内名称 / 对外称呼** | 仅该组织成员列表/队内展示；公共域与昵称双向同步 |

- 注册：填写昵称 → 写入 `users.name` **并**写入公共域 `org_display_name`
- 改资料昵称 → 同步更新公共域称呼
- 改公共域组织内称呼 → 同步更新 `users.name`
- 其他组织称呼独立，互不影响
- 加入团队（识别码）须填写该组织内名称；成员列表 `name` 仅用组织内名称（空则 username）

**GetByIdRes**
```json
{
  "userId": 1,
  "username": "string",
  "name": "string",
  "email": "string",
  "groupId": 0,
  "avatar": "string",
  "emailEnabled": true,
  "roleId": 1,
  "spiders": [{ "platform": "NowCoder", "username": "xxx" }]
}
```

**UpdateReq**
```json
{
  "userId": 1,
  "email": "string",
  "avatar": "string",
  "emailCode": "string",
  "name": "string"
}
```
- `name`：已废弃，服务端忽略；请在「我的组织」改组织内称呼（公共域同步全局昵称）
- `email` 与当前不同时：`emailCode` 必填（`POST /user/auth/send-code`，`purpose=change_email`）
- 旧版迁移用户若邮箱为空，须在此绑定并验证后才能收订阅/日报邮件

**MoveGroupReq**
```json
{ "userId": 1, "groupId": 2 }
```

**SetEmailEnabledReq**
```json
{ "userId": 1, "enabled": true }
```

**DeleteReq**
```json
{ "userId": 1 }
```

### Group

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/user/group/create` | 是 | 创建分组 |
| POST | `/user/group/delete` | 是 | body: `{ id }` |
| POST | `/user/group/update` | 是 | 更新分组 |
| GET | `/user/group/get` | 是 | query: `id` |
| GET | `/user/group/list` | 是 | query: `page`, `size` |

**CreateReq**
```json
{ "name": "string", "describe": "string" }
```

**UpdateReq**
```json
{ "id": 1, "name": "string", "describe": "string" }
```

### Role

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/user/role/list` | 否 | 角色列表 |
| POST | `/user/role/set-user-role` | 是(管理员) | 设置用户角色 |

**角色 ID**

| roleId | 名称 | 说明 |
|--------|------|------|
| 0 | 队员 | 交题、个人资料、绑 OJ |
| 1 | 管理员 | 全部功能 |
| 2 | 教练 | 仅管理端；登录直达教练管理，无队员资料流程 |
| 3 | 队长 | 教练管理权限 + 队员交题/资料 |

**SetUserRoleReq**
```json
{ "userId": 1, "roleId": 3 }
```

---

## Core Service (`/api/core`)

### Submit Log

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/submit-log/get-by-id` | 否 | query: `userId`, `limit`, `cursor` |

**响应 `data[]` 字段**（服务端批量补齐展示字段，前端无需再打 profile/problem N+1）:

| 字段 | 说明 |
|------|------|
| `id` / `platform` / `userId` / `submitId` / `contest` / `problem` / `lang` / `status` / `time` / `problemId` | 原有 |
| `userName` | 当前组织对外称呼（`GetByIds` 按 org 解析） |
| `problemTitle` | 题库标题（本库 `problems` 一次 `IN` 查询；无 `problemId` 时为空） |
| `problemTags` | 题库 AI 标签（同次批量查询，最多 6 个；无 `problemId` 时为空） |
| `problemDifficulty` | 题库难度（同次批量查询；无 `problemId` 时为空） |

### Spider

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/core/spider/set` | 是 | 绑定 OJ 账号（仅全量同步该平台） |
| POST | `/core/spider/update` | 是(站点管理员) | 手动全量同步单用户全部已绑定平台 |
| POST | `/core/spider/update-all` | 是(站点管理员) | 全站用户全量更新 |
| GET | `/core/spider/submit-inventory` | 是(站点管理员) | 真实入库库存：`submitLogsTotal` / `submitLogsRealTotal` / `countedSubmitIdsTotal` / `oldestTime` / `newestTime` |
| POST | `/core/spider/purge-submits-and-recrawl` | 是(站点管理员) | 清空全部提交相关（`submit_logs`+账本+日汇总+AC 预聚合）并全量重爬；body `{ confirm: "PURGE_SUBMITS" }`；保留比赛记录与 OJ 绑定 |

**SetSpiderReq**
```json
{ "platform": "NowCoder|AtCoder|CodeForces|LuoGu|LeetCode|QOJ", "userId": 1, "username": "string" }
```
绑定成功后后台只抓取该 `platform` 的全量提交/比赛，不会重扫用户其它已绑定 OJ。

重绑同一平台时会先删除该平台已有提交/比赛明细，并按剩余明细**重建**日汇总与 AC 去重预聚合，再全量拉取，避免题量/提交量叠加（连点绑定不会再把 3000 叠成 6000）。

**UpdateReq**
```json
{ "userId": 1 }
```
仅站点管理员可调用；普通用户无手动更新入口，依赖组织定时同步与绑定后自动抓取。

### Statistic

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/statistic/heatmap` | 否 | query: `startDate`, `endDate`, `isAc`, `userId?`（个人>0；`0`=当前组织；`-2`=全站仅站管） |
| GET | `/core/statistic/period` | 否 | query: `userId`（个人>0；`-1`=当前组织；`-2`=全站仅站管） |
| GET | `/core/statistic/rank` | 否 | 排行榜 |

**PeriodRes.data**
```json
{
  "ac": { "today": 0, "thisWeek": 0, "lastWeek": 0, "thisMonth": 0, "lastMonth": 0, "thisYear": 0, "lastYear": 0, "total": 0, "totalRaw": 0 },
  "submit": { "today": 0, "thisWeek": 0, "lastWeek": 0, "thisMonth": 0, "lastMonth": 0, "thisYear": 0, "lastYear": 0, "total": 0 }
}
```
- 个人 `userId>0`：`ac.total`=累计题数（去重）；`ac.totalRaw`=累计 AC 次数；时段字段为去重题数
- 组织/全站 `userId=-1/-2`：`ac` 全部为 AC 条数（status 含 AC/正确/OK，不去重）

### Contest

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/contest/list` | 否 | query: `userId`(-1=全部), `limit`, `offset`, `platform?` |
| GET | `/core/contest/history` | 否 | query: `userId`, `limit`, `cursor`, `platform?` |
| GET | `/core/contest/ranking` | 否 | query: `contestId` 或 `contest_id`, `limit`, `offset`, `groupId?`, `followingOnly?`（与组织/分组求交） |

### ContestCalendar（比赛日历 / 公开赛程）

与 Contest（参赛记录）分离。数据源：`calendar.cpolar.cn`（综合）+ 力扣 GraphQL，每 12 小时爬取。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/contest-calendar/list` | 否 | query: `platform?`, `keyword?`, `status?`(upcoming\|ongoing\|all), `limit`, `offset` |
| GET | `/core/contest-calendar/platforms` | 否 | 平台及即将开始场次统计 |
| GET | `/core/contest-calendar/sub` | 是 | 我的邮件订阅 |
| POST | `/core/contest-calendar/sub` | 是 | 创建/更新订阅 body: `{ scope, platform?, calendarId?, advanceMinutes, enabled }` |
| POST | `/core/contest-calendar/sub/delete` | 是 | 删除订阅 body: `{ scope, platform?, calendarId? }` |

**scope**：`platform`（整平台）或 `contest`（单场）。  
**advanceMinutes** 白名单：`30, 60, 180, 360, 720, 1440, 2880, 4320`。  
订阅需账号已绑定邮箱（core 经 user 内部 `GetContactEmail` 校验）；`enabled=true` 保存成功后**每次**异步发送**订阅成功确认邮件**（含已订阅再点、取消后再订；不限流）。`enabled=false` 不发确认信。开赛前提醒在 `advanceMinutes` 时发送，同一用户同一场同一提前量只发一次（先原子占坑再发信）。

### Bulletin

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/core/bulletin/create` | 是(教练/管理员) | 创建公告 |
| POST | `/core/bulletin/update` | 是(教练/管理员) | 更新公告 |
| DELETE | `/core/bulletin/delete` | 是(教练/管理员) | query: `id` |
| GET | `/core/bulletin/get` | 否 | query: `id` |
| GET | `/core/bulletin/list` | 否 | query: `page`, `pageSize` |

**CreateReq**
```json
{ "title": "string", "content": "string", "isPinned": false }
```

**BulletinInfo**
```json
{
  "id": 1,
  "title": "string",
  "content": "string",
  "authorId": 1,
  "authorName": "string",
  "isPinned": false,
  "createdAt": 1710000000,
  "updatedAt": 1710000000
}
```

### Emergency（紧急弹窗）

全站紧急通知；用户端强制弹窗，本地 localStorage 记录已确认的最大 id。仅站点管理员可管理。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/core/emergency/create` | 是(站点管理员) | 创建 |
| POST | `/core/emergency/update` | 是(站点管理员) | 更新 |
| DELETE | `/core/emergency/delete` | 是(站点管理员) | query: `id` |
| GET | `/core/emergency/list` | 是(站点管理员) | query: `page`, `pageSize` |
| GET | `/core/emergency/active` | 否 | 当前生效列表（`enabled=true`，按 sortOrder） |

**CreateReq / UpdateReq**
```json
{ "id": 1, "title": "string", "content": "string", "enabled": true, "sortOrder": 0 }
```
（Create 无 `id`）

**EmergencyInfo**
```json
{
  "id": 1,
  "title": "string",
  "content": "string",
  "enabled": true,
  "sortOrder": 0,
  "authorId": 1,
  "authorName": "string",
  "createdAt": 1710000000,
  "updatedAt": 1710000000
}
```

### Problem

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/problem/list` | 否 | 题库列表 |
| GET | `/core/problem/tags` | 否 | 标签聚合 `?limit=`，返回 `{ tag, count }[]` |
| GET | `/core/problem/get` | 否 | query: `id` |
| GET | `/core/problem/following-status` | 是 | query: `problemId` → 关注用户对本题 `AC|TRIED|NONE` |
| GET | `/core/problem/submissions` | 否 | query: `problemId`, `page`, `pageSize`, `userId?`, `followingOnly?`（不受域限制）, `status?`=`AC` |
| GET | `/core/problem/user-profile` | 否 | query: `userId` 做题画像 |
| GET | `/core/problem/progress` | 是(管理员) | 爬取/分析进度 |
| POST | `/core/problem/backfill` | 是(管理员) | 近6月提交回填入队；body: `{ limit }`；**仅组织用户提交**的题才爬题面/跑 AI；纯公共域/散户只入库（前端「题面准备中」） |
| POST | `/core/problem/emergency-stop` | 是(管理员) | 暂停分析（队列保留） |
| POST | `/core/problem/reset-all` | 是(管理员) | 重置 AI 标签；body: `{ requeue, requeueSet }` |
| POST | `/core/problem/reset-queues` | 是(管理员) | purge MQ 后按 DB 待爬/待分析重灌 |
| POST | `/core/problem/resume` | 是(管理员) | 恢复分析 |
| POST | `/core/problem/retry-failed` | 是(管理员) | body: `{ limit }` |
| POST | `/core/problem/toggle-analyze` | 是(管理员) | 暂停/恢复分析（不清队列）；`{ pause?, pauseSet? }` |
| POST | `/core/problem/toggle-fetch` | 是(管理员) | 暂停/恢复爬取（不清队列）；`{ pause?, pauseSet? }` |
| POST | `/core/problem/admin-update` | 是(**站点管理员**) | 直接改标签/题面（无需审核）；`{ id, updateTags?, tags?, updateContent?, contentMd?, title? }` |
| POST | `/core/problem/propose-edit` | 是(登录) | 提交标签/题面修改申请；站管调用时直接保存；`{ problemId, updateTags?, tags?, updateContent?, contentMd?, title?, note? }` |
| GET | `/core/problem/edit-requests` | 是(**站点管理员**) | 审核列表 `?page&pageSize&status=pending\|approved\|rejected` |
| POST | `/core/problem/review-edit` | 是(**站点管理员**) | 通过/驳回；`{ id, approve, reviewNote? }` |
| GET | `/core/problem/my-pending-edit` | 是(登录) | 当前用户对该题的待审申请 `?problemId=` |

**人工修改与 AI 规则**

- 站点管理员可直接改标签/题面；普通用户提交申请，由站点管理员审核。
- 题面未爬取时也允许补充题面（走审核或站管直改）。
- 标签**非空**时 AI 分析会跳过（避免覆盖人工标签）；标签为空时仍会分析。
- 审核通过或站管直改后：有题面+有标签 → `COMPLETED`；有题面无标签 → 入队 AI 分析。

**List query params**
- `page`, `pageSize`
- `sort`: 忽略，固定 `last_submitted_at DESC`
- `platforms`: 逗号分隔
- `tags`: 逗号分隔（OR，jsonb 包含）
- `userStatus`: `AC` | `TRIED` | `NONE`（需 `userId`）
- `userId`, `keyword`, `difficulty`

**ListTags** `GET /core/problem/tags?limit=100`
```json
{ "code": "0", "message": "success", "data": [{ "tag": "前缀和", "count": "28" }] }
```

**ProblemInfo**
```json
{
  "id": 1,
  "platform": "string",
  "externalId": "string",
  "title": "string",
  "url": "string",
  "contentMd": "string",
  "problemType": "string",
  "tags": ["string"],
  "solutions": [{
    "name": "string",
    "timeComplexity": "string",
    "spaceComplexity": "string",
    "briefExplanation": "string"
  }],
  "difficulty": "string",
  "status": "string",
  "errorMsg": "string",
  "lastSubmittedAt": 0,
  "userStatus": "AC|TRIED|NONE"
}
```

**AdminUpdate** `POST /core/problem/admin-update`
```json
{
  "id": 1,
  "updateTags": true,
  "tags": ["动态规划", "前缀和"],
  "updateContent": true,
  "contentMd": "# 题目标题\n\n## 题意\n...",
  "title": "可选新标题"
}
```
响应：`{ "code": 0, "message": "已保存", "data": ProblemInfo }`

**ProposeEdit** `POST /core/problem/propose-edit`
```json
{
  "problemId": 1,
  "updateTags": true,
  "tags": ["图论"],
  "updateContent": false,
  "contentMd": "",
  "title": "",
  "note": "原标签不准"
}
```
响应：`{ "code": 0, "message": "已提交，等待站点管理员审核", "requestId": 12 }`  
（站点管理员调用时直接保存，message 为「已直接保存」）

**ProblemEditInfo / ListEditRequests**
```json
{
  "code": 0,
  "message": "success",
  "data": [{
    "id": 12,
    "problemId": 1,
    "platform": "CodeForces",
    "externalId": "123A",
    "problemTitle": "string",
    "userId": 3,
    "userName": "string",
    "hasTags": true,
    "hasContent": false,
    "proposedTags": ["图论"],
    "proposedContentMd": "",
    "proposedTitle": "",
    "note": "string",
    "status": "pending",
    "reviewerId": 0,
    "reviewNote": "",
    "createdAt": 1710000000,
    "updatedAt": 1710000000,
    "currentTags": ["旧标签"],
    "currentContentMd": "...",
    "currentTitle": "..."
  }],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

**ReviewEdit** `POST /core/problem/review-edit`
```json
{ "id": 12, "approve": true, "reviewNote": "ok" }
```

**MyPendingEdit** `GET /core/problem/my-pending-edit?problemId=1`
```json
{ "code": 0, "message": "success", "hasPending": true, "data": { /* ProblemEditInfo */ } }
```

---

## Agent Service (`/api/agent`)

### Summary

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/agent/summary/recent` | 否 | query: `userId` AI 近期总结 |

**Response**
```json
{ "code": 0, "msg": "string", "resp": "{\"msg\":[\"...\"],\"updateTime\":\"...\"}" }
```
`resp` 为 JSON 字符串，需前端再 `JSON.parse`。

---

## 完整路径清单（共 45）

```
POST   /api/user/auth/login
POST   /api/user/auth/logout
POST   /api/user/auth/register
POST   /api/user/auth/refresh
POST   /api/user/auth/send-code
POST   /api/user/auth/reset-password
GET    /api/user/site/config
GET    /api/user/site/admin-config
POST   /api/user/site/config
POST   /api/user/site/test-email
POST   /api/user/site/backup/export
POST   /api/user/site/backup/import
GET    /api/user/site/backup/jobs
GET    /api/user/site/backup/jobs/{id}
GET    /api/user/site/backup/jobs/{id}/download
DELETE /api/user/site/backup/jobs/{id}
GET    /api/user/profile/get-by-id
GET    /api/user/profile/get-by-name
GET    /api/user/profile/list
POST   /api/user/profile/update
POST   /api/user/profile/move-group
POST   /api/user/profile/set-email-enabled
GET    /api/user/profile/ids-by-group
POST   /api/user/profile/get-by-ids
POST   /api/user/profile/delete
POST   /api/user/group/create
POST   /api/user/group/delete
POST   /api/user/group/update
GET    /api/user/group/get
GET    /api/user/group/list
GET    /api/user/role/list
POST   /api/user/role/set-user-role
GET    /api/user/org/list
GET    /api/user/org/get
POST   /api/user/org/create
POST   /api/user/org/update
POST   /api/user/org/switch
POST   /api/user/org/join
POST   /api/user/org/leave
GET    /api/user/org/members
POST   /api/user/org/members/set-role
POST   /api/user/org/members/remove
GET    /api/user/org/invite
POST   /api/user/org/invite/rotate
GET    /api/user/org/join-requests
POST   /api/user/org/join-requests/review
POST   /api/user/platform/set-site-admin
GET    /api/core/submit-log/get-by-id
POST   /api/core/spider/set
POST   /api/core/spider/update
POST   /api/core/spider/update-all
GET    /api/core/spider/submit-inventory
POST   /api/core/spider/purge-submits-and-recrawl
GET    /api/core/statistic/heatmap
GET    /api/core/statistic/period
GET    /api/core/statistic/rank
GET    /api/core/contest/list
GET    /api/core/contest/history
GET    /api/core/contest/ranking
POST   /api/core/bulletin/create
POST   /api/core/bulletin/update
DELETE /api/core/bulletin/delete
GET    /api/core/bulletin/get
GET    /api/core/bulletin/list
GET    /api/core/problem/list
GET    /api/core/problem/get
GET    /api/core/problem/submissions
GET    /api/core/problem/user-profile
GET    /api/core/problem/progress
POST   /api/core/problem/backfill
POST   /api/core/problem/emergency-stop
POST   /api/core/problem/reset-all
POST   /api/core/problem/reset-queues
POST   /api/core/problem/resume
POST   /api/core/problem/retry-failed
POST   /api/core/problem/toggle-analyze
POST   /api/core/problem/toggle-fetch
GET    /api/agent/summary/recent
```

## 来源

- Proto: `cwxu-algo/api/{user,core,agent}/v1/**/*.proto`
- OpenAPI: `cwxu-algo/openapi.yaml`
- 网关路由: `cwxu-algo/app/gateway/cmd/gateway/config.yaml`
