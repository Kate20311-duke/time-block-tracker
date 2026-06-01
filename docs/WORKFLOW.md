# 开发与部署流程

本文说明：**日常在本地开发**、**如何部署到线上**，以及两套环境如何分工。  
首次部署 Vercel + Neon 的逐步操作见 [DEPLOYMENT_VERCEL_NEON.md](./DEPLOYMENT_VERCEL_NEON.md)；本地 Docker 数据库见 [DOCKER.md](./DOCKER.md)。

---

## 1. 两套环境（先建立这个心智模型）

```text
┌─────────────────────────────┐         ┌──────────────────────────────┐
│ 本地（你的电脑）              │         │ 线上（云端）                   │
├─────────────────────────────┤         ├──────────────────────────────┤
│ Git 改代码                   │  push   │ Vercel 构建 & 托管 Next.js   │
│ docker compose → Postgres   │ ──────► │ Neon 托管 PostgreSQL         │
│ pnpm dev → localhost:3000   │         │ https://xxx.vercel.app       │
│ .env（不提交 Git）           │         │ Vercel 环境变量               │
└─────────────────────────────┘         └──────────────────────────────┘
```

| | 本地开发 | 线上生产 |
|--|----------|----------|
| **网站** | `http://localhost:3000` | `https://<项目>.vercel.app` |
| **数据库** | Docker Postgres（`localhost:5432`） | Neon |
| **配置位置** | 项目根目录 `.env` | Vercel → Settings → Environment Variables |
| **GitHub OAuth** | 本地 OAuth App（callback → localhost） | 生产 OAuth App（callback → vercel.app） |
| **数据** | 存在本地 Docker 卷里 | 存在 Neon 里 |

**重要：本地库和 Neon 是两套数据，互不同步。** 本地建的分类不会自动出现在线上，反之亦然。

---

## 2. 部署方式概览

本项目支持 **三条路径**（可同时存在，不冲突）：

| 路径 | 何时使用 | 文档 |
|------|----------|------|
| **本地开发** | 日常改代码、调试（**默认**） | 本文 §3、[DOCKER.md](./DOCKER.md) |
| **Vercel + Neon** | 公网网址、给别人用 GitHub 登录 | [DEPLOYMENT_VERCEL_NEON.md](./DEPLOYMENT_VERCEL_NEON.md) |
| **Docker 全栈 / Sealos** | 容器验证；未来 Phase 8B 自建/Sealos | [DOCKER.md](./DOCKER.md) |

**推荐组合：**

- 开发：`docker compose up -d db` + `pnpm dev`
- 上线：Git push → Vercel 自动部署 + Neon 数据库

Vercel **不会**使用 `Dockerfile`；Docker 文件保留给本地 DB 与未来 Sealos。

---

## 3. 日常本地开发（不消耗 Neon / Vercel 运行额度）

### 3.1 前置（首次或换电脑）

```bash
nvm use && pnpm install
cp .env.example .env    # 填写 AUTH_SECRET、本地 GitHub OAuth
docker compose up -d db
pnpm exec prisma generate
pnpm exec prisma migrate deploy   # 或 migrate dev
```

### 3.2 每次开发

```bash
docker compose up -d db    # 若数据库未启动
pnpm dev                   # http://localhost:3000
```

### 3.3 `.env` 应指向本地（不要长期改成 Neon）

```text
DATABASE_URL="postgresql://timeblock:timeblock_password@localhost:5432/timeblock_db?schema=app"
AUTH_URL="http://localhost:3000"
AUTH_GITHUB_ID / AUTH_GITHUB_SECRET  → 本地 OAuth App
```

### 3.4 改完代码后（可选自检）

```bash
pnpm test
pnpm typecheck
pnpm build
```

### 3.5 什么 **不会** 扣云端免费额度

| 操作 | Neon | Vercel |
|------|------|--------|
| `pnpm dev` + Docker 数据库 | ❌ | ❌ |
| 本地 `pnpm test` / `pnpm build` | ❌ | ❌ |
| 在 localhost 登录、建数据 | ❌ | ❌ |

---

## 4. 部署上线流程（先本地验证，再 push）

### 4.1 典型一次迭代

```text
1. 本地 docker compose up -d db
2. pnpm dev — 改功能、自测
3. （若改了 prisma/schema）本地 pnpm exec prisma migrate dev
4. pnpm test && pnpm build
5. git commit && git push origin main
6. Vercel 自动构建部署（watch Deployments 日志）
7. （若有新 migration）对 Neon 手动 migrate deploy — 见 §5
8. 打开线上 URL，抽测 /login、建分类、刷新
```

### 4.2 什么 **会** 消耗免费额度

