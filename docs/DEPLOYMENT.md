# 部署说明（索引）

日常开发流程见 [WORKFLOW.md](./WORKFLOW.md)。首次 Vercel + Neon 逐步操作见 [DEPLOYMENT_VERCEL_NEON.md](./DEPLOYMENT_VERCEL_NEON.md)。

## 架构

| 组件 | 职责 |
|------|------|
| **Vercel** | 从 GitHub 构建并托管 Next.js（App Router、Server Actions、Auth API） |
| **Neon** | 托管 PostgreSQL；应用通过 `DATABASE_URL` 连接 |
| **GitHub OAuth** | 用户登录；回调 URL 须与 `AUTH_URL` 一致 |

Vercel **不会**使用项目中的 `Dockerfile`；本地 Docker 仅用于 Postgres 或全栈验证（见 [DOCKER.md](./DOCKER.md)）。

## 必需环境变量

在 Vercel → **Settings → Environment Variables** 配置（**不要**写入 Git）：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Neon 连接串，**必须**含 `?schema=app`；生产建议 **Pooled** URL |
| `AUTH_SECRET` | 随机密钥（`openssl rand -base64 32`） |
| `AUTH_URL` | 线上站点 origin，如 `https://your-app.vercel.app`（无末尾 `/`） |
| `AUTH_TRUST_HOST` | `true`（Vercel 推荐） |
| `AUTH_GITHUB_ID` | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `NODE_ENV` | `production` |

GitHub OAuth **Authorization callback URL**：

```text
https://your-app.vercel.app/api/auth/callback/github
```

本地与线上通常使用**两个** GitHub OAuth App（callback 不同）。

## 部署后：Prisma 迁移

Vercel 构建**默认不**运行 `prisma migrate deploy`。在**本机**对 Neon 执行：

```bash
# 使用 Neon Direct 连接串（可写入临时 .env 或 export）
pnpm exec prisma migrate deploy
```

首次若缺 `app` schema，见 [DEPLOYMENT_VERCEL_NEON.md §B](./DEPLOYMENT_VERCEL_NEON.md) 的 `CREATE SCHEMA` 步骤。

## Demo 数据

- **不要**在生产 Neon 上运行 `pnpm db:seed:demo`
- Seed 脚本默认拒绝非 localhost 的 `DATABASE_URL`
- 线上 Demo 依赖用户 GitHub 登录后的**空账号**或自行录入；本地演示见 README § Demo seed

## 常见问题

### 构建失败（Vercel）

- 检查 `pnpm build` 在本地是否通过
- 确认 Vercel 使用 Node 20+ 与 pnpm（项目 `packageManager`）
- 查看 Build Logs 中 `prisma generate` / TypeScript 错误

### `DATABASE_URL` 错误 / 无法连库

- 连接串是否包含 `?schema=app`（或 `&schema=app`）
- Vercel 是否使用 Neon **Pooled** URL
- Neon 项目是否处于 suspend 状态（首次访问可能冷启动）

### 环境变量缺失

- 登录失败 / 500：检查 `AUTH_SECRET`、`AUTH_GITHUB_*`、`AUTH_URL`
- 未配置时 `/login` 会显示 setup 提示

### Auth callback URL 错误

- GitHub OAuth App 的 callback 必须与 `AUTH_URL` + `/api/auth/callback/github` **完全一致**
- `AUTH_URL` 不要带路径或 trailing slash
- Preview 部署若使用不同域名，需单独 OAuth App 或 Preview 环境变量

### 登录成功但无数据

- 本地库与 Neon **数据独立**；线上是新账号空数据属正常
- 分类需先在 `/categories` 创建

## 相关文档

- [WORKFLOW.md](./WORKFLOW.md) — 本地 vs 线上、push 流程
- [DEPLOYMENT_VERCEL_NEON.md](./DEPLOYMENT_VERCEL_NEON.md) — 首次部署详解
- [DOCKER.md](./DOCKER.md) — 本地 Postgres / 全栈
- [SCREENSHOTS.md](./SCREENSHOTS.md) — 截图与 README 占位
