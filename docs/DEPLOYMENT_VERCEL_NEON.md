# 部署指南：Vercel + Neon PostgreSQL（Phase 8A）

面向初学者的**首次部署**步骤。日常「先本地开发、再 push 上线」见 **[WORKFLOW.md](./WORKFLOW.md)**。

本文**不删除** Phase 7 的 Docker 文件；本地仍可用 `docker compose up -d db` + `pnpm dev`。

## A. 概览

| 组件 | 作用 |
|------|------|
| **Vercel** | 从 GitHub 拉代码，执行 `pnpm install` + `pnpm build`，托管 Next.js（App Router、Server Actions、Auth.js API） |
| **Neon** | 托管 PostgreSQL；应用通过 `DATABASE_URL` 连接 |
| **GitHub OAuth** | 登录；回调地址须与线上 `AUTH_URL` 一致 |

**为什么 Vercel 路径不用 Docker？**  
Vercel 使用自己的构建与 Serverless/Edge 运行时，直接构建 Next.js 项目，**不会**读取 `Dockerfile` 或 `docker-compose.yml`。

**Docker 仍然有用：**

- 本地开发：`docker compose up -d db` 启动 Postgres
- 完整容器验证：`docker compose up app`（Phase 7）
- 未来 **Phase 8B**：Sealos 等仍可用 Docker 镜像部署

---

## B. Neon 设置

### 1. 创建 Neon 项目

