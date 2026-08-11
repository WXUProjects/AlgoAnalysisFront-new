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
{
  "success": true,
  "message": "string",
  "jwtToken": "string",
  "wasDormant": false,
  "syncStarted": false
}
```
- `wasDormant`：登录前处于不活跃休眠；为 true 时后端会入队**全量**爬虫，`message` 会提示同步中  
- `inactiveDays`：距上次活跃的整天数（登录前计算；无记录则按注册时间）；≥3 天时 `message` 为欢迎回来文案  

- `syncStarted`：是否已触发唤醒入队  

**不活跃休眠（成本）**

| 项 | 说明 |
|----|------|
| 阈值 | `site_configs.inactive_days`，默认 14，站管可改 1–365 |
| 主信号 | `users.last_login_at`（登录写；VisitPing 登录用户 1h 节流写） |
| 豁免 | 站管 / `sync_exempt`（站管开始终同步）/ 组织 staff / 组织 `force_sync`（永不冻结）/ plan∈{team,pro}；**任一豁免则不受自动休眠约束**（站管强制冻结/禁用除外） |
| 休眠效果 | 定时爬虫、AI 总结、邮件、画像预热跳过；登录唤醒全量爬 |
| 手动解除（一次） | 站管 `POST /user/profile/clear-dormant` 批量刷新 `last_login_at` 并清除 `admin_force_dormant`；超时后仍会再休眠（≠ 永久豁免） |
| 手动冻结 | 站管 `POST /user/profile/force-dormant`：勾选 `userIds` 或一键 `inactiveDays`；回拨 `last_login_at` + 标记 `admin_force_dormant`；**不遵循组织约定/始终同步等豁免**（不可冻自己）；登录或解除后清除强制标记 |
| 禁用账号 | 站管 `POST /user/profile/set-disabled`：`{ userId, disabled }`；禁用后登录/刷新返回「账号已被禁用」；不可禁用自己与其他站管；禁用时一并暂停同步 |

相关 API：`POST /user/site/config`（`inactiveDays`+`setInactiveDays`）、`POST /user/org/update`（`forceSync` 仅站管）、`POST /user/profile/set-sync-exempt`、`POST /user/profile/clear-dormant`、`POST /user/profile/force-dormant`、`POST /user/profile/set-disabled`

**RegisterReq**

```json
{
  "username": "string",
  "password": "string",
  "name": "string",
  "email": "string",
  "groupId": 0,
  "code": "string",
  "inviteCode": "string"
}
```

`username`：3–64 位，仅 `A-Za-z0-9_-`（字母、数字、下划线、短横线），**不允许中文及其它特殊符号**。  
`name` = **全局昵称**（非真实姓名；加入校队时另填「组织内名称」）。  
`code` = 邮箱验证码（先调 `send-code`，`purpose=register`）。邮箱全局唯一。  
`inviteCode`（可选）= 组织邀请识别码；注册成功后自动加入该组织（`auto` 则设为默认组织；`review` 则提交待审批）。

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
| GET | `/user/profile/list` | 否 | query: `pageNum`, `pageSize`, `scope=org\|site`（org=当前组织；site=全站仅站管；空=兼容旧逻辑），**`keyword` 模糊**（忽略大小写：用户名/昵称；org 另含组织内名称），**`dormantOnly=true`（或 `dormant=true`）仅「已暂停同步」用户**（含站管强制冻结/禁用，或超时且无豁免）；**`inactiveDays=N`（1–365）「最近 N 天未登录」**（优先于 dormantOnly；**不排除豁免**，便于站管预览后强制冻结）；**org 视图 `name`=组织内名称**；**site 视图 `name`=公共域外显名称**（≡站内昵称）；项含 `isSiteAdmin`、`orgs[{orgId,name,role}]`、`emailEnabled`/`emailWeeklyEnabled`/`emailAllowedByOrg`/`emailWeeklyAllowedByOrg`、`problemFetchEnabled`/`problemAiEnabled`、`createdAt`、`spiderIntervalMin`/`aiSummaryIntervalMin`、`spiderIntervalOverridden`/`aiSummaryIntervalOverridden`、`dailyRefreshQuota`（每日手动刷新有效配额，0=禁止，默认 2）/`dailyRefreshQuotaOverridden`、`syncExempt`/`lastLoginAt`/`dormant`/`adminForceDormant`/`disabled` |
| POST | `/user/profile/sync-policies` | 否（内部） | body: `{ userIds }` → 每人一条策略：多组织 **MIN 间隔**、开关任一开启 |
| POST | `/user/profile/update` | 是 | 更新头像/邮箱；`name` 已忽略（昵称改「我的组织」）；邮箱变更须 `emailCode`（`purpose=change_email`） |
| POST | `/user/profile/move-group` | 是 | 移动用户组 |
| POST | `/user/profile/set-email-enabled` | 是 | body: `{ userId, enabled, kind?: daily\|weekly }`；本人 / 站点管理员 / **当前组织 staff 管理本组织成员**；无组织授权时不可开启日报/周报 |
| POST | `/user/profile/set-problem-pipeline` | 是(站点管理员) | body: `{ userId, enabled, kind: fetch\|ai }`；个人覆盖：近窗提交是否触发题面爬取 / 题面 AI（默认按是否非公共域组织） |
| POST | `/user/profile/set-sync-intervals` | 是(站点管理员) | body: `{ userId, setSpider?, spiderIntervalMin?, setAi?, aiSummaryIntervalMin? }`；个人覆盖爬取/AI 总结间隔（分钟，**优先级最高**）；间隔 `0` 表示清除覆盖回落组织 MIN；范围 5–10080 |
| POST | `/user/profile/set-refresh-quota` | 是(站点管理员) | body: `{ userId, quota, clear? }`；个人每日手动刷新做题记录配额覆盖：`clear=true` 清除覆盖回落全局默认（2 次/日）；否则 `quota` `0`=禁止手动刷新、`1–100`=每日次数 |
| POST | `/user/profile/set-sync-exempt` | 是(站点管理员) | body: `{ userId, exempt }`；永不休眠（跳过不活跃判定） |
| POST | `/user/profile/clear-dormant` | 是(站点管理员) | body: `{ userIds: number[] }`（单次最多 200）；**一次性**解除不活跃：将 `last_login_at` 刷新为当前时间并清除 `admin_force_dormant`；超时后仍会再休眠（≠ `sync_exempt`）；返回 `{ code, message, updated }` |
| POST | `/user/profile/force-dormant` | 是(站点管理员) | body: `{ userIds?: number[] }` **或** `{ inactiveDays: number }`（1–365，一键模式）；回拨 `last_login_at` + 标记 `admin_force_dormant`；**不遵循组织约定等豁免**（不可冻自己）；登录或 clear-dormant 后清除强制标记；返回 `{ code, message, updated, skipped }` |
| POST | `/user/profile/set-disabled` | 是(站点管理员) | body: `{ userId: number, disabled: boolean }`；禁用后无法登录（提示「账号已被禁用」）；不可禁用自己与站管；禁用时一并暂停同步；返回 `{ code, message }` |
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
| GET | `/user/social/following` | 否 | query: `userId`, `page`, `pageSize` → 关注列表（项见 SocialUser） |
| GET | `/user/social/followers` | 否 | query: `userId`, `page`, `pageSize` → 粉丝列表 |
| GET | `/user/social/counts` | 否 | query: `userId` → `{ followingCount, followerCount }` |
| GET | `/user/social/relation` | 否（可选 JWT） | query: `userId` → `{ isFollowing, isFollower }` |
| GET | `/user/social/search` | 否 | query: `q`, `page`, `pageSize` → 模糊搜用户（用户名/昵称/当前域与共属域称呼） |
| GET | `/user/social/identity` | 否（可选 JWT） | query: `userId` → 单用户域感知展示（同 SocialUser） |

**SocialUser 展示规则**（关注/粉丝/搜索/identity，依赖观众 JWT 当前组织）：

| 字段 | 说明 |
|------|------|
| `name` | **主展示名**：目标在**当前域** → 该域 `org_display_name`（空则 username）；**不在当前域** → 公共域昵称（`users.name`，空则 username） |
| `inCurrentOrg` | 目标是否属于观众当前组织 |
| `sharedOrgs` | 双方共属、且**非当前观看域**的组织列表 `{ orgId, orgName, displayName }`（**含公共域**；切换到校队后仍会标公共域与其他共属校队）；观众不在的组织**绝不**出现（隐私边界） |
| `username` / `avatar` | 账号与头像 |
| `isSiteAdmin` / `siteRoles` | 全站角色 badge（仅公共域视图展示）：`isSiteAdmin` 为内置「站点管理员」，`siteRoles` 为持有的自建站点角色名数组（内置角色不在其中） |
| GET | `/user/privacy/get` | 是 | 本人隐私：`privacyConfigured`, `allowPublicProfile`(默认 true), `allowPublicFeed`(默认 true) |
| POST | `/user/privacy/update` | 是 | body: `{ allowPublicProfile?, allowPublicFeed? }`；保存后 `privacyConfigured=true` |
| GET | `/user/privacy/status` | 否（可选 JWT） | `{ privacyConfigured }`；未登录视为 true（不弹窗） |

**隐私规则**：仅在**公共域**生效。私人域组织内上述配置全部失效。未登录访客视作公共域上下文。未配置过隐私时默认「允许看资料 + 加入动态」，登录后强制弹窗完成首次配置。

**动态 / 题库过滤**（core）：`submit-log/get-by-id` 支持 `followingOnly`；`problem/list` 与 `problem/submissions` 支持 `followingOnly`。

### Notification（站内信）

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/user/notification/list` | 是 | query: `page`, `pageSize` → `{ list, total, page, pageSize, unreadCount }` |
| GET | `/user/notification/unread-count` | 是 | `{ unreadCount }` |
| POST | `/user/notification/read` | 是 | body: `{ ids: number[] }` 标记已读 |
| POST | `/user/notification/read-all` | 是 | 全部标记已读 |
| POST | `/user/notification/clear-all` | 是 | **硬删除**当前用户全部站内信（不可恢复）→ `{ deleted }` |

**NotificationItem**
```json
{
  "id": 1,
  "type": "mention|problem_edit_approved|problem_edit_rejected|org_join_approved|org_join_rejected|blog_article_like|blog_comment|blog_comment_reply|solution_like|comment_like|blog_moderation|blog_report|community_report|user_registered|user_frozen|user_unfrozen|review_pending|image_upload_approved|image_upload_rejected",
  "title": "有人提到了你",
  "body": "alice 在评论中 @ 了你",
  "actorId": 2,
  "refType": "comment|solution|problem_edit|org_join|blog_article|blog_image_upload|user",
  "refId": 10,
  "problemId": 3,
  "payload": "{}",
  "isRead": false,
  "createdAt": 1710000000
}
```

触发来源：
- 新用户注册 → 通知全部站点管理员（`user_registered`）
- 站管冻结/解冻不活跃 → 通知被操作用户（`user_frozen` / `user_unfrozen`）
- 题面/标签修改首次提交待审 → 通知站管（`review_pending`）+ **邮件**（见 `adminNotifyEmails`）
- 题面/标签修改审核通过 → 站内信 + **邮件感谢信**（申请人 `users.email`，SMTP 未配或无邮箱则仅站内信）
- 题面/标签修改审核驳回 → **仅站内信**，不发邮件
- 图片上传权限申请 → 通知站管（`review_pending`，`refType=blog_image_upload`）
- 图片上传申请通过/驳回 → 通知申请人（`image_upload_approved` / `image_upload_rejected`）
- 组织加入申请通过或驳回 → 通知申请人
- 评论/题解中 `@username` → 通知被 @ 用户
- 博客/题解点赞、评论、回复 → 通知内容作者
- 博客/社区举报 → 通知站管（`blog_report` / `community_report`）+ **邮件**
- 博客审核结果 → 通知作者（`blog_moderation`）

