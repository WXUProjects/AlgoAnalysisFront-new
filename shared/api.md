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
| POST | `/user/auth/login` | 否 | 登录，返回 jwtToken |
| POST | `/user/auth/register` | 否 | 注册 |

**LoginReq**
```json
{ "username": "string", "password": "string" }
```
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
  "groupId": 0
}
```

`name` = **全局昵称**（非真实姓名；加入校队时另填「组织内名称」）。
**RegisterRes**
```json
{ "success": true, "message": "string" }
```

### Profile

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/user/profile/get-by-id` | 否 | query: `userId` |
| GET | `/user/profile/get-by-name` | 否 | query: `name` |
| GET | `/user/profile/list` | 否 | query: `pageNum`, `pageSize`, `scope=org\|site`（org=当前组织；site=全站仅站管；空=兼容旧逻辑）；**org 视图 `name`=组织内名称**；site 为全局昵称；项含 `isSiteAdmin`、`orgs[{orgId,name,role}]` |
| POST | `/user/profile/sync-policies` | 否（内部） | body: `{ userIds }` → 每人一条策略：多组织 **MIN 间隔**、开关任一开启 |
| POST | `/user/profile/update` | 是 | 更新资料 |
| POST | `/user/profile/move-group` | 是 | 移动用户组 |
| POST | `/user/profile/set-email-enabled` | 是 | body: `{ userId, enabled, kind?: daily\|weekly }`；无组织授权时不可开启日报/周报 |
| GET | `/user/profile/ids-by-group` | 否 | query: `groupId` |
| POST | `/user/profile/get-by-ids` | 否 | body: `{ userIds, orgId? }`；`name`=该组织 `org_display_name`（空则 username）；`orgId` 缺省用 JWT 当前组织，再回落公共域 |
| POST | `/user/profile/delete` | 是(管理员) | 软删除用户 |

### Upload / Site

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/user/upload` | 是 | multipart `file` + 可选 `purpose`=`avatar\|site\|bulletin\|misc`，返回 `{ url }`（≤3MB 图片）。**url 带真实扩展名**（如 `.png`/`.jpg`） |
| GET | `/user/static/*` | 否 | 已上传文件；支持带后缀精确匹配；无后缀/错后缀时会按 stem 探测磁盘上的 `.png/.jpg/...` |
| GET | `/user/site/config` | 否 | 站点标题/logo/favicon（默认 GoAlgo） |
| POST | `/user/site/config` | 是(站点管理员) | body: `{ siteTitle, siteLogo, favicon }` |

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
| GET | `/user/org/list` | 是 | 我的组织；项含 `myRole`、`orgDisplayName`（我在该组织的称呼）、`isCurrent`；`?all=1` 站点管理员看全部 |
| GET | `/user/org/get` | 是 | query: `id`（默认当前组织）；若本人是成员则含 `myRole`、`orgDisplayName` |
| POST | `/user/org/create` | 站点管理员 | `{ name, slug?, adminUserId?, joinMode? }` |
| POST | `/user/org/update` | 组织/站点管理员 | 品牌/开关/joinMode；间隔仅站点 |
| POST | `/user/org/delete` | 站点管理员 | `{ id }` 软删除；**公共域不可删**；成员迁回公共域；挂在该组织分组上的用户迁到公共域默认分组；释放 slug/识别码唯一约束 |
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
| GET | `/user/org/invite` | 组织管理员 | query: `orgId` → 团队识别码 |
| POST | `/user/org/invite/rotate` | 组织管理员 | `{ orgId }` 更换识别码 |
| GET | `/user/org/join-requests` | 组织管理员 | 待审批列表 |
| POST | `/user/org/join-requests/review` | 组织管理员 | `{ id, approve }` |
| POST | `/user/platform/set-site-admin` | 站点管理员 | `{ userId, isSiteAdmin }` |

默认组织（`users.current_org_id`）：注册时为 **公共域** `slug=public`（全员自动加入，不可退出）。  
**管理员拉入**某组织后，该组织成为用户默认组织（下次打开自动进入）。用户之后只需 **switch 切换**，切换即记忆，无需刻意「修改默认组织」。

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
{ "userId": 1, "name": "string", "email": "string", "avatar": "string" }
```

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
| POST | `/core/spider/set` | 是 | 绑定 OJ 账号 |
| POST | `/core/spider/update` | 是 | 更新单用户爬虫数据 |
| POST | `/core/spider/update-all` | 是(管理员) | 全量更新 |

**SetSpiderReq**
```json
{ "platform": "NowCoder|AtCoder|CodeForces|LuoGu|LeetCode|QOJ", "userId": 1, "username": "string" }
```

**UpdateReq**
```json
{ "userId": 1 }
```

### Statistic

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/statistic/heatmap` | 否 | query: `startDate`, `endDate`, `isAc`, `userId?`（个人>0；`0`=当前组织；`-2`=全站仅站管） |
| GET | `/core/statistic/period` | 否 | query: `userId`（个人>0；`-1`=当前组织；`-2`=全站仅站管） |
| GET | `/core/statistic/rank` | 否 | 排行榜 |

**PeriodRes.data**
```json
{
  "ac": { "today": 0, "thisWeek": 0, "lastWeek": 0, "thisMonth": 0, "lastMonth": 0, "thisYear": 0, "lastYear": 0, "total": 0 },
  "submit": { "today": 0, "thisWeek": 0, "lastWeek": 0, "thisMonth": 0, "lastMonth": 0, "thisYear": 0, "lastYear": 0, "total": 0 }
}
```

### Contest

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/contest/list` | 否 | query: `userId`(-1=全部), `limit`, `offset`, `platform?` |
| GET | `/core/contest/history` | 否 | query: `userId`, `limit`, `cursor`, `platform?` |
| GET | `/core/contest/ranking` | 否 | query: `contestId` 或 `contest_id`, `limit`, `offset`, `groupId?` |

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

### Problem

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/core/problem/list` | 否 | 题库列表 |
| GET | `/core/problem/tags` | 否 | 标签聚合 `?limit=`，返回 `{ tag, count }[]` |
| GET | `/core/problem/get` | 否 | query: `id` |
| GET | `/core/problem/submissions` | 否 | query: `problemId`, `page`, `pageSize`, `userId?` |
| GET | `/core/problem/user-profile` | 否 | query: `userId` 做题画像 |
| GET | `/core/problem/progress` | 是(管理员) | 爬取/分析进度 |
| POST | `/core/problem/backfill` | 是(管理员) | 近6月提交回填入队；body: `{ limit }` |
| POST | `/core/problem/emergency-stop` | 是(管理员) | 暂停分析（队列保留） |
| POST | `/core/problem/reset-all` | 是(管理员) | 重置 AI 标签；body: `{ requeue, requeueSet }` |
| POST | `/core/problem/reset-queues` | 是(管理员) | purge MQ 后按 DB 待爬/待分析重灌 |
| POST | `/core/problem/resume` | 是(管理员) | 恢复分析 |
| POST | `/core/problem/retry-failed` | 是(管理员) | body: `{ limit }` |
| POST | `/core/problem/toggle-analyze` | 是(管理员) | 暂停/恢复分析（不清队列）；`{ pause?, pauseSet? }` |
| POST | `/core/problem/toggle-fetch` | 是(管理员) | 暂停/恢复爬取（不清队列）；`{ pause?, pauseSet? }` |

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
POST   /api/user/auth/register
POST   /api/user/auth/refresh
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