1. 打开 [https://neon.tech](https://neon.tech) 并注册/登录  
2. **New Project**，选择区域（离用户近即可）  
3. 记下自动创建的 **数据库名**（默认常为 `neondb`）

### 2. 复制连接字符串

在 Neon 控制台 → **Connection details** → 选择 **PostgreSQL**。

Neon 通常提供两种 URL：

| 类型 | 用途 |
|------|------|
| **Direct** | 本地跑 `prisma migrate deploy` |
| **Pooled**（带 `-pooler` 或 PgBouncer） | **推荐用于 Vercel 生产环境变量**（Serverless 友好） |

### 3. 添加 `?schema=app`

本项目 Prisma 只管理 **`app` schema**（见 `prisma/schema.prisma` 中 `schemas = ["app"]`）。  
连接串**必须**包含：

```text
?schema=app
```

若 Neon URL 已有查询参数，用 `&schema=app` 追加。

**示例（占位符，勿直接使用）：**

```text
postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require&schema=app
```

### 4. 保存为 `DATABASE_URL`

- 本地临时迁移：写入终端环境或 `.env`（**不要提交**）  
- Vercel：在 Project → **Settings → Environment Variables** 添加 `DATABASE_URL`（Production / Preview / Development 按需勾选）

---

## C. 本地对 Neon 执行迁移（推荐在首次 Vercel 部署前）

迁移**不要**依赖 Vercel 自动构建；请在本机**手动**对 Neon 执行一次。

### 1. 确保 `app` schema 存在（首次）

Neon 新库可能没有 `app` schema。一次性执行（将 `DATABASE_URL` 换成 Neon **Direct** 连接串）：

```bash
node -e "require('dotenv/config');const{Pool}=require('pg');(async()=>{const p=new Pool({connectionString:process.env.DATABASE_URL});await p.query('CREATE SCHEMA IF NOT EXISTS app');await p.end();console.log('Schema app ready')})()"
```

或先在 `.env` 里临时改成 Neon 的 URL，再运行上述命令。

### 2. 应用迁移

```bash
# 临时使用 Neon Direct URL（含 ?schema=app）
export DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require&schema=app"

pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

Windows PowerShell：

```powershell
$env:DATABASE_URL="postgresql://..."
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

### 3. 验证

```bash
pnpm exec prisma migrate status
```

应显示所有迁移已应用。完成后可将 `.env` 的 `DATABASE_URL` 改回本地 Docker 地址，本地开发不受影响。

**注意：** 若库中曾有 Phase 6 之前无 `userId` 的旧 Category 数据，迁移可能失败；Neon 新空库一般无此问题。

---

## D. GitHub OAuth 配置

1. 打开 [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers)  
2. 编辑现有 App 或 **New OAuth App**  
3. 填写：

| 字段 | 值 |
|------|-----|
| **Application name** | 任意，如 `TimeBlock Tracker` |
| **Homepage URL** | `https://<your-vercel-domain>` |
| **Authorization callback URL** | `https://<your-vercel-domain>/api/auth/callback/github` |

**Vercel 默认域名示例：**

```text
Homepage:  https://time-block-tracker.vercel.app
Callback:  https://time-block-tracker.vercel.app/api/auth/callback/github
```

**自定义域名后**，在 GitHub App 中**再添加一条** callback（GitHub 允许多个 callback 时逐条添加；或更新为生产域名）：

```text
https://<custom-domain>/api/auth/callback/github
```

同时把 Vercel 环境变量 **`AUTH_URL`** 改为与浏览器访问一致的 origin（含 `https://`，无末尾 `/`）。

复制 **Client ID** → `AUTH_GITHUB_ID`，**Client Secret** → `AUTH_GITHUB_SECRET`（写入 Vercel，勿提交仓库）。

---

## E. Vercel 设置

### 1. 导入仓库

1. [https://vercel.com](https://vercel.com) → **Add New → Project**  
2. 导入 GitHub 仓库 `time-block-tracker`（或你的 fork）

### 2. 框架与构建（一般自动检测）

| 项 | 推荐值 |
|----|--------|
| Framework Preset | **Next.js** |
| Root Directory | `.`（仓库根目录） |
| Build Command | `pnpm run build`（默认；已含 `prisma generate && next build`） |
| Install Command | `pnpm install`（存在 `pnpm-lock.yaml` 时 Vercel 自动用 pnpm） |
| Output Directory | 留空（Next.js 默认） |

**不要**在 Build Command 里加 `prisma migrate deploy`（避免每次部署都跑迁移；迁移请按 §C 手动执行）。

### 3. 环境变量

在首次 **Deploy** 前添加 §F 表中所有必填项。  
**`DATABASE_URL` 必须在第一次构建前就存在**，否则 `prisma generate` 可能因 `prisma.config.ts` 读取 `env("DATABASE_URL")` 而失败。

### 4. 部署

点击 **Deploy**，等待构建完成。访问 Vercel 提供的 `*.vercel.app` 域名。

### 5. 部署后

- 打开 `/login` → **使用 GitHub 登录**  
- 若 OAuth 报错，检查 §D 与 `AUTH_URL`  
- 创建分类/时间块，刷新页面确认数据持久化  

---

## F. 环境变量清单

变量名以**当前代码**为准（见 `src/auth.ts`、`.env.example`）。**不要**在文档或 Git 中写入真实密钥。

| 变量 | 示例值 | 来源 | 必填 | 说明 |
|------|--------|------|------|------|
| `DATABASE_URL` | `postgresql://...@ep-xxx-pooler.../neondb?sslmode=require&schema=app` | Neon 控制台 | **是** | 生产建议 **Pooled** URL；必须含 `schema=app` |
| `AUTH_SECRET` | `（openssl rand -base64 32 生成）` | 自行生成 | **是** | 不可为空 |
| `AUTH_URL` | `https://your-app.vercel.app` | 你的线上域名 | **是** | 与浏览器地址栏 origin 一致；**不是** `NEXTAUTH_URL` |
| `AUTH_TRUST_HOST` | `true` | 固定 | **建议** | Vercel 反向代理后 Auth.js 需要 |
| `AUTH_GITHUB_ID` | `Ov23li...` | GitHub OAuth App | **是** | Client ID |
| `AUTH_GITHUB_SECRET` | `（GitHub 生成）` | GitHub OAuth App | **是** | Client Secret |
| `NODE_ENV` | `production` | Vercel 自动 | 否 | Vercel Production 会自动设置 |

本地 `.env.example` 仍使用 `http://localhost:3000`；**Vercel 上必须改为 https 生产域名**。

---

## G. 部署后测试清单

- [ ] 首页 `/` 可访问（无需登录）  
- [ ] `/login` 显示「使用 GitHub 登录」按钮（非黄色配置提示）  
- [ ] GitHub 授权后进入 `/dashboard`  
- [ ] `/categories` 可创建分类  
- [ ] `/time-blocks` 可创建时间块  
- [ ] `/calendar` 可查看日历  
- [ ] `/focus` 专注页可用  
- [ ] `/review/day`、`/review/week` 可打开  
- [ ] 刷新页面后数据仍在（Neon 持久化）  
- [ ] 未登录访问 `/dashboard` → 重定向 `/login`  
- [ ] （可选）两个 GitHub 账号：B 看不到 A 的数据（Phase 6 隔离）  

---

## H. 故障排查

### Prisma Client 未生成 / build 失败

- 确认 Build Command 为 `pnpm run build`（内含 `prisma generate`）  
- 确认 Vercel 已安装 devDependencies（默认会，以便使用 `prisma` CLI）  
- 确认 **`DATABASE_URL` 已在 Vercel 环境变量中设置**（构建阶段需要）

### `DATABASE_URL` missing / PrismaConfigEnvError

- 在 Vercel → Settings → Environment Variables 添加 `DATABASE_URL`  
- 重新 **Redeploy**

### 数据库 schema 未迁移 / 表不存在

- 在本机对 Neon 执行 §C：`CREATE SCHEMA IF NOT EXISTS app` + `pnpm exec prisma migrate deploy`  
- 确认 URL 含 `?schema=app`

### GitHub OAuth：`redirect_uri is not associated`

- GitHub App 的 **Authorization callback URL** 必须 exactly：  
  `https://<AUTH_URL 的 host>/api/auth/callback/github`  
- `AUTH_URL` 与浏览器访问域名一致（`https`，不要用 `http` 生产域名）

### `AUTH_URL` / 登录后跳错域名

- Vercel 上 `AUTH_URL` 设为 `https://xxx.vercel.app`（无路径、无末尾 `/`）  
- 代码使用 **`AUTH_URL`**，不是 `NEXTAUTH_URL`

### Auth trust host / Configuration 错误

- 设置 `AUTH_TRUST_HOST=true`

### `AUTH_SECRET` 为空

- 生成并填入 Vercel；本地同理

### Serverless 数据库连接过多 / 超时

- 将 Vercel 的 `DATABASE_URL` 改为 Neon **Pooled** 连接串（pooler 主机名）  
- 避免在 Serverless 上使用未池化的 Direct 连接高并发访问  
- 若仍不稳定，Phase 8B 可考虑 Sealos 长连接或改用 Neon serverless driver（需代码改动，非本阶段范围）

### 构建警告：`middleware` → `proxy`

- Next.js 16 可能提示 middleware 将更名为 proxy；**当前仍使用 `src/middleware.ts`**，一般**不阻止** Vercel 部署

---

## I. 回滚与安全

- **本地开发不受影响**：继续 `docker compose up -d db` + 本地 `.env` + `pnpm dev`  
- **Vercel 部署失败**：修复环境变量或迁移后 Redeploy；本地 Docker  workflow 不变  
- **勿提交** `.env`、Neon 密码、GitHub Secret 到 Git  
- **Neon 与本地 Docker 是不同数据库**；线上数据与本地数据互不同步，除非故意指向同一 URL  

---

## 相关文档

- **开发与部署流程**：[WORKFLOW.md](./WORKFLOW.md)  
- 本地 Docker：[DOCKER.md](./DOCKER.md)  
- 项目状态：[PROJECT_STATUS.md](./PROJECT_STATUS.md) §20  
- AI 上下文：[AI_CONTEXT.md](./AI_CONTEXT.md)
