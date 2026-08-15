# 人工服务问答历史实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 创建人工工单时，将最近最多 15 轮完整智能问答按原顺序写入首条消息，并确保正文不超过 10000 字。

**架构：** 在独立模块中实现无副作用的问答历史选择和序列化函数，服务页只负责传入当前内存会话并处理空结果。选择逻辑先截取最近 15 轮，再从最早轮次移除超出字数预算的完整轮次。

**技术栈：** TypeScript、React 19、Node test runner、Vite

---

## 文件结构

- 创建 `src/lib/service-handoff.ts`：定义最小问答类型和历史序列化纯函数。
- 创建 `src/lib/service-handoff.test.ts`：覆盖顺序、15 轮窗口、正文预算和单轮超限。
- 修改 `src/components/service/qa-chat.tsx`：使用纯函数生成创建工单的首条消息。

### 任务 1：问答历史窗口与序列化

**文件：**
- 创建：`src/lib/service-handoff.ts`
- 测试：`src/lib/service-handoff.test.ts`

- [ ] **步骤 1：编写失败测试**

测试构造 16 轮问答，断言结果不含第 1 轮、包含第 2 至第 16 轮且顺序不变；另构造超预算轮次，断言移除最早完整轮次；单轮超过限制时断言返回空字符串。

- [ ] **步骤 2：运行测试验证失败**

运行：`node --import tsx --test src/lib/service-handoff.test.ts`
预期：FAIL，模块 `./service-handoff` 不存在。

- [ ] **步骤 3：实现最少纯函数**

导出：

```ts
export interface ServiceQaTurn {
  question: string
  answer: string
}

export function serializeServiceHandoff(
  turns: ServiceQaTurn[],
  maxTurns = 15,
  maxLength = 10000,
): string
```

每轮格式为 `用户：${question}\nQA：${answer}`。先取 `turns.slice(-maxTurns)`，再从窗口末尾向前累计完整轮次；无法容纳最后一轮时返回空字符串。

- [ ] **步骤 4：运行测试验证通过**

运行：`node --import tsx --test src/lib/service-handoff.test.ts`
预期：所有测试 PASS。

### 任务 2：接入人工服务创建流程

**文件：**
- 修改：`src/components/service/qa-chat.tsx:21-100`

- [ ] **步骤 1：替换组件内序列化实现**

导入 `serializeServiceHandoff`，删除组件内部 `serializeQa`，并在 `handleHandoff` 中调用纯函数。结果为空时提示“对话内容过长，请精简后再转人工”并停止提交。

- [ ] **步骤 2：运行测试与构建**

运行：`node --import tsx --test src/lib/service-handoff.test.ts && npm run build`
预期：测试与 Vite 构建均通过。

### 任务 3：真实 API 验证与交付

**文件：**
- 修改：根仓库 `edits.md`

- [ ] **步骤 1：验证 API 鉴权与请求格式**

先调用真实登录 API 获取 JWT，再调用 `POST /api/user/tickets`。测试账号若已有进行中工单，接受 `success:false` 且返回已有 `ticket.id`；否则断言创建成功。请求正文使用两轮带唯一标识的测试历史，验证接口接受 `title/content` 字段且非网关错误。

- [ ] **步骤 2：记录改动并提交推送**

在根仓库 `edits.md` 记录实现与测试；提交并推送前端，再在根仓库提交更新后的 submodule 指针并清空 `edits.md`。

- [ ] **步骤 3：部署与线上复测**

运行：`python3 scripts/goploy-deploy.py --projects cwxu-algo-fronted-new`
预期：Goploy 状态为 Success。部署后重新请求线上登录与工单相关接口，确认 HTTP 200 且页面静态资源可访问。
