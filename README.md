# TimeBlock Tracker

个人时间块日历与时间追踪 Web 应用：在日历上规划时间块、按分类记录、正计时/番茄钟专注，并在 Dashboard 与 Review 中复盘每周成果。

**线上 Demo：** `<!-- your-demo-url -->`（部署后替换此占位）

## 功能

- **时间块日历** — 日/周视图，拖拽与空白创建（用户时区）
- **分类管理** — 颜色分组，关联时间块与专注会话
- **正计时 / 番茄钟** — Focus 页计时，秒表结束可保存为时间块
- **Dashboard** — 今日/本周记录时长、图表、快速开始
- **Review** — 日/周复盘与完成状态分布
- **GitHub 登录** — Auth.js，数据按用户隔离

## 技术栈

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 · PostgreSQL (`app` schema) · Auth.js v5 · Recharts · Vitest · pnpm

## 本地运行

```bash
nvm use && pnpm install
docker compose up -d db
cp .env.example .env   # 填写 AUTH_* 与本地 GitHub OAuth
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm dev               # http://localhost:3000
```

### 环境变量

见 [`.env.example`](.env.example)。必填：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL，须含 `?schema=app` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | 本地 `http://localhost:3000` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App |

OAuth 回调：`http://localhost:3000/api/auth/callback/github`

### 数据库迁移

```bash
pnpm exec prisma migrate deploy   # 生产/Neon
pnpm exec prisma migrate dev      # 本地开发新迁移
```

## Demo seed（仅本地） {#demo-seed}

用于给朋友或截图展示时快速填充示例数据。**不要对 Neon 生产库运行**（除非明确 `DEMO_SEED=1`）。

1. 本地 `pnpm dev` 并用 GitHub **登录一次**（创建 User 行）
2. 在 `.env` 设置 `DEMO_SEED_USER_EMAIL=你的GitHub邮箱`
3. 运行：

```bash
pnpm db:seed:demo
```

将创建 5 个中文演示分类（学习 / 工作 / 休息 / 运动 / 娱乐）、最近一周 TimeBlocks 与若干 FocusSessions，描述均含 `[Demo]` 标记。

- 默认仅允许 `localhost` 的 `DATABASE_URL`
- 重新填充：`DEMO_SEED_FORCE=1 pnpm db:seed:demo`
- **不会**在 Vercel build 中自动执行

## 测试

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 部署

| 组件 | 作用 |
|------|------|
| **Vercel** | 构建并托管 Next.js |
| **Neon** | PostgreSQL |

快速索引：[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)  
逐步指南：[docs/DEPLOYMENT_VERCEL_NEON.md](docs/DEPLOYMENT_VERCEL_NEON.md)  
日常流程：[docs/WORKFLOW.md](docs/WORKFLOW.md)

部署后在本机对 Neon 执行一次 `pnpm exec prisma migrate deploy`（不要依赖 Vercel 构建自动迁移）。

## 截图

将截图放入 `public/screenshots/`，详见 [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md)。

<!-- Add dashboard screenshot: public/screenshots/dashboard.png -->

<!-- Add focus screenshot: public/screenshots/focus.png -->

<!-- Add calendar screenshot: public/screenshots/calendar.png -->

<!-- Add review screenshot: public/screenshots/review.png -->

## 文档

| 文档 | 内容 |
|------|------|
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | 本地开发 → push → Vercel |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 部署索引与 FAQ |
| [docs/DEPLOYMENT_VERCEL_NEON.md](docs/DEPLOYMENT_VERCEL_NEON.md) | Vercel + Neon 首次部署 |
| [docs/DOCKER.md](docs/DOCKER.md) | Docker 数据库 / 全栈 |
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | 阶段与功能状态 |
| [docs/AI_CONTEXT.md](docs/AI_CONTEXT.md) | AI 会话上下文 |
| [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) | 截图指南 |

## Notes

- `pnpm-workspace.yaml` 含 `allowBuilds`（pnpm v11）。
- 未登录访问 `/` 为产品 Landing；已登录自动进入 `/dashboard`。