**双入口共享**：网站顶栏与站点后台顶栏使用同一 `notifications` 列表 API，内容完全一致。

**邮件**：
- 审核待办 + 举报：收件人取 `site_configs.admin_notify_emails`；空则 fallback 全部站管账号邮箱。站内信始终发给全部站管（举报时跳过举报者本人）。
- 内容贡献审核通过：发至申请人绑定邮箱（感谢信）；驳回不发邮件。

### Upload / Site

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/user/upload` | 是 | multipart `file` + 可选 `purpose`=`avatar\|site\|bulletin\|misc\|blog\|blog_cover`。本地用途（`site\|bulletin\|misc`）≤3MB（jpg/png/gif/webp/ico/**svg**；svg 拒脚本），本地 url 带真实扩展名。**`blog`/`blog_cover`**：走又拍云（需站点配置又拍云 + 站管在 `/admin/blog` 授权该用户），清晰度优先压缩，≤约 12MB 原图，返回公网 `{ url, hash }`（`hash`=落库字节 SHA-256，内容寻址 key `/blog/{uid}/{hash}{ext}`）；未授权或未配置则 403。**`avatar`**：也走又拍云（仅需站点配置又拍云，无需博客授权），≤3MB（jpg/png/gif/webp/ico，**拒 svg**），清晰度优先压缩，返回公网 `{ url, hash }`（key `/avatar/{uid}/{hash}{ext}`），未配置则 403；`users.avatar` 落库为 path-only key，读取时按当前图床域名扩展（换域/切 https 即时生效） |
| GET | `/user/static/*` | 否 | 已上传文件；支持带后缀精确匹配；无后缀/错后缀时会按 stem 探测磁盘上的 `.png/.jpg/...` |
| GET | `/user/site/config` | 否 | 站点标题/logo/favicon/footerIcp（默认 GoAlgo）+ **`payfmConfigured`**（支付是否已完整配置：接口根地址 + 商户号 + 接入密钥齐备；公开布尔，无敏感信息；前端按它决定是否显示「赞助支持」入口） |
| GET | `/user/site/admin-config` | 是(站点管理员) | 完整站点配置（SMTP / AI / **又拍云** / **OJ 爬虫账号** 密钥脱敏 + `inactiveDays` + `adminNotifyEmails` + `opsNotifyEmails` + `dataDiskPath`） |
| POST | `/user/site/config` | 是(站点管理员) | 更新品牌 + 页脚备案 + SMTP + AI + **又拍云** + **OJ 爬虫**（`ojLuoguUsername`/`ojLuoguPassword`/`clearOjLuoguPassword`/`ojQojUsername`/`ojQojPassword`/`clearOjQojPassword`）+ **支付FM**（`payfmApiBase`/`payfmMerchantNo`/`payfmSecret`/`clearPayfmSecret`/`payfmPayType`；密钥加密存储，密钥空串表示不修改）+ 可选 `inactiveDays`/`setInactiveDays` + `adminNotifyEmails` + `opsNotifyEmails` + `dataDiskPath`（运维磁盘统计目录，数据盘挂载点；空=默认 /data，未挂载回退 /）；密钥空串表示不修改。**若填写了洛谷/QOJ 用户名，保存前会实测登录**，失败则整页不落库 |
| POST | `/user/site/test-email` | 是(站点管理员) | 发送测试邮件；body 可临时覆盖 SMTP |
| POST | `/user/site/visit-ping` | 否（可选 JWT） | 页面访问上报；body `{ path?, visitorId? }`；同 path 约 30s 节流；登录用户计 DAU/MAU；真实 IP（CF-Connecting-IP / X-Real-IP / XFF） |
| GET | `/user/site/access-stats` | 是(站点管理员) | 访问与用量：`?days=30&ipLimit=200&pathLimit=20` |
| POST | `/user/site/backup/export` | 是(站点管理员) | 创建全量/按 scope 导出任务；body `{ scopes?: string[] }`（默认 `["all"]`）；返回 `{ jobId }`；后台慢慢导出 |
| POST | `/user/site/backup/import` | 是(站点管理员) | multipart：`file`=zip + `confirm=RESTORE`；按包内数据 **清空再写入** 完美复现；返回 `{ jobId }` |
| GET | `/user/site/backup/jobs` | 是(站点管理员) | 最近备份任务列表 |
| GET | `/user/site/backup/jobs/{id}` | 是(站点管理员) | 任务状态：`pending\|running\|done\|failed`、progress、message、downloadable |
| GET | `/user/site/backup/jobs/{id}/download` | 是(站点管理员) | 下载导出完成的 zip（`goalgo-backup-v1`） |
| DELETE | `/user/site/backup/jobs/{id}` | 是(站点管理员) | 删除已结束任务及磁盘文件 |

任务 `done`/`failed` 后保留 **10 分钟**（zip + 任务记录），超时自动清理；请在窗口内下载。

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
  "clearAiAnalyzeSecret": false,
  "inactiveDays": 14,
  "adminNotifyEmails": "ops@example.com\nadmin@example.com",
  "upyunBucket": "yangcongxueyuan",
  "upyunOperator": "enchensan",
  "upyunPassword": "",
  "upyunPasswordMasked": "••••••••",
  "upyunPasswordSet": true,
  "clearUpyunPassword": false,
  "upyunDomain": "zhiyuansofts.cn",
  "upyunScheme": "http",
  "ojLuoguUsername": "",
  "ojLuoguPassword": "",
  "ojLuoguPasswordMasked": "",
  "ojLuoguPasswordSet": false,
  "clearOjLuoguPassword": false,
  "ojQojUsername": "",
  "ojQojPassword": "",
  "ojQojPasswordMasked": "",
  "ojQojPasswordSet": false,
  "clearOjQojPassword": false
}
```

说明：`smtp` / `agent` / `ai_analyze` / **`upyun`** / **OJ 爬虫账号（洛谷、QOJ）** 原硬编码或 yaml 已迁入站点设置；服务 yaml 仅作启动兜底。保存后写入 DB 并同步 Redis。填写了洛谷/QOJ 用户名时，保存会先实测登录再落库。`footerIcp` 为空时前端页脚使用默认备案号。`adminNotifyEmails` 为审核/举报邮件接收人（逗号或换行分隔）；留空则发给全部站点管理员账号邮箱；**不影响**站内信收件人。`opsNotifyEmails` 为**运维告警**邮件接收人（逗号或换行分隔）；留空则运维告警不发邮件。又拍云 / OJ 密码**不得**写入仓库源码。

### Paste（粘贴板 / Pastebin）

Proto 生成（`cwxu-algo/api/user/v1/paste/paste.proto`）。创建需登录；公开查看不需登录。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/user/paste/create` | 是 | body: `{ title?, content, language?, expire? }`；`expire`=`never\|1h\|1d\|1w\|1m\|1y`；内容 ≤512KB；返回 `{ data: Paste }` |
| GET | `/user/paste/get` | 否 | query: `slug`；过期返回 404 |
| GET | `/user/paste/mine` | 是 | 我创建的最近 50 条（不含正文） |
| POST | `/user/paste/delete` | 是 | body: `{ slug }`；本人或站点管理员 |
| GET | `/user/paste/admin-list` | 站管/内容治理 | query: `page, pageSize`；**当前全部未过期**粘贴内容（含正文，事后审查）；过期仍按既有逻辑正常删除 |

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

### Blog（个人博客）

Proto 生成（`cwxu-algo/api/user/v1/blog/blog.proto`）。文章为**单一数据源**（博客壳与主站推荐共用同一条记录）。路径前缀 `/user/blog/*`。

**可见性**

| 值 | 说明 |
|----|------|
| `public` | 公开，所有人可读正文 |
| `private` | 仅作者可见（非作者 404） |
| `password` | 可看标题/头图；正文需密码或 `unlockToken` |

**组织同步规则**：勾选任一**私有域**组织时，服务端自动同时同步到**公共域**（与主站既有规则一致）。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/user/blog/by-username` | 否* | query: `username`；可选 `page`/`pageSize`/`categoryId`/`keyword`/`tag`（标签模糊）；返回作者信息 + 文章列表 + `activated` + 壳配置（`themeId`/`colorScheme`/`subtitle`/`socialLinks`/`aboutMd`/`homeIntroMd`/`friendsMd`）；未开通且非本人时 `list` 为空 |
| GET | `/user/blog/article/get` | 否* | query: `id` 或 `username`+`slug`；可选 `password`/`unlockToken` |
| POST | `/user/blog/article/unlock` | 否 | body: `{ id, password }`；成功返回正文 + `unlockToken` |
| POST | `/user/blog/article/create` | 是 | body: `BlogArticleWriteReq` |
| POST | `/user/blog/article/update` | 是 | body: 含 `id` 的 `BlogArticleWriteReq` |
| POST | `/user/blog/article/delete` | 是 | body: `{ id }` |
| GET | `/user/blog/article/mine` | 是 | 作者全部文章（含 private） |
| GET | `/user/blog/recommend` | 否 | 主站/发现**精选**：仅 `recommend=true` 且 `sync_to_main_profile=true` 的公开已审文；query: `page`/`pageSize`/`orgId?`（私有域=仅该组织成员；公共域/缺省=全站）/`excludeSolutions=1`（排除题解镜像） |
| GET | `/user/blog/plaza` | 否 | **博客广场**公开文流（仅 `sync_to_main_profile=true`）；query: `page`/`pageSize`/`keyword`/`sort=latest\|hot\|recommend`；`recommend` 仅精选；`orgId?`（私有域=仅该组织成员作者；公共域/缺省=全站）/`excludeSolutions=1`（排除题解镜像，发现页去重）；列表**不含 content** |
| GET | `/user/blog/authors` | 否 | 广场侧栏：最近有公开文的作者；query: `page`/`pageSize`/`keyword`；按最近发布时间排序 |
| GET | `/user/blog/analytics` | 是 | 作者统计：阅读/点赞/评论汇总 + top 文章 |
| GET | `/user/blog/categories` | 否 | query: `username`；公开分类列表（项含 `isDefault`）；**仅返回有公开文章的分类**（`articleCount > 0`，空分类对访客隐藏） |
| GET | `/user/blog/tags` | 否 | query: `username`；作者公开文标签聚合 → `[{ name, count }]` |
| GET | `/user/blog/category/mine` | 是 | 我的分类；**自动确保默认分类「默认」存在**；项含 `isDefault` |
| POST | `/user/blog/category/create` | 是 | body: `{ name, sortOrder? }` |
| POST | `/user/blog/category/update` | 是 | body: `{ id, name?, sortOrder? }`（默认可改名，仍 `isDefault`） |
| POST | `/user/blog/category/delete` | 是 | body: `{ id }`；**默认分类不可删**；其它分类删除后文章改挂默认分类 |

**默认分类与题解同步**

- 每用户至多一个 `isDefault=true` 的分类，名称初始为「默认」，可改名不可删除。
- 主站发布/更新题解时，core 经 user 库写入 `blog_articles`：分类=默认、`visibility=public`、`sourceSolutionId=题解id`、`sourceProblemId`、`slug=solution-{题解id}`、同步资料与组织发现；**不**自动精选。
- **摘要**：一律按正文自动生成（去代码块 / MD 语法，约 280 字）；**不允许**作者手写。创建/更新时忽略客户端传入的 `summary`，前端编辑页也不提供摘要输入。
- **自动曝光**：`visibility=public` **且** `syncToMainProfile=true`（默认）进入广场与作者所属组织发现；`syncToMainProfile=false` 仅个人站可见；`private`/`password` 不曝光。精选 `recommend` 仍由站管/审核员设置。
- **题解镜像去重**：发现推荐只展示题解活动卡（打开主站题面题解页）；博客广场展示镜像文（打开博客页）。
- **共享互动**：题解与镜像博客共享点赞/评论/UV 浏览量；迁移时历史浏览量清零。
- 题解详情 get 会对未同步的旧题解做懒同步。
- 前端题解阅读页用 `blogUsername` + `blogSlug` 跳转 `/blog/:username/:slug`。
| GET | `/user/blog/comment/list` | 否*（登录可带 liked） | query: `articleId`、`page`/`pageSize` → **顶层评论分页** + 嵌套 `replies`；项含 `likeCount`/`liked`/`parentId`/`replyTo*`；最大深度 3 |
| POST | `/user/blog/comment/create` | 是 | body: `{ articleId, content, parentId? }`；`parentId` 回复；最大深度 3；题解镜像文前端改走题解评论 API |
| POST | `/user/blog/comment/delete` | 是 | body: `{ id }`；评论作者 / 文章作者 / 站管；**级联删除子树** + 评论点赞 |
| POST | `/user/blog/comment/like` | 是 | body: `{ commentId }`；toggle；返回 `{ liked, likeCount, commentId }`；题解镜像文前端改走题解评论点赞 |
| POST | `/user/blog/like` | 是 | body: `{ articleId }`；toggle；返回 `{ liked, likeCount }`；题解镜像前端改走题解点赞 |
| POST | `/user/blog/report` | 是 | body: `{ articleId, reason }`；写 `blog_reports` + 站管站内信 + 邮件 |
| GET | `/user/blog/report/list` | 是（`content.report.handle`） | query: `status?`=`pending`（默认）`\|resolved\|dismissed\|all`、`page`/`pageSize` → `BlogReportAdminItem` 列表（含举报人、文章预览；文章已删 `target.exists=false`） |
| POST | `/user/blog/report/handle` | 是（`content.report.handle`） | body: `{ id, action: "resolve"\|"dismiss" }` → 标记已处理 / 驳回 |
| GET | `/user/blog/theme/status` | 否 | query: `username?`；返回 `enabled`（遗留）、`themeId`（`mizuki` 默认 / `chirpy` / `simple`）、`colorScheme`（`light`/`dark`/`system`，默认 `system`）、`subtitle`、`socialLinks`、`aboutMd`、`homeIntroMd`、`friendsMd` |
| POST | `/user/blog/theme/config` | 是（作者） | body: `{ themeId, colorScheme?, subtitle?, socialLinks?, aboutMd?, homeIntroMd?, friendsMd? }`；指针字段省略则保留原值；空字符串清空；`colorScheme` 缺省/`system`=跟随系统；**须已开通** |
| POST | `/user/blog/theme/enable` | 站管 | body: `{ mode: user\|batch\|all, userId?, userIds?, enabled }`（遗留能力开关） |
| GET | `/user/blog/agreement` | 否* | 协议正文 + 当前用户开通状态（`BlogActivationStatus` + `title`/`content`） |
| GET | `/user/blog/obsidian-plugin/latest` | 否 | GoAlgo Blog **Obsidian 插件**当前版本元信息：`{ id, name, version, minAppVersion, notes, releasedAt, downloadBase }`。`downloadBase` 为云存储**具体版本目录**（无尾 `/`，如 `https://zhiyuansofts.cn/obsidian/goalgo-blog/0.1.2`），客户端据此拉 `main.js` / `manifest.json` / `styles.css`；**不使用 latest/** |
| POST | `/user/blog/obsidian-plugin/publish` | 发布令牌或站管 | body: `{ version, minAppVersion?, notes?, releasedAt?, downloadBase? }`；Header `X-Plugin-Publish-Token`（或站管 JWT）。发布脚本上传云存储后登记；库表仅保留当前一行 |
| GET | `/user/blog/activation/status` | 是 | 当前用户开通状态 |
| POST | `/user/blog/activate` | 是 | body: `{ accept: true, agreementVersion?, emailNotifyEnabled?, emailNotifyStrategy? }`；**不同意不可开通** |
| POST | `/user/blog/notify-pref` | 是 | body: `{ emailNotifyEnabled?, emailNotifyStrategy? }`；互动邮件偏好，**默认关**；`off\|immediate\|digest_daily\|random` |
| GET | `/user/blog/admin/overview` | 站管 | 开通人数、文章/阅读/点赞/评论汇总、待审/驳回数 |
| GET | `/user/blog/admin/authors` | 站管 | 已开通作者列表（含 `imageUploadEnabled`）；query: `page`/`pageSize`/`keyword`（模糊） |
| GET | `/user/blog/admin/articles` | 站管 | 文章审查列表（**含 private/password**）；query: `page`/`pageSize`/`keyword`/`status`/`visibility` |
| POST | `/user/blog/admin/moderate` | 站管/博客审核权限 | body: `{ id, action: approve\|reject\|pending\|feature\|unfeature, note? }`；`feature`/`unfeature` 设/取消广场精选（仅公开且已通过） |
| POST | `/user/blog/admin/image-upload` | 站管/博客管理 | body: `{ userId, enabled }`；**默认全员关闭**图片上传，须在此按作者授权；开通时顺带通过该用户待审申请 |
| GET | `/user/blog/admin/image-upload/requests` | 站管/博客管理 | 图片上传申请列表；query: `page`/`pageSize`/`status`=`pending`（默认）`\|approved\|rejected\|all` |
| POST | `/user/blog/admin/image-upload/review` | 站管/博客管理 | body: `{ id, action: approve\|reject, note? }`；通过则开通该作者图片上传并通知；驳回通知申请人 |
| GET | `/user/blog/admin/images` | 仅站点管理员 | 全站图片资产；query: `page`/`pageSize`/`mode=all\|cleanup`。`all` 返回全部图片及 `referenced`；`cleanup` 仅返回全站文章、普通页面和首页介绍/关于/友链固定页面均未引用且最近上传已满 12 小时的图片，并附完整 `candidateIds` 与 `snapshot` |
| POST | `/user/blog/admin/images/delete` | 仅站点管理员 | body: `{ id }`；删除前重新检查全站引用和 12 小时保护，状态已变化返回 `409` |
| POST | `/user/blog/admin/images/delete-batch` | 仅站点管理员 | body: `{ ids, snapshot }`；仅在候选集合快照完全一致时批量删除，状态已变化返回 `409` |
| GET | `/user/blog/image-upload/status` | 是 | 当前用户：`{ configured, authorized, enabled, pendingRequest, pendingRequestId? }`（站点又拍云已配且已授权时 `enabled=true`） |
| POST | `/user/blog/image-upload/apply` | 是 | body: `{ reason }`（必填，5–500 字）；提交图片上传权限申请，通知站管；已开通/已有待审幂等返回 |
| POST | `/user/blog/images/check` | 是 | body `{ urls?: string[], hashes?: string[] }`（合计 ≤200）→ `{ existing, missing, existingHashes, missingHashes }`：批量确认 URL/object key 与 content hash 是否仍在本用户 `blog_image_assets`（插件/编辑器缓存复用；GC 以 hash 为主） |
**又拍云图床**：站点设置配置 `upyunBucket`（服务名）、`upyunOperator`、`upyunPassword`（脱敏存储）、`upyunDomain`（用户侧访问域，如 `zhiyuansofts.cn`）、`upyunScheme`（`http`/`https`）。上传走服务端代传；不再自动 GC，只有站点管理员可在博客管理的「图片管理」页签显式清理。正文支持 Obsidian 定宽 `![说明|550](url)`。

**图床 URL 存储（path-only）**：本站又拍云对象在库内以 `/blog/{userId}/…` 路径存储（正文、封面、`blog_image_assets`、题解镜像）。`POST /user/upload`（`purpose=blog|blog_cover`）仍返回**当前**完整公网 `url` + `hash` 供编辑器/插件插入与缓存；文章/题解/页面 **读接口** 会按站点当前 `upyunDomain`+`upyunScheme` 展开为完整 URL。因此修改访问域名后，旧文无需改写即可用新域名出图；外链图不受影响。

**图床清理（content hash）**：上传登记 `blog_image_assets.content_hash`；文章/页面写入时解析正文图并落 `image_hashes`（JSON 数组）。站管手动清理时优先按 hash 判定引用，并扫描全站正文 key、普通自定义页面及首页介绍/关于/友链固定页面；最近上传不满 12 小时的对象始终排除，删除前再次校验。插件/编辑器应用 `hash` 做缓存校验，勿仅依赖易变 URL。

**开通协议**：初次使用/发文/改外观前须签署；存量已有文章或主题配置用户启动时自动回填为已开通。

**审查**：`moderationStatus=approved|pending|rejected`；公开列表/广场仅 `approved`（空值兼容为已通过）。站管后台可见全部可见性。

**互动通知**（写主站 `notifications`）：博客文章点赞 `blog_article_like`、博客评论 `blog_comment` / `blog_comment_reply`、博客评论点赞 `blog_comment_like`；题解/评论点赞 `solution_like` / `comment_like`；举报 `blog_report` / `community_report`（站管 + 邮件）。payload 可含 `blogUsername`+`blogSlug` 跳转。邮件通知偏好默认关。

`GET /user/blog/by-username` 额外返回：`themeId`、`colorScheme`、`subtitle`、`socialLinks`、`aboutMd`、`homeIntroMd`、`friendsMd`（与 theme/status 一致）、`activated`（`agreement_accepted_at` 非空为已开通）。未开通用户的个人博客壳应提示「此用户未开通博客」；个人资料页不展示「访问博客」。

**主题说明**

| themeId | 名称 | 说明 |
|---------|------|------|
| `mizuki` | Mizuki | 默认；适配 [LyraVoid/Mizuki](https://github.com/LyraVoid/Mizuki)（MD3 气质，动画轻度–中度，无樱花/轮播等重特效） |
| `chirpy` | Chirpy | 可选；复刻 jekyll-theme-chirpy 布局 |
| `simple` | 简约 | 原 shadcn 顶栏壳 |

**默认明暗 `colorScheme`**

| 值 | 说明 |
|----|------|
| `system`（默认） | 跟随读者设备浅色/深色 |
| `light` | 博客默认浅色 |
| `dark` | 博客默认深色 |

读者仍可在博客顶栏/侧栏自行切换；选择会记在本机该博客下，不改博主设置、也不改主站外观。

**socialLinks 项**

```json
{ "type": "github|twitter|x|email|rss|bilibili|zhihu|custom", "url": "https://…", "label": "可选" }
```

\* 可选 JWT：有 token 时识别作者以显示 private / 管理态。

### SEO（分享预览 / 爬虫）

HTTP 手写路由。按前端 path **动态**生成 meta，**不**为每篇文章/题目生成静态文件。`siteName` 固定为站点品牌（GoAlgo）。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/user/seo/html` | 否 | Header `X-Original-URI`（优先）或 query `path`；返回完整 HTML（title + description + OG/Twitter + 加载壳 boot SPA）。**不**增加博客 `viewCount` |
| GET | `/user/seo/meta` | 否 | 同上取 path；返回 JSON `{ title, description, image, url, type, siteName, author? }` |
| GET | `/user/seo/sitemap.xml` | 否 | 动态 sitemap：首页/广场/公开博文等 |

**图片规则（保留 GoAlgo 品牌）**：

| 页面 | 分享图 |
|------|--------|
| 个人博客 `/blog/:user` | 博客身份图（作者头像） |
| 博文 `/blog/:user/:slug` | **博主头像**（其次封面） |
| 题解 | 作者头像 |
| 题单 | 创建者头像 → 站点 logo |
| 粘贴板 / 题面 / 其它 | 站点 logo/favicon |

**path 解析**：

- 博客：`/blog/:user/:slug`、`/blog/:user`、`/blog-plaza`
- 题面：`/question-bank/detail/:id`
- 题解：`/question-bank/detail/:id/solution/:solutionId`
- 题单：`/problemset`、`/problemset/:id`（公开/密码可露标题；私有不暴露）
- 资料：`/profile?id=`、`/profile/:username`
- 粘贴板：`/p/:slug`、`/tools/paste`

nginx：**首版策略**——上述公开页 **一律** 反代 SEO HTML（不靠 UA），见 `scripts/nginx-seo.conf.example` / `cwxu-algo/scripts/nginx-algo.zhiyuansofts.cn.conf`。用 `X-Original-URI`，不要把含 `?` 的 path 塞进 `?path=`。

**BlogArticleWriteReq**

```json
{
  "id": 0,
  "title": "string",
  "slug": "optional-slug",
  "summary": "string",
  "content": "markdown",
  "coverUrl": "https://…",
  "useFirstImageAsCover": true,
  "visibility": "public|private|password",
  "password": "仅 password 可见性",
  "clearPassword": false,
  "categoryId": null,
  "tags": ["可选标签"],
  "syncToMainProfile": true
}
```

- 头图仅支持 **http(s) 外链**（Web 授权用户可上传又拍云）。
- `useFirstImageAsCover`：可选，默认 `false`，**不入库**。为 `true` 时**每次保存**按正文第一张 http(s) 图重写 `coverUrl`（忽略请求里旧的 cover）。为 `false` 时使用手填/上传的 `coverUrl`（可空=无头图）。
- `recommend` 作者端不可写；仅站管/持博客审核权限者 `POST /user/blog/admin/moderate` `action=feature|unfeature` 设精选。
- `syncToMainProfile`：公开文默认 `true`（进广场 / 资料动态 / 组织发现）；显式 `false` = 仅个人博客壳可见。`private`/`password` 本就不曝光。
- `tags`：自由字符串数组；`by-username?tag=` 模糊筛；`GET /user/blog/tags?username=` 聚合。
- `summary` 字段可传但**服务端忽略**，始终按正文生成简述。

**站点 Markdown 槽位**（theme/status、by-username、theme/config）：

| 字段 | 用途 |
|------|------|
| `aboutMd` | 关于页；空=默认紧凑 UI |
| `homeIntroMd` | 首页列表上方介绍；空=不展示 |
| `friendsMd` | 友链页；空=不展示导航入口 |

前端路由：
- 主站博客广场：`/blog-plaza`（AppLayout，聚合公开文 + 活跃作者）
- 个人博客壳：`/blog/:username`；`/blog/:username/about`；`/blog/:username/friends`；`/blog/:username/manage` 仅作者
- 登录走主站 `/login?redirect=…`

**广场 sort**

| 值 | 说明 |
|----|------|
| `latest` | 默认；按发布时间倒序，全部公开文 |
| `hot` | 阅读(UV) → 点赞 → 时间 |
| `recommend` | 仅 `recommend=true` 精选文（站管/审核员标记） |

### Org（GoAlgo 多租户）

Proto 生成（`cwxu-algo/api/user/v1/org/org.proto`）。JWT 含 `isSiteAdmin` / `orgId` / `orgRole`（`member|captain|group_leader|coach|org_admin`）/ `pm`（细粒度权限位图，见「RBAC 角色与权限」一节）。

**组织内角色层级（严格）**：`org_admin`（组织管理员）> `coach`（教练）> `group_leader`（组长）> `captain`（队长）> `member`（成员）。

| 角色 | 数据范围 | 任命 |
|------|----------|------|
| 组织管理员 | 全组织 | 可任命全部组织角色 |
| 教练 | **始终全组织**（不受分组限制） | 可任命组长/队长/成员（不可任命组织管理员/教练） |
| 组长 | 绑定的分组（及组内分队） | 可任命本组内队长/成员 |
| 队长 | 绑定的分队 | 无任命权 |
| 成员 | — | — |

以下「组织/站点管理员」权限均已细化为对应权限点（org.member.\* / org.invite.\* / org.join.review / site.org.\* 等），管理员为默认持有者。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/user/auth/refresh` | 是 | 按 DB 重签 JWT（任命后 F5 同步权限） |
| POST | `/user/auth/logout` | 否 | 清除 HttpOnly 会话 Cookie |
| GET | `/user/org/discover` | 否（可选 JWT） | 组织广场：`page`/`pageSize`/`q` → `{id,name,brandLogo,memberCount,isSystem,isMember?,isCurrent?}` 无识别码 |
| GET | `/user/org/list` | 是 | 我的组织；项含 `myRole`、`orgDisplayName`、`isCurrent`、`seatLimit`、`memberCount`、`enableFetchProblem`、`enableAiAnalyze`；`?all=1` 站点管理员看全部 |
| GET | `/user/org/get` | 是 | query: `id`（默认当前组织）；含 `seatLimit`、`memberCount`、`enableFetchProblem`、`enableAiAnalyze`；若本人是成员则含 `myRole`、`orgDisplayName` |
| POST | `/user/org/create` | 站点管理员 | `{ name, slug?, adminUserId?, joinMode?, seatLimit? }`；默认 `seatLimit=50` |
| POST | `/user/org/update` | 组织/站点管理员 | 品牌/开关/joinMode（含 `enableFetchProblem`、`enableAiAnalyze`）；间隔与 **seatLimit（用户数上限）仅站点管理员** |
| POST | `/user/org/delete` | 站点管理员 | `{ id }` **硬删除**；**公共域不可删**；成员迁回公共域；挂在该组织分组上的用户迁到公共域默认分组 |
| POST | `/user/org/switch` | 是 | `{ orgId }` → 新 `jwtToken`；**同时写入默认组织**（下次打开自动进入，无需单独设默认） |
| POST | `/user/org/join` | 是 | `{ inviteCode, orgDisplayName }` 团队识别码 + **组织内名称（必填）**；**不改**默认组织 |
| POST | `/user/org/leave` | 是 | `{ orgId }`；**公共域不可退出**；若离开的是默认组织则回落公共域 |
| GET | `/user/org/members` | 成员 | query: `orgId`、`page`（默认 1）、`pageSize`（默认 20，最大 100）、`keyword` 模糊；排序 **组织管理员 > 教练 > 组长 > 队长 > 成员**；返回 `name`、`orgDisplayName`、`scopes?`（组长/队长管理范围）、`total`/`page`/`pageSize` |
| POST | `/user/org/members/set-role` | 持 `org.member.role` 且等级足够 | `{ orgId, userId, role: member\|captain\|group_leader\|coach\|org_admin, scopeType?, scopeId? }`；**任命队长必填** `scopeType=squad`+`scopeId`；**任命组长必填** `scopeType=group`+`scopeId`；**站管 / 组织管理员**可任命全部五档（含 `org_admin`）；其余只能任命**严格低于自己**的角色；教练/组织管理员清空 scope；若不在组织则加入并 **设为默认组织** |
| GET/POST | `/user/org/squads*` | staff | 分队 CRUD 与成员；写权限：组织管理员/教练全组织，组长限本组，队长仅本分队成员调整 |
| GET/POST | `/user/org/scopes*` | 组织管理员/站管 | 手动改管理范围；**禁止**给教练写入限制；组长/队长范围以任命为准 |
| POST | `/user/org/members/remove` | 组织/站点管理员 | `{ orgId, userId }`；不可移出公共域；若移出默认组织则回落公共域 |
| POST | `/user/org/members/add` | 站点/组织管理员 | `{ orgId, userId?\|username?, role?, orgDisplayName? }` 搜索加入；**设为默认组织**；组织内名称可填，默认用对方全局昵称 |
| POST | `/user/org/members/set-display-name` | 本人或组织/站点管理员 | `{ orgId, userId?, orgDisplayName }` 改组织内名称 |
| GET | `/user/org/member-ids` | 否/登录 | query: `orgId` → `{ userIds }`（core 隔离用） |
| GET | `/user/profile/ids-by-org` | 否 | query: `orgId` → 组织成员 ids（gRPC/HTTP） |
| GET | `/user/profile/org-coach-ids` | 否（内部） | query: `orgId` → 组织教练 userId 列表（agent 训练报告/周报排除教练） |
| GET | `/user/profile/non-public-org-user-ids` | 否（内部） | 非公共域组织用户 ids（题面 AI：仅这些用户的提交触发分析） |
| GET | `/user/org/invite` | 组织管理员 | query: `orgId` → 团队识别码 |
| GET | `/user/org/invite/preview` | 否 | query: `code` → `{ orgId, orgName, name, brandTitle, brandLogo, joinMode }` 邀请页欢迎信息（不返回识别码以外的敏感配置） |
| POST | `/user/org/invite/rotate` | 组织管理员 | `{ orgId }` 更换识别码 |
| GET | `/user/org/join-requests` | 组织管理员 | 待审批列表 |
| POST | `/user/org/join-requests/review` | 组织管理员 | `{ id, approve }` |
| POST | `/user/platform/set-site-admin` | 站点管理员 | `{ userId, isSiteAdmin }` |

> `/user/platform/set-resource-reviewer` 已随「资源审核员」内置身份下线移除；内容审核权限改由站点自定义角色（`content.*` 权限点）授予。

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
  "spiders": [{ "platform": "NowCoder", "username": "xxx", "rating": 1500, "hasRating": true, "lastSyncAt": 0, "lastFailAt": 0, "lastError": "" }],
  "lastSyncAt": 0
}
```
- `lastSyncAt`：最近一次 OJ 数据同步成功时间（unix 秒；`0` 表示尚无成功同步记录，部署本字段前的历史用户会在下次定时/手动同步后出现）
- `spiders[].lastSyncAt` / `lastFailAt` / `lastError`：单平台同步健康；失败后 `lastFailAt` 有值，成功后失败字段清空
- `spiders[].rating` / `hasRating`：各平台当前 Rating；绑定后爬虫会一并抓取。`hasRating=false` 表示未参赛/平台无 Rating/尚未同步。支持：AtCoder、牛客、Codeforces、洛谷、力扣、LOJ、UOJ；QOJ / POJ 暂无

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

### Subscription（C 端订阅付费）

套餐档位：`free` / `plus`（2 元/月）/ `pro`（7 元/月）。配额模板存 `subscription_plans`（站管可改），生效点：每日手动刷新次数、自动同步间隔、题面爬取/AI 分析资格、AI 分析月配额、AI 日报、会员 badge。开通方式：**支付FM在线支付**（create-order → 支付链接跳转 → 回调履约）或**站管人工赋予**（grant）。到期惰性回落（读取时判过期），不自动扣款。

**档位叠加语义**（支付履约与 grant 一致）：
- 无有效订阅/已过期 → 直接开通，`expire = now + days`
- 有效同档续费 → `expire = max(now, 当前到期) + days`（现有天数叠加）
- **Pro 有效买 Plus** → Plus 全量时长**排队**（`pendingTier=plus`），Pro 到期后自动生效（下单时前端提示）
- **Plus 有效买 Pro（升级）** → Pro 立即生效；Plus 剩余天数**暂停计时**，Pro 到期后自动续上 Plus
- 到期且有排队档：读取时**懒晋升**（自动切换），后端每日 sweep 兜底批量晋升

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/user/subscription/plans` | 否 | 套餐列表（含价格与配额，前端对比表）→ `{ code, message, plans: Plan[] }` |
| POST | `/user/subscription/create-order` | 是 | body: `{ plan: plus\|pro, months: 1–12（默认 1） }`；支付FM下单，返回 `{ orderNo, payUrl, amountCents, expireAt, months, days }`（金额 = 月价 × months；履约天数 = 套餐 days × months；前端跳转 payUrl 支付）；**未配置支付时返回「支付未配置」明确错误** |
| GET | `/user/subscription/order` | 是 | query: `orderNo`（本人或站管）→ `{ orderNo, status: pending\|paid\|closed, paidAt }` |
| GET | `/user/subscription/my` | 是 | 我的订阅 → `{ tier, expireAt, source: payfm\|manager, daysLeft, pendingTier?, pendingDaysLeft? }`（tier 空=未订阅；pendingTier=排队档，当前档到期后自动生效） |
| GET | `/user/subscription/my-ai-status` | 是 | 我的 AI 能力**落地状态**（会员页标记实际权限）：`{ code, message, aiAnalyzeQuota, aiAnalyzeSource: pro\|org\|pro_org\|none, aiDailyOrgAllowed, aiDailyEnabled }`；`aiAnalyzeQuota`=AI 分析落地月配额（Pro 取套餐值、否则组织套餐、都无=0）、`aiAnalyzeSource`=权限来源（组织已开通独立标记）、`aiDailyOrgAllowed`=组织是否授权 AI 日报、`aiDailyEnabled`=AI 日报是否生效（Pro + 套餐开启 + 个人开关） |
| POST | `/user/subscription/grant` | 是(站点管理员, `site.user.sync`) | body: `{ userId, tier: plus\|pro, days: 1–365 }`；人工赋予/更新（走与支付相同的档位叠加语义） |
| POST | `/user/subscription/revoke` | 是(站点管理员, `site.user.sync`) | body: `{ userId }`；取消订阅立即回落免费（含排队档；保留 AI 日报偏好） |
| GET | `/user/subscription/admin/list` | 是(站点管理员, `site.user.sync`) | query: `page`, `pageSize`, `keyword`（**模糊** username/name，服务端过滤与 total 一致）→ `{ list: SubUser[], total }`（SubUser 含 `pendingTier`/`pendingDays`） |
| POST | `/user/subscription/admin/plans` | 是(站点管理员, `site.user.sync`) | body: `{ plans: Plan[] }`；逐档 upsert 套餐模板（free 价格必须 0；manualRefreshDaily 0–100；syncIntervalMin 5–10080；aiAnalyzeMonth 0–10000） |

**邮件通知**：
- **到期提醒**：后台每日扫描，对「3 天内到期」的用户发提醒邮件（**到期前 3 天 + 1 天各一次**，`users.sub_reminded` 去重；续费/升级/晋升后重置重新计时）
- **支付成功感谢信**：支付FM回调履约成功后异步发送，含档位、月数、有效期至日期

**Plan**
```json
{
  "plan": "plus", "priceCents": 200, "manualRefreshDaily": 15,
  "syncIntervalMin": 60, "aiAnalyzeMonth": 0, "enableFetchProblem": false,
  "enableAiAnalyze": false, "enableAiDaily": false, "enableRegularDaily": true,
  "days": 30, "enabled": true
}
```

**SubUser**
```json
{ "userId": 1, "username": "string", "name": "string", "tier": "pro", "expireAt": 0, "source": "manager", "pendingTier": "", "pendingDays": 0 }
```

**支付FM支付**：回调 `GET/POST /v1/payment/notify`（网关免 JWT，MD5 验签 `md5(state+商户号+订单号+金额+密钥)`，state=1 才成功；金额相等校验；行锁幂等履约；回调地址常量 `https://algo.zhiyuansofts.cn/v1/payment/notify`，环境变量 `PAYMENT_NOTIFY_URL` 可覆盖）。支付FM配置存 `site_configs`（`payfm_api_base` / `payfm_merchant_no` / `payfm_secret` 加密存储 / `payfm_pay_type`），未配置时下单报「支付未配置」。

**AI 分析月配额语义**（`GetAiAnalyzeQuota` 服务间，core_data 入队前逐提交者检查 + Redis 月计数）：组织开通题面 AI 分析（任一非公共域 active 组织 `enable_ai_analyze=true`，即 OrgsManage 的「题面 AI 分析开关」）→ `unlimited=true` 无限配额（组织成员优先消耗组织，不扣个人配额）；否则 Pro 订阅 → 套餐 `aiAnalyzeMonth`（默认 400）；否则 0（不能触发 AI 分析）。`MyAiStatus` 同步标记 `aiAnalyzeSource`（pro/org/pro_org/none）与 `aiAnalyzeUnlimited`。

**间隔/配额合并语义**：自动同步间隔 = min(站管覆盖, 组织 MIN, 订阅档, 免费默认 180)；每日手动刷新 = 覆盖 0 永久禁止、正覆盖与订阅档取最大、无覆盖订阅档优先否则默认 2。

### Group

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/user/group/create` | 是 | 创建分组 |
| POST | `/user/group/delete` | 是 | body: `{ id }` |
| POST | `/user/group/update` | 是 | 更新分组 |
| GET | `/user/group/get` | 是 | query: `id`、`page`（默认 1）、`pageSize`（默认 20，最大 100）；成员分页；返回 `users` + `total`/`page`/`pageSize` |
| GET | `/user/group/list` | 是 | query: `page`, `size` |

**CreateReq**
```json
{ "name": "string", "describe": "string" }
```

**UpdateReq**
```json
{ "id": 1, "name": "string", "describe": "string" }
```

### RBAC 角色与权限（细粒度）

权限模型：**权限点目录以后端代码为唯一权威**（`cwxu-algo/app/common/rbac/perm.go`，37 个权限点、9 个分组，作用域 `site` 站点级 / `org` 组织级）。角色 = 权限点集合：

- **内置角色**（`isSystem`，不可改名/删除）：站点管理员 `site_admin`（旁路全部校验）、组织管理员 `org_admin`（全部 org.\*）、教练 `coach`（全组织数据+任命组长/队长）、组长 `group_leader`（绑定分组）、队长 `captain`（绑定分队）、成员 `member`。层级：org_admin > coach > group_leader > captain > member。内置角色任命走 `org/members/set-role`（含 scope），后端双写 `user_roles` 镜像。
- **内置角色的组织级权限覆盖**：教练 / 队长的权限**可由所在组织自行调整**（`permsEditable=true`），覆盖只对本组织生效，存 `org_role_perms`；团队管理员与成员是组织基本盘，权限固定（`permsEditable=false`）。`customized=true` 表示本组织已改过，可用 `resetPermissions` 恢复默认。
- **自定义角色**：站点级需 `site.role.manage`；组织级需该组织 `org.role.manage`（org_admin 默认持有）。自定义角色只赋权限、不改 `orgRole`，一个用户可叠加多个；**删除自定义角色后成员退回最基本身份**（组织内为「成员」，站点为「普通用户」）。
- **已下线**：内置角色「资源审核员」`resource_reviewer` 与权限点 `site.appoint.reviewer`（bit 16 永久退休不复用）。存量持有者已被剥离（`users.is_resource_reviewer` 全部置 false，列保留仅为回滚）；内容审核受众改按 `content.*` 权限点推导。`/user/profile/list` 的 `isResourceReviewer` 为 protobuf 遗留字段，恒为 `false`，前端已不再读取。

**角色即身份**：站点侧不再区分「身份」与「角色」——内置「站点管理员」与自建站点角色在管理端是同一套点选交互（`/admin/site-users` 用户详情），按权限从大到小排列。

`/user/profile/list` 的每项同样带 `siteRoles`（自建站点角色名数组），供管理端列表展示 badge。

**JWT**：新增 `pm` claim = 权限位图（base64url，站点权限 ∪ 当前组织权限）。旧 token（无 `pm`）按 `isSiteAdmin`/`orgRole` 模板推导（不含组织级覆盖）。`isResourceReviewer` claim 已移除。权限/角色变更后 `POST /user/auth/refresh` 或重登生效。原文档中「是(站点管理员)」的端点现按对应权限点校验（站点管理员天然旁路，行为向后兼容；持有对应权限的自定义角色成员亦可访问）。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/user/rbac/permissions` | 是 | 权限目录：`{groups:[{key,label,scope,perms:[{code,label,desc,scope}]}]}` |
| GET | `/user/rbac/roles` | 是(见说明) | `scope=site`（需 `site.role.manage`）或 `scope=org&orgId=`（需该组织 `org.role.manage` 或 `org.member.role`）；项含 `roleId,code,name,description,scope,orgId,isSystem,permsEditable,customized,permissions[],memberCount`（内置组织角色的 `permissions` 已按该组织覆盖后返回） |
| POST | `/user/rbac/roles/create` | 是 | `{scope,orgId?,name,description?,permissions[]}`；权限点须与 scope 匹配 |
| POST | `/user/rbac/roles/update` | 是 | 自定义角色：`{roleId,name?,description?,permissions?}`。内置教练/队长：`{roleId,orgId?,permissions[]}` 只改本组织权限覆盖，或 `{roleId,orgId?,resetPermissions:true}` 恢复默认；改名/改说明与其余内置角色 400/403 |
| POST | `/user/rbac/roles/delete` | 是 | `{roleId}`；内置角色 403；级联移除成员指派（成员退回最基本身份） |
| GET | `/user/rbac/roles/members` | 是 | `roleId`（+系统组织角色需 `orgId`）`page/pageSize/keyword` 分页模糊搜索 |
| POST | `/user/rbac/roles/assign` | 是 | `{roleId,userIds[]}` 仅自定义角色；组织角色要求目标已是该组织成员；返回 `added/skipped` |
| POST | `/user/rbac/roles/unassign` | 是 | `{roleId,userIds[]}` |
| GET | `/user/rbac/user-roles` | 是 | `userId`；返回该用户站点级（`org_id=0`）自定义角色 id 列表 `{roleIds[]}`（需 `site.role.manage` 或 `site.user.list`） |
| GET | `/user/rbac/my-permissions` | 是 | 当前用户实时有效权限（查库）：`{perms[],roles[],isSiteAdmin,orgId,orgRole}` |

**存量迁移**：user 服务启动时自动执行（`schema_patches` key `rbac_bootstrap_v1`，幂等一次性）：`is_site_admin`/`is_resource_reviewer` 布尔位与 `org_members.role` 全部镜像进 `user_roles`；旧列保留并持续双写，可随时回滚。

### Role（遗留，已废弃）

> ⚠️ 旧全局 roleId 体系（0 队员 / 1 管理员 / 2 教练 / 3 队长）。roleId 2/3 已被迁移清零，仅剩 0/1 兼容旧 token。前端已不再调用；接口保留一个版本后移除，请改用上方 RBAC 接口。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/user/role/list` | 否 | 角色列表（遗留） |
| POST | `/user/role/set-user-role` | 是(管理员) | 设置用户角色（遗留；请改用 `platform/set-site-admin`） |

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
| POST | `/core/spider/update-platform` | 是(站点管理员) | 仅某平台全量回填；body `{ platform: "LeetCode" }`；清该平台 pending/inflight 后 needAll 入队 |
| GET | `/core/spider/submit-inventory` | 是(站点管理员) | 真实入库库存：`submitLogsTotal` / `submitLogsRealTotal` / `oldestTime` / `newestTime`（`countedSubmitIdsTotal` 已废弃恒为 0） |
| GET | `/core/spider/monitor` | 是(站点管理员) | 各 OJ 爬虫模块监控（提交/题库/比赛/账号），返回 `platforms[]` + `collectedAt` |
| GET | `/core/spider/platform-users` | 是(站点管理员) | 某 OJ 的绑定用户列表，query `platform`、`offset?`、`limit?`（默认 20，最大 100）；返回 `total` + `list[{userId,name,username,ojUsername,rating,hasRating}]`（name 为站内展示名，无则回退站内用户名；ojUsername 为绑定的 OJ 账号） |
| POST | `/core/spider/refresh` | 是 | 用户手动**增量**刷新自己的 OJ 做题记录（**每日限 2 次**，按上海自然日，Redis 计数）；返回 `{ code, message, remaining }`；超出限额 code=1，message 提示「每个用户每日拥有两次手动刷新做题记录次数，当前还剩下 N 次」且不入队 |
| GET | `/core/spider/refresh-status` | 是 | 今日手动刷新做题记录状态（只读）：`{ code, message, limit, remaining, nextAvailableAt, syncIntervalMin }`；`limit`=今日有效总配额（已合并订阅/站管覆盖；0=禁止）、`remaining`=今日剩余（0=用完）、`nextAvailableAt`=下次可刷新 unix 秒（0=立即可，5 分钟冷却中为截止时间）、`syncIntervalMin`=当前生效自动同步间隔（min(站管覆盖, 组织 MIN, 订阅档)；失败回落默认 180） |
| POST | `/core/spider/toggle-platform` | 是(站点管理员) | 暂停/恢复某 OJ 爬虫同步；body `{ platform, enabled }`。暂停**不清空**绑定/历史数据，仅不再入队/消费该平台 |
| POST | `/core/spider/purge-submits-and-recrawl` | 是(站点管理员) | **硬清**训练数据并全量重爬；body `{ confirm: "PURGE_SUBMITS" }`。删：`submit_logs`（真假全删）、账本、日汇总、AC 预聚合、`contest_logs`、提醒发送日志 + 相关 Redis。**保留**：`platforms`、题库、公告/紧急通知、比赛日历赛程与订阅；用户账号在 user 库不动 |

**SetSpiderReq**
```json
{ "platform": "NowCoder|AtCoder|CodeForces|LuoGu|LeetCode|QOJ|LOJ|UOJ|POJ", "userId": 1, "username": "string" }
```
绑定成功后后台只抓取该 `platform` 的全量提交/比赛，并尽量同步该平台 **Rating**，不会重扫用户其它已绑定 OJ。

重绑同一平台时会先删除该平台已有提交/比赛明细，并按剩余明细**重建**日汇总与 AC 去重预聚合，再全量拉取，避免题量/提交量叠加（连点绑定不会再把 3000 叠成 6000）。

**Rating 抓取**（与提交爬虫同任务；失败不阻断提交同步）

| 平台 | 来源 | 备注 |
|------|------|------|
| Codeforces | `api/user.info` | 未参赛无 rating 字段 |
| AtCoder | `/users/{handle}/history/json` | 取最近 rated 的 NewRating |
| 牛客 | 竞赛主页 HTML | 显示「暂无」则 hasRating=false |
| 洛谷 | `/api/user/info/{uid}` 的 `eloValue`（旧 `rating` 已弃用） | 依赖现有登录会话 |
| 力扣 | `graphql/noj-go` contest ranking | 浮点四舍五入为整数 |
| QOJ | — | Cloudflare 暂不支持 |
| LOJ | `api.loj.ac` `user/getUserMeta` | 公开 API；rating≤0 视为无 |
| UOJ | 用户主页 HTML | 公开；**仅同步 AC 题目集 + Rating**（提交列表需登录，不做） |
| POJ | — | 无现代 Rating；提交走公开 `status?user_id=`（增量首页 / 全量 top 翻页） |

**UpdateReq**
```json
{ "userId": 1 }
```
仅站点管理员可调用；普通用户无手动更新入口，依赖组织定时同步与绑定后自动抓取。

**SpiderMonitorRes.data**（`GET /core/spider/monitor`，仅站管；运维页爬虫监控）
```json
{
  "collectedAt": 1754200000,
  "platforms": [
    {
      "platform": "NowCoder",
      "boundUsers": 128,          "submitCount": 89231,
      "todayEnqueued": 42,        "todayRows": 38,        "todayOk": 39,          "todayFail": 3,
      "lastOkAt": 1754190000,     "lastFailAt": 0,        "lastError": "",
      "problemCount": 421,        "contestCount": 96,
      "hasSubmitFetcher": true,   "hasProblemFetch": true, "hasContestCalendar": true,
      "hasAccount": false,        "accountStatus": "",    "accountAt": 0, "accountErr": "",
      "paused": false
    }
  ]
}
```
- 固定返回 9 个 OJ（NowCoder / AtCoder / CodeForces / LuoGu / QOJ / LeetCode / LOJ / UOJ / POJ），未使用平台计数为 0
- 模块字段：`boundUsers`（绑定用户）、`submitCount`（提交记录）、`problemCount`（题库题目）、`contestCount`（比赛日历场次）；能力开关 `hasSubmitFetcher` / `hasProblemFetch` / `hasContestCalendar`
- 今日计数 `todayEnqueued/todayOk/todayFail` 来自按 OJ 分桶的 Redis 日计数；`todayRows` 为今日**入库**（写入数据库）提交记录条数；`lastOkAt/lastFailAt/lastError` 为按 OJ 聚合的最近一次同步状态
- `paused`：站管是否已暂停该 OJ 同步（暂停时绑定用户仍在，仅停止同步）
- `hasAccount` 仅洛谷/QOJ 为 true（全局账号），`accountStatus` 取 `sitesettings` 登录态（ok/fail/unchecked）

### Health（运维监控，站点管理员）

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/health/overview` | 是(站点管理员) | 运维总览：服务状态（AI/邮件/OJ）+ 中间件探测（数据库/Redis/注册中心/MQ）+ **服务器资源（CPU/内存/磁盘/负载，读后台 25s 采样缓存，不实时拉取）** + API 延迟/请求 + 容量估算 |
| GET | `/core/health/resource-series` | 是(站点管理员) | 近 24h CPU/内存占用时序，query `points`（默认 288，服务端降采样，约 5 分钟粒度）；返回 `samples[{t,cpu,mem}]` + `intervalSec` + `hours`（服务刚启动可能不满 24h） |

- 资源监控后台每 **25 秒**采样一次全机 CPU/内存/磁盘/负载，写入 Redis 时序（保留 24h）与快照缓存；运维页访问读缓存，不再实时 gopsutil（避免每次打开页面对 CPU 造成 ~500ms 采样负载）
- 样例 `resource-series` 响应：
```json
{ "code": 0, "intervalSec": 25, "hours": 23.9,
  "samples": [ { "t": 1754200000, "cpu": 12.5, "mem": 33.9 }, { "t": 1754200025, "cpu": 8.2, "mem": 34.1 } ] }
```

### Statistic

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/statistic/heatmap` | 否 | query: `startDate`, `endDate`, `isAc`, `userId?`（个人>0；`0`=当前组织热力；`-2`=**全站公开聚合**）。**跨度**：个人最多约 20 年，组织/全站最多约 400 天；响应为稀疏日行（仅 `count>0`），前端补空格。日期支持 `YYYY-MM-DD` / `YYYYMMDD`。**缓存**：个人按 `userVer` 稳定 key（爬虫写入即 INCR ver 失效，保证即时）；组织/全站短 TTL + global ver（全局 bump 约 2min 节流）。 |
| GET | `/core/statistic/period` | 否 | query: `userId`（个人>0；`-1`=当前组织；`-2`=**全站公开聚合**） |
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
- **全站 `userId=-2` 为公开接口**（无需登录、无需站管）；首页/发现未登录汇总使用此约定

### Contest

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/contest/list` | 否 | query: `userId`(-1=全部), `limit`, `offset`, `platform?`, `keyword?`（名称/场次 ID 模糊）, `timeFrom?`/`timeTo?`（unix 秒，按比赛时间含端点）；项含 `rank` / `acCount` / `totalCount` / `userId` |
| GET | `/core/contest/history` | 否 | query: `userId`, `limit`, `cursor`, `platform?` |
| GET | `/core/contest/ranking` | 否 | query: `contestId` 或 `contest_id`（**contest_logs 行 id**）, `limit`, `offset`, `groupId?`, `followingOnly?`（与组织/分组求交） |
| GET | `/core/contest/problems` | 否 | query: `id` 或 `contestId`（**contest_logs 行 id**）→ 比赛题目 Tab 列表；**每场（platform+OJ contest_id）只 ensure 一次**：主动从 OJ 发现题目并入库（`external_id` 与提交解析一致）+ **强制爬题面**；AI 分析仍依赖「有资格用户提交」闸门 |
| GET | `/core/contest/board` | 否 | query: `id`/`contestId`（**contest_logs 行 id**）, `groupId?`, `followingOnly?` → XCPCIO 风格站内榜：`scoring`（icpc\|leetcode）、`problems[]`、`rows[{isContestant,cells}]`；补题直接由已有全量 `submit_logs` 推导，无需重新爬取。格子 `status`：`AC`（赛时通过，计分）、`UPSOLVE`（补题通过）、`UPSOLVE_TRIED`（补题未过）、`TRIED`（赛时未过）、`NONE`；补题状态均不计分。**展示序**：赛时选手按官方/本地榜序；**仅补题用户**在下方按补题 AC 数降序，相同则最后一次补题通过时间升序（更早在前）；纯补题不赋名次 |
| GET | `/core/contest/cell-submits` | 否 | query: `id`/`contestId`（**contest_logs 行 id**）, `userId`, `label?`, `externalId?`（label 与 externalId 至少一个）→ 该用户本场该题的提交明细。含**赛时**与**赛后补题**（赛后最多约 30 天，与补题推导一致）；项字段 `phase`：`contest`（赛时，可有 `relativeSec`）\| `upsolve`（赛后，用绝对 `time`）；按提交时间逆序 |

### ContestCalendar（比赛日历 / 公开赛程）

与 Contest（参赛记录）分离。数据源：`calendar.cpolar.cn`（综合）+ 力扣 GraphQL，每 12 小时爬取。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/contest-calendar/list` | 否 | query: `platform?`, `keyword?`, `status?`(upcoming\|ongoing\|ended\|all), `timeFrom?`/`timeTo?`（unix 秒，按开赛时间含端点）, `limit`, `offset` |
| GET | `/core/contest-calendar/platforms` | 否 | 平台及即将开始场次统计 |
| GET | `/core/contest-calendar/sub` | 是 | 我的邮件订阅 |
| POST | `/core/contest-calendar/sub` | 是 | 创建/更新订阅 body: `{ scope, platform?, calendarId?, advanceMinutes, enabled }` |
| POST | `/core/contest-calendar/sub/delete` | 是 | 删除订阅 body: `{ scope, platform?, calendarId? }` |

**scope**：`platform`（整平台）或 `contest`（单场）。  
**advanceMinutes** 白名单：`30, 60, 180, 360, 720, 1440, 2880, 4320`；未传或 ≤0 时默认 **180（3 小时）**。  
订阅需账号已绑定邮箱（core 经 user 内部 `GetContactEmail` 校验）；`enabled=true` 保存成功后**每次**异步发送**订阅成功确认邮件**（含已订阅再点、取消后再订；不限流）。`enabled=false` 不发确认信。  

**本场静默（mute）**：`scope=contest` 且 `enabled=false` 表示取消本场提醒，并**覆盖**同平台的 platform 订阅（该场不再发提醒）。列表 `subscribed` 在 mute 时为 false。  

**开赛前提醒**：在 `advanceMinutes` 时发送；同一用户同一场同一提前量只发一次（先原子占坑再发信）。平台订阅与单场订阅**提前量相同**时只发一封；单场优先于平台。不同提前量仍可各发一次。

### Bulletin

双层公告：`scope=site` 站点公告（仅站点管理员发布，全员可见，列表置顶展示）；`scope=org` 组织公告（组织教练/队长/组织管理员，仅本组织可见）。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/core/bulletin/create` | 是 | 创建；`scope=site` 仅站管；`scope=org` 组织教练及以上 |
| POST | `/core/bulletin/update` | 是 | 更新（仅可管范围内） |
| DELETE | `/core/bulletin/delete` | 是 | query: `id`（仅可管范围内） |
| GET | `/core/bulletin/get` | 否 | query: `id` |
| GET | `/core/bulletin/list` | 否 | query: `page`, `pageSize`, `scope?` |

**List 过滤**

| `scope` | 结果 |
|---------|------|
| 空 | 全站 ∪ 当前组织；**站点公告优先**，再置顶，再时间倒序 |
| `site` | 仅站点公告 |
| `org` | 仅当前 JWT 组织公告（无组织上下文则空） |

**CreateReq**
```json
{ "title": "string", "content": "string", "isPinned": false, "scope": "site|org" }
```
- `scope` 可选。省略时：站管默认 `site`，其余默认 `org`
- 组织公告写入当前 JWT `orgId`

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
  "updatedAt": 1710000000,
  "scope": "site",
  "orgId": 0
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
| POST | `/core/emergency/reorder` | 是(站点管理员) | 拖拽排序 body `{ "ids": [3,1,2] }` 按序重写 sortOrder |

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
| GET | `/core/problem/hot` | 否 | 全站热题：近 `days` 天（默认 2，1–7）按提交次数/做题人数/AC 综合热度排序；`page`/`pageSize`；项含 `problem` + `submitCount`/`solverCount`/`acCount`/`score`/`lastSubmittedAt`；热度 = submit×1 + solver×3 + ac×2 |
| GET | `/core/problem/get` | 否 | query: `id`；详情含 `contributors[]`（`userId`/`name`/`username`/`avatar`）：审核通过的内容贡献者，多人全列，按首次通过时间升序；列表接口可不带 |
| GET | `/core/problem/following-status` | 是 | query: `problemId` → 关注用户对本题 `AC|TRIED|NONE` |
| GET | `/core/problem/submissions` | 否 | query: `problemId`, `page`, `pageSize`, `userId?`, `followingOnly?`（不受域限制）, `status?`=`AC`；返回 `data` + **`total`**（服务端分页） |
| GET | `/core/problem/comment/list` | 否（登录可带 liked） | query: `problemId` **或** `solutionId`（可同传）、`page`/`pageSize` → **顶层评论分页** + 嵌套 `replies`；`solutionId` 拉题解评论，仅 `problemId` 拉题目讨论（`solutionId=0`）；项含 `solutionId`/`likeCount`/`liked`/`parentId`/`rootId`/`depth` |
| POST | `/core/problem/comment/create` | 是 | body: `{ problemId?, solutionId?, content, parentId?, syncToPublic? }`；传 `solutionId` 为题解评论（可省略 problemId，服务端按题解补全）；`parentId` 回复；最大深度 3；**仅题目顶层**写发现流；题解顶层通知题解作者；回复通知父作者；`@username` |
| POST | `/core/problem/comment/delete` | 是 | body: `{ id }` 本人或站管；**级联删除子树** + 点赞/举报/发现流 |
| GET | `/core/problem/solution/list` | 否（登录可带 liked） | query: `problemId`, `page`, `pageSize` → **用户题解**列表（含 `likeCount`/`liked`）；已同步博客时含 `blogArticleId`/`blogSlug`/`blogUsername` |
| GET | `/core/problem/solution/get` | 否（登录可带 liked） | query: `id` → 题解全文 `contentMd` + `likeCount`/`liked`；**懒同步**到作者博客默认分类；返回 `blogArticleId`/`blogSlug`/`blogUsername` 供「去他博客看」 |
| POST | `/core/problem/solution/create` | 是 | body: `{ problemId, title, contentMd }`；Markdown；`@username`；同步发现流；**同步写入作者博客默认分类**（`visibility=public`，slug=`solution-{id}`） |
| POST | `/core/problem/solution/update` | 是 | body: `{ id, title, contentMd }` 本人或站管；同步更新博客镜像 |
| POST | `/core/problem/solution/delete` | 是 | body: `{ id }` 本人或站管；清理点赞/举报/发现流，**并级联删除该题解下评论**与**对应博客文章** |
| POST | `/core/problem/like` | 是 | body: `{ targetType: "comment"\|"solution", targetId }` **toggle** 点赞 → `{ liked, likeCount }` |
| POST | `/core/problem/report` | 是 | body: `{ targetType: "comment"\|"solution", targetId, reason }`；同用户同目标去重 |
| GET | `/core/problem/report/list` | 是（`content.report.handle`） | query: `status?`=`pending`（默认）`\|resolved\|dismissed\|all`、`targetType?`=`comment\|solution`、`page`/`pageSize` → `CommunityReportAdminItem` 列表（题解带标题、评论带 ≤120 字摘录；目标已删 `target.exists=false`） |
| POST | `/core/problem/report/handle` | 是（`content.report.handle`） | body: `{ id, action: "resolve"\|"dismiss" }` → 标记已处理 / 驳回 |
| GET | `/core/activity/feed` | 否（建议登录） | query: `page`, `pageSize`, `type?`=`comment\|solution` → 发现动态：**公共域/未登录=全站聚合**（评论+题解，按 type+refId 去重）；**私有域=仅本组织成员产生的内容**（看不到非成员的公共域内容） |

### 题单（Problemset）

每个登录用户自动具备系统题单：**我的收藏**（`kind=favorites`）、**待做题单**（`kind=todo`，AC 后自动剔除，也可手动剔除）。  
用户可创建自定义题单：`visibility` = `private` | `password` | `public`（公有进入广场，且可在题目页展示）。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/problemset/mine` | 是 | 我的题单列表（幂等创建系统题单）；可选 `problemId` → 每项附 `containsProblem`（本题是否已在该单） |
| GET | `/core/problemset/square` | 否 | 题单广场；query: `page`, `pageSize`, `keyword?`（模糊） |
| GET | `/core/problemset/get` | 否* | query: `id`, `unlockToken?`；私有仅 owner；密码无 token 返回 `PASSWORD_REQUIRED` |
| GET | `/core/problemset/by-problem` | 否 | query: `problemId` → 关联的**公有自定义**题单摘要（含点赞数）；**不含**系统收藏/待做（`kind=favorites|todo`），即使公开也不展示 |
| POST | `/core/problemset/create` | 是 | body: `{ title, description?, visibility?, password? }` |
| POST | `/core/problemset/update` | 是 | body: `{ id, title?, description?, visibility?, password?, clearPassword? }`；系统题单仅可改描述 |
| POST | `/core/problemset/delete` | 是 | body: `{ id }`；系统题单不可删 |
| POST | `/core/problemset/unlock` | 否 | body: `{ id, password }` → `{ unlockToken, expiresIn }` |
| POST | `/core/problemset/add` | 是 | body: `{ problemsetId?, problemId? }` 或 `{ problemsetId?, url? }`；**`problemsetId` 可省略**：仅向题库入库（须 `url`）；有 `problemsetId` 时同时加入该题单（须本人题单）。**先入库再后台补**：无真标题也可用 external_id 占位入库；缺题面/仅占位标题时**最高优先级**后台爬取（直爬 + MQ 兜底，HTTP 不阻塞）；AI 按操作者资格；无法识别链接 → `success=false, code=URL_PARSE_FAILED`（HTTP 200）。URL 会清洗粘贴噪声（query/fragment、前后说明文字、Markdown 链接）。成功 data：`{ problemId, fetchTriggered, platform?, title?, externalId? }`（识别摘要供前端确认弹窗）。支持：`CodeForces`（含 gym/group）、`AtCoder`、`LuoGu`、`NowCoder`（题库 `/acm/problem/{id}`、主站 `/practice/{uuid}`、**比赛题页** `/acm/contest/{contestId}/{A}` → problem-list 解析数字 problemId）、`QOJ`、`LeetCode`（cn/com）、`LOJ`（`/p/{id}`）、`UOJ`（`/problem/{id}`）、`POJ`（`/problem?id=`，题面按 `.ptt`/`.pst`/`.ptx` 解析） |
| POST | `/core/problemset/add-manual` | 是 | 链接无法识别时手动建题（**无需审核**）；body: `{ problemsetId?, title, contentMd?, tags?, sourceUrl? }` → `{ problemId }`；`problemsetId` 可省略（仅入库）；`platform=Manual` |
| POST | `/core/problemset/remove` | 是 | body: `{ problemsetId, problemId }` 手动剔除 |
| POST | `/core/problemset/reorder` | 是 | 拖拽排序；body: `{ problemsetId, ids: [itemId…] }`（`ids` 为题单项 id，须覆盖该题单全部项）；按序重写 `sortOrder` 为 `0,1,2…`；仅 owner |
| POST | `/core/problemset/like` | 是 | body: `{ id }` toggle 点赞 → `{ liked, likeCount }` |
| POST | `/core/problemset/favorite` | 是 | body: `{ id }` toggle **收藏**（与点赞分离；仅公开自定义题单）→ `{ favorited }` |
| GET | `/core/problemset/favorites` | 是 | 我收藏的题单列表；**排除自己的**；query: `page`, `pageSize`；仅仍为 public custom 的 |

**ProblemsetInfo**
```json
{
  "id": 1,
  "ownerId": 2,
  "ownerName": "张三",
  "title": "我的收藏",
  "description": "…",
  "kind": "favorites|todo|custom",
  "visibility": "private|password|public",
  "likeCount": 0,
  "itemCount": 3,
  "liked": false,
  "favorited": false,
  "isOwner": true,
  "isSystem": true,
  "containsProblem": false,
  "items": [
    {
      "id": 10,
      "problemId": 100,
      "title": "A+B",
      "platform": "LuoGu",
      "externalId": "P1001",
      "userStatus": "AC|TRIED|",
      "sortOrder": 1,
      "tags": ["动态规划", "字符串"]
    }
  ]
}
```
| GET | `/core/user/recent-comments` | 否 | query: `userId`, `limit?` → 用户近期评论（资料页） |
| GET | `/core/user/recent-solutions` | 否 | query: `userId`, `limit?` → 用户近期题解（资料页） |
| POST | `/core/problem/rebuild-profiles` | 是(**站点管理员**) | 全站**仅重建能力画像**（不重爬 OJ）：对有 AC 用户强制入队画像重建，队列内重算难度加权 `weight`（评分模型升级后回填用）；返回 `{ code, message, candidates, published }` |
| GET | `/core/problem/user-profile` | 否 | query: `userId` 做题画像；`radar[].score`=掌握度（0–100），= `100×weight/(weight+30)`，weight=该标签下 AC 题按难度加权（简单1/中等3/困难8/未知2）之和；`acCount`=去重 AC 题数 |
| GET | `/core/problem/related-contests` | 否 | query: `problemId` → 本题出现过的比赛（`contest_problems` 反查，含站内 `contestLogId` / 题号 label） |
| GET | `/core/problem/progress` | 是(管理员) | 爬取/分析进度 |
| POST | `/core/problem/backfill` | 是(管理员) | 近6月提交回填入队；body: `{ limit }`；**仅组织用户提交**的题才爬题面/跑 AI；纯公共域/散户只入库（前端「题面准备中」） |
| POST | `/core/problem/emergency-stop` | 是(管理员) | 暂停分析（队列保留） |
| POST | `/core/problem/reset-all` | 是(管理员) | 重置 AI 标签；body: `{ requeue, requeueSet }` |
| POST | `/core/problem/reset-queues` | 是(管理员) | purge MQ 后按 DB 待爬/待分析重灌 |
| POST | `/core/problem/resume` | 是(管理员) | 恢复分析 |
| POST | `/core/problem/retry-failed` | 是(管理员) | body: `{ limit, includePermanent? }`；`includePermanent=true` 时重试近 6 月可恢复的永久失败（DOM/WAF/暂无权限等，不含付费题/QOJ403 等硬永久） |
| POST | `/core/problem/clear-recent-failed` | 是(管理员) | 近 6 月 `FAILED` → `FAILED_PERM`，**停止自动退避重试**；body 可空；返回 `cleared` |
| POST | `/core/problem/clear-nowcoder-content` | 是(管理员) | **只清** NowCoder `content_md`（保留 tags/solutions）；`{ requeue?: true }` 清空后强制重爬题面 |
| POST | `/core/problem/repair-qoj-titles` | 是(管理员) | 全量修复 QOJ 标题被识别为「QOJ.ac」的脏数据；body: `{ limit?: number, refetch?: bool }`；默认优先用已有 `content_md` 一级标题回填，`refetch=true` 时对仍无好标题的题访问 qoj.ac 拉官方题头；后台异步 |
| POST | `/core/problem/toggle-analyze` | 是(管理员) | 暂停/恢复分析（不清队列）；`{ pause?, pauseSet? }` |
| POST | `/core/problem/toggle-fetch` | 是(管理员) | 暂停/恢复爬取（不清队列）；`{ pause?, pauseSet? }` |
| POST | `/core/problem/admin-update` | 是(**站管/题库审查权限**) | 改标签/题面/难度；写审核记录并 auto-approve（「已通过」可见）；`{ id, updateTags?, tags?, updateContent?, contentMd?, title?, updateDifficulty?, difficulty? }` |
| POST | `/core/problem/propose-edit` | 是(登录) | 提交标签/题面/难度修改申请；站管/持题库审查权限者调用时写记录并自动通过；`{ problemId, updateTags?, tags?, updateContent?, contentMd?, title?, note?, updateDifficulty?, difficulty? }` |
| GET | `/core/problem/edit-requests` | 是(**站管/题库审查权限**) | 审核列表 `?page&pageSize&status=pending\|approved\|rejected` |
| POST | `/core/problem/review-edit` | 是(**站管/题库审查权限**) | 通过/驳回；`{ id, approve, reviewNote? }` |
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

**Hot** `GET /core/problem/hot?page=1&pageSize=20&days=2`

近窗全站热题（默认 2 天，允许 1–7）。从 `submit_logs` 聚合：

| 指标 | 说明 |
|------|------|
| `submitCount` | 提交次数（排除力扣合成/不计入提交行） |
| `solverCount` | 做题人数（`user_id` 去重） |
| `acCount` | AC 次数（`is_ac`） |
| `score` | `submit×1 + solver×3 + ac×2`（做题人数权重最高） |
| `lastSubmittedAt` | 窗口内最近一次提交 |

排序：`score DESC, lastSubmittedAt DESC`。短缓存约 90s。

```json
{
  "code": "0",
  "message": "success",
  "data": [{
    "problem": { "id": 1, "title": "…", "platform": "LuoGu", "difficulty": "中等" },
    "submitCount": 12,
    "solverCount": 5,
    "acCount": 4,
    "score": 35,
    "lastSubmittedAt": 1784273532
  }],
  "total": 40,
  "page": 1,
  "pageSize": 20,
  "days": 2
}
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

### 题目评论 / 用户题解 / 发现同步

- **评论、题解挂在题目上，全站可见**（list 不按 org 过滤；题库任意域进入同一题，题解/评论均全量展示）。
- **发现流 `activity/feed`**：
  - **题解创建**：写入作者所属**全部组织**（`org_members` + 公共域），保证各域都能看到自己的题解。
  - **评论创建**：仍写当前 JWT 组织；可选 `syncToPublic` 双写公共域。
  - **公共域 / 未登录**：全站聚合全部评论+题解动态；同一内容多条 org 行按 `(type, refId)` 去重。
  - **私有域**：按**组织成员**筛选作者（只看本域成员的内容，看不到纯公共域外人）；同内容去重。
- **博客推荐 `blog/recommend?orgId=`**：公共域/缺省=全站公开文；**私有域=仅该组织成员的公开文章**（与发现流一致）。
- **评论可选同步公共域**：`POST comment/create` 传 `syncToPublic: true` 时，若当前组织不是公共域，会再写一条公共域 `activity_feeds`（同一评论 `refId`）；公共域列表已全站聚合，此字段主要用于显式双写；删除评论时相关 feed 一并清除。
- **层级评论**：`parentId` 指定回复目标；`rootId`/`depth` 维护树；最大深度 **3**；list **仅分页顶层**，子回复在 `replies` 中递归返回；**仅题目顶层**写发现流；回复会通知父评论作者（`comment_reply`）。
- **题解评论**：`solutionId` 挂在用户题解下，与题目讨论隔离；顶层评论通知题解作者；删除题解时级联清评论。
- **点赞**：`POST /core/problem/like` toggle；`targetType`=`comment|solution`；列表/详情带 `likeCount`/`liked`。
- **举报**：`POST /core/problem/report`；同用户同目标仅一次；不能举报自己。
- 题解 `contentMd` 按题面规格渲染（GFM + 公式）；与 AI `ProblemInfo.solutions` 无关。
- `@username` 在创建时解析并写站内通知。

**Comment create** `POST /core/problem/comment/create`
```json
{ "problemId": 1, "content": "不错 @bob", "parentId": 0, "syncToPublic": true }
```
回复：
```json
{ "problemId": 1, "content": "我也这么觉得", "parentId": 12 }
```
题解评论：
```json
{ "solutionId": 5, "content": "这段 DP 写得很清楚", "parentId": 0 }
```

**Comment list** `GET /core/problem/comment/list?problemId=1&page=1&pageSize=20`  
题解：`GET /core/problem/comment/list?solutionId=5&page=1&pageSize=20`
```json
{
  "success": true,
  "list": [{
    "id": 1, "problemId": 1, "solutionId": 0, "userId": 2, "username": "alice", "name": "Alice",
    "avatar": "", "content": "不错 @bob", "parentId": 0, "rootId": 1, "depth": 0,
    "likeCount": 3, "liked": false, "createdAt": 1710000000,
    "replies": [{
      "id": 12, "parentId": 1, "rootId": 1, "depth": 1,
      "replyToUserId": 2, "replyToUsername": "alice", "replyToName": "Alice",
      "content": "同意", "likeCount": 0, "liked": false, "replies": [],
      "createdAt": 1710000100
    }]
  }],
  "total": 1, "page": 1, "pageSize": 20
}
```

**Solution create** `POST /core/problem/solution/create`
```json
{ "problemId": 1, "title": "差分思路", "contentMd": "## 思路\n$O(n)$" }
```

**Like** `POST /core/problem/like`
```json
{ "targetType": "comment", "targetId": 12 }
```
```json
{ "success": true, "data": { "liked": true, "likeCount": 4, "targetType": "comment", "targetId": 12 } }
```

**Report** `POST /core/problem/report`
```json
{ "targetType": "solution", "targetId": 5, "reason": "广告引流" }
```

**Activity feed** `GET /core/activity/feed?page=1&pageSize=20&type=comment`
```json
{
  "success": true,
  "list": [{
    "id": 1, "orgId": 3, "userId": 2, "username": "alice", "name": "Alice",
    "type": "comment", "refId": 10, "problemId": 1, "problemTitle": "A+B",
    "title": "不错", "excerpt": "不错", "createdAt": 1710000000
  }],
  "total": 1, "page": 1, "pageSize": 20
}
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

### Training Report（组织训练报告）

教练 / 队长 / 组织管理员可导出指定日期区间（可选组）的组织训练报告；支持规则模板或 AI 分析。生成在后台异步进行，完成后邮件通知发起人（可附 PDF），下载有效期 **24 小时**。周报即「上周」训练报告，共用此管道。

**周报发送日（周一）组织共享**：同一组织、同一上周区间的 AI 周报文档只生成 **一份**（`source=weekly` job）；同组织其他已开启周报的教练/队长/组织管理员 **复用该文档** 各自收邮件，不重复跑 AI / 不另落盘。

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/agent/training-report/start` | staff | body: `startDate`, `endDate`, `groupId?`, `useAi?`, `orgId?` → `jobId` |
| GET | `/agent/training-report/job` | staff | query: `jobId` |
| GET | `/agent/training-report/jobs` | staff | query: `orgId?`, `limit?` 最近任务列表 |
| GET | `/agent/training-report/download` | staff | query: `jobId`, `format?=pdf\|html` 下载产物 |

**Start body**
```json
{
  "startDate": "2026-07-06",
  "endDate": "2026-07-12",
  "groupId": 0,
  "useAi": false,
  "orgId": 3
}
```

**Start response**
```json
{ "code": 0, "msg": "任务已创建，后台生成中", "jobId": "uuid" }
```

**Job**
```json
{
  "jobId": "uuid",
  "status": "pending|running|done|failed|expired",
  "progress": 100,
  "message": "已完成",
  "startDate": "2026-07-06",
  "endDate": "2026-07-12",
  "groupId": 0,
  "useAi": false,
  "orgId": 3,
  "createdBy": 1,
  "createdAt": 1710000000,
  "finishedAt": 1710001000,
  "expiresAt": 1710087400,
  "downloadable": true,
  "fileName": "training-report-2026-07-06-2026-07-12.pdf"
}
```

---

## 完整路径清单

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
GET    /api/user/org/invite/preview
POST   /api/user/org/invite/rotate
GET    /api/user/org/join-requests
POST   /api/user/org/join-requests/review
POST   /api/user/platform/set-site-admin
GET    /api/user/rbac/permissions
GET    /api/user/rbac/roles
POST   /api/user/rbac/roles/create
POST   /api/user/rbac/roles/update
POST   /api/user/rbac/roles/delete
GET    /api/user/rbac/roles/members
POST   /api/user/rbac/roles/assign
POST   /api/user/rbac/roles/unassign
GET    /api/user/rbac/user-roles
GET    /api/user/rbac/my-permissions
GET    /api/core/submit-log/get-by-id
POST   /api/core/spider/set
POST   /api/core/spider/update
POST   /api/core/spider/update-all
GET    /api/core/spider/submit-inventory
GET    /api/core/spider/monitor
POST   /api/core/spider/purge-submits-and-recrawl
GET    /api/core/health/overview
GET    /api/core/health/resource-series
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
GET    /api/core/problem/hot
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
GET    /api/core/problemset/mine
GET    /api/core/problemset/square
GET    /api/core/problemset/get
GET    /api/core/problemset/by-problem
POST   /api/core/problemset/create
POST   /api/core/problemset/update
POST   /api/core/problemset/delete
POST   /api/core/problemset/unlock
POST   /api/core/problemset/add
POST   /api/core/problemset/add-manual
POST   /api/core/problemset/remove
POST   /api/core/problemset/reorder
POST   /api/core/problemset/like
POST   /api/core/problemset/favorite
GET    /api/core/problemset/favorites
GET    /api/agent/summary/recent
POST   /api/agent/training-report/start
GET    /api/agent/training-report/job
GET    /api/agent/training-report/jobs
GET    /api/agent/training-report/download
```

## 来源

- Proto: `cwxu-algo/api/{user,core,agent}/v1/**/*.proto`（**2026-08-08 起业务接口全部由 proto 生成**；仅文件上传 `/user/upload`、静态 `/user/static/*`、备份导入/下载、SEO HTML/sitemap、训练报告下载等二进制/非 JSON 接口保留手写路由）
- OpenAPI: `cwxu-algo/openapi.yaml`
- 网关路由: `cwxu-algo/app/gateway/cmd/gateway/config.yaml`
