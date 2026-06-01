## TimeBlock Tracker

个人时间块日历与时间追踪 Web 应用（Next.js + Prisma + PostgreSQL + Auth.js）。

## 开发与部署

**日常流程：本地开发 → Git push → Vercel 自动上线。** 完整说明见 **[docs/WORKFLOW.md](docs/WORKFLOW.md)**。

| 场景 | 做法 |
|------|------|
| **本地开发** | Docker 数据库 + `pnpm dev`（不消耗 Neon/Vercel 额度） |
| **部署上线** | Vercel + Neon（见 [DEPLOYMENT_VERCEL_NEON.md](docs/DEPLOYMENT_VERCEL_NEON.md)） |
| **Docker 全栈** | 可选，见 [DOCKER.md](docs/DOCKER.md) |

## 快速开始（本地）

1. `nvm use && pnpm install`
2. `docker compose up -d db`
3. `cp .env.example .env` — 填写 `AUTH_SECRET` 与 **本地** GitHub OAuth
4. `pnpm exec prisma generate && pnpm exec prisma migrate deploy`
5. `pnpm dev` → http://localhost:3000

## 常用检查

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 文档

- [docs/WORKFLOW.md](docs/WORKFLOW.md) — **开发与部署流程（推荐阅读）**
- [docs/DEPLOYMENT_VERCEL_NEON.md](docs/DEPLOYMENT_VERCEL_NEON.md) — Vercel + Neon 首次部署
- [docs/DOCKER.md](docs/DOCKER.md) — Docker 数据库 / 全栈 / Sealos
- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — 阶段与功能状态
- [docs/AI_CONTEXT.md](docs/AI_CONTEXT.md) — AI 会话上下文

## Notes

- `pnpm-workspace.yaml` 含 `allowBuilds`（pnpm v11 配置）。
- 本地 OAuth callback：`http://localhost:3000/api/auth/callback/github`；线上见 WORKFLOW.md。
