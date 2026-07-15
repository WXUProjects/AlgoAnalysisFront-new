# newUI-20260715

CWXU-Algo 新前端（React + Vite + TypeScript）

## 开发

```bash
npm install
npm run dev
```

### API 反代

开发环境将 `/api` 代理到线上测试环境：

```
/api/* → https://algo.zhiyuansofts.cn/api/*
```

对应服务：

- `/api/user/*`
- `/api/core/*`
- `/api/agent/*`

API 契约见上级目录 [`../shared/api.md`](../shared/api.md)，类型与路径常量见 [`../shared/api.ts`](../shared/api.ts)。

```ts
import { endpoints } from '@shared/api'
```

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建产物 |