| 操作 | Neon | Vercel |
|------|------|--------|
| 用户访问 `https://xxx.vercel.app` | ✅（App 连库） | ✅（带宽、函数调用） |
| 每次 `git push` 触发部署 | ❌ | ✅（构建分钟） |
| 本机对 Neon 跑 `migrate deploy` | ✅（很短） | ❌ |

Neon 免费档参考（以控制台为准）：约 **100 CU-hours/月**、**0.5 GB 存储**、**5 GB 出站流量**。  
Vercel Hobby：约 **100 GB 带宽/月**、**100 万次函数调用/月** 等；仅限**个人非商业**用途。

---

## 5. 数据库迁移（有 schema 变更时）

**顺序：本地先测通 → 提交 migration 文件 → push → 再对 Neon 执行 deploy。**

### 5.1 本地（开发新迁移）

```bash
pnpm exec prisma migrate dev
```

数据写在 **Docker Postgres**。

### 5.2 线上 Neon（push 之后）

**不要**改 `.env` 长期指向 Neon；在终端临时设置：

```bash
export DATABASE_URL="postgresql://...@ep-xxx.region.aws.neon.tech/neondb?sslmode=require&schema=app"
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
```

Windows PowerShell：`$env:DATABASE_URL="..."`

- 迁移用 Neon **Direct** 连接串即可  
- Vercel 环境变量里的 `DATABASE_URL` 建议用 Neon **Pooled**（`-pooler`）  
- 连接串必须含 `schema=app`

**Vercel 构建不会自动跑 `migrate deploy`**（项目刻意如此，避免每次 deploy 都改库）。

---

## 6. 环境变量对照表

| 变量 | 本地 `.env` | Vercel 生产 |
|------|-------------|-------------|
| `DATABASE_URL` | `localhost` + Docker | Neon Pooled + `&schema=app` |
| `AUTH_URL` | `http://localhost:3000` | `https://xxx.vercel.app` |
| `AUTH_SECRET` | 自行生成 | 可另生成一份 |
| `AUTH_TRUST_HOST` | `true` | `true` |
| `AUTH_GITHUB_ID` | 本地 OAuth App | 生产 OAuth App |
| `AUTH_GITHUB_SECRET` | 本地 OAuth App | 生产 OAuth App |

- **勿**将 `.env` 提交到 Git  
- 修改 Vercel 环境变量后需 **Redeploy** 才生效  

GitHub OAuth callback：

- 本地：`http://localhost:3000/api/auth/callback/github`  
- 线上：`https://<域名>/api/auth/callback/github`  

建议 **两个 OAuth App**（本地一个、生产一个），避免 callback 互相覆盖。

---

## 7. 别人如何使用

1. 你分享 **Vercel 网址**（如 `https://time-block-tracker.vercel.app`）  
2. 对方打开 → `/login` → **用自己的 GitHub** 登录  
3. 首次登录自动创建账号；数据在 **Neon 线上库**，按用户隔离（Phase 6）  
4. 对方 **不需要** clone 仓库，除非要自己开发  

---

## 8. 快速命令备忘

### 本地开发

```bash
docker compose up -d db
pnpm dev
```

### 提交上线

```bash
pnpm test && git push origin main
# Vercel 自动部署；有 migration 时再对 Neon 执行 migrate deploy
```

### 对 Neon 迁移（临时）

```bash
export DATABASE_URL="Neon Direct URL&schema=app"
pnpm exec prisma migrate deploy
```

### 本地停库

```bash
docker compose down
```

---

## 9. 常见问题

**Q：开发时要不要把 `.env` 的 `DATABASE_URL` 换成 Neon？**  
A：**不要**（日常开发）。只有跑 `migrate deploy` 时临时 `export` 即可。

**Q：本地数据怎么同步到线上？**  
A：没有自动同步。个人项目通常接受「本地测试数据 / 线上真实数据」分开；必要时手动在线上重新录入。

**Q：push 后线上报错缺表？**  
A：对新 migration 执行 §5.2 的 `migrate deploy`。

**Q：OAuth `redirect_uri` 错误？**  
A：检查 GitHub App callback 是否与 `AUTH_URL` 的 origin 一致（本地用 http + localhost，线上用 https + vercel 域名）。

---

## 10. 相关文档

| 文档 | 内容 |
|------|------|
| [DEPLOYMENT_VERCEL_NEON.md](./DEPLOYMENT_VERCEL_NEON.md) | Neon / GitHub / Vercel 首次部署逐步说明 |
| [DOCKER.md](./DOCKER.md) | Docker 数据库、全栈容器、Sealos 预备 |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 功能阶段与项目状态 |
| [.env.example](../.env.example) | 环境变量模板 |
