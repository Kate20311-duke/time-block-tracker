# Docker — TimeBlock Tracker

Docker 支持两种用法：**仅数据库**（宿主机 `pnpm dev`）与 **app + db 全栈**（验证生产镜像）。

详细项目状态见 [PROJECT_STATUS.md](./PROJECT_STATUS.md) §19。

## 前置要求

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)（或兼容的 Docker Engine + Compose v2）
- **pnpm** 与 **Node 20+**（仅本地 `pnpm dev` 时需要；见 `.nvmrc`）

## 环境变量

从仓库根目录复制示例并填写密钥：

```bash
cp .env.example .env
```

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | 须含 `?schema=app`；宿主机用 `localhost`，容器内 app 服务用 `db` |
| `AUTH_SECRET` | 是 | `openssl rand -base64 32`，**不可为空** |
| `AUTH_URL` | 是 | 浏览器访问的应用根 URL，如 `http://localhost:3000` |
| `AUTH_TRUST_HOST` | 建议 | 本地/Docker 设为 `true` |
| `AUTH_GITHUB_ID` | 是 | GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | 是 | GitHub OAuth Client Secret |
| `NODE_ENV` | 可选 | 本地开发 `development`；Compose `app` 服务为 `production` |

凭证须与 `docker-compose.yml` 中 `db` 的 `POSTGRES_*` 一致（默认用户 `timeblock`，库 `timeblock_db`）。**勿将真实生产密码写入仓库。**

### GitHub OAuth callback URL

在 [GitHub Developer Settings](https://github.com/settings/developers) 中，OAuth App 的 **Authorization callback URL** 为：

```text
http://localhost:3000/api/auth/callback/github
```

若将 `app` 映射到其他宿主机端口（例如 `3001:3000`），须同时修改 `AUTH_URL` 与 GitHub App 中的 callback URL。

## 方式一：仅启动数据库（推荐日常开发）

```bash
docker compose up -d db
```

`.env` 使用宿主机连接串（见 `.env.example`）：

```text
postgresql://timeblock:timeblock_password@localhost:5432/timeblock_db?schema=app
```

### Prisma

```bash
pnpm exec prisma generate
pnpm exec prisma migrate dev    # 开发新迁移
# 或
pnpm exec prisma migrate deploy # 仅应用已有迁移
```

首次连接空库时，若迁移报错缺少 schema，可一次性执行：

```bash
node -e "require('dotenv/config');const{Pool}=require('pg');(async()=>{const p=new Pool({connectionString:process.env.DATABASE_URL});await p.query('CREATE SCHEMA IF NOT EXISTS app');await p.end();console.log('Schema app ready')})()"
```

### 启动开发服务器

```bash
pnpm dev
```

打开 http://localhost:3000 。

### 停止数据库

```bash
docker compose down
```

### 清空数据库 volume（危险）

会**永久删除**本地 PostgreSQL 数据：

```bash
docker compose down -v
```

仅在确认可丢弃全部本地数据时使用。

## 方式二：app + db 全栈（容器化验证）

确保 `.env` 已配置 `AUTH_SECRET` 与 GitHub OAuth（`env_file` 会注入容器；`DATABASE_URL` 由 compose 覆盖为 `@db`）。

```bash
docker compose build app
docker compose up -d db
docker compose up app
```

或后台启动：

```bash
docker compose up -d
```

应用入口：http://localhost:3000 。

容器启动时 [`scripts/docker-entrypoint.sh`](../scripts/docker-entrypoint.sh) 会：

1. 确保 `app` schema 存在（`CREATE SCHEMA IF NOT EXISTS app`）
2. 通过镜像内 `/app/prisma-cli/node_modules` 运行 `prisma migrate deploy`（`NODE_PATH` 解析 `prisma.config.ts`）
3. 启动 Next.js standalone（`node server.js`，`0.0.0.0:3000`）

镜像构建使用 **Node 20** + **pnpm 10.28.1**（Dockerfile 内 pin；避免 corepack 默认 pnpm 11.5 要求 Node 22+）。

**无业务 seed**，不会预置共享分类或时间块。

## 常用命令

| 操作 | 命令 |
|------|------|
| 校验 Compose 配置 | `docker compose config` |
| 查看日志 | `docker compose logs -f db` / `docker compose logs -f app` |
| 重建 app 镜像 | `docker compose build --no-cache app` |
| 停止全部服务 | `docker compose down` |

## 常见问题

### DATABASE_URL 错误

- 宿主机 `pnpm dev`：主机名必须是 **`localhost`**，端口 **5432**。
- `app` 容器：主机名必须是 **`db`**（Compose 服务名），不是 `localhost`。
- 连接串必须包含 **`?schema=app`**。

### 端口 5432 被占用

修改 `docker-compose.yml` 中 `db.ports` 映射（例如 `"5433:5432"`），并同步更新 `.env` 中的端口。

### Prisma 连接失败

1. 确认 `docker compose up -d db` 且 `docker compose ps` 显示 db healthy。
2. 运行 `pnpm exec prisma migrate deploy` 或 `migrate dev`。
3. 检查用户名/密码/库名是否与 Compose 一致。

### GitHub OAuth callback 配置错误

- `AUTH_URL` 与浏览器地址栏 origin 一致。
- GitHub App callback 为 `{AUTH_URL}/api/auth/callback/github`。
- `AUTH_SECRET` 非空。

### `AUTH_SECRET` 为空

Auth.js 会报 `MissingSecret`。在 `.env` 中设置非空 `AUTH_SECRET`。

### 迁移失败（已有旧 Category 无 userId）

开发库可手动确认后执行 `pnpm exec prisma migrate reset`（**清空全部数据**）。生产/Sealos 勿随意 reset。

## Sealos 部署前准备（Phase 8）

- 将 `docker compose build app` 产物推送到镜像仓库
- 托管 PostgreSQL 或外部实例，`DATABASE_URL` 含 `?schema=app`
- 在 Sealos 配置与线上一致的 `AUTH_*`、域名、`AUTH_TRUST_HOST`
- GitHub OAuth 生产 callback：`https://<your-domain>/api/auth/callback/github`
- 迁移：`prisma migrate deploy`（启动 Job 或沿用 entrypoint 策略）
