## TimeBlock Tracker

个人时间块日历与时间追踪 Web 应用（Next.js + Prisma + PostgreSQL + Auth.js）。

## 快速开始

完整 Docker 与数据库说明见 **[docs/DOCKER.md](docs/DOCKER.md)**。

### 本地开发（推荐）

1. `nvm use && pnpm install`
2. `docker compose up -d db`
3. `cp .env.example .env` — 填写 `AUTH_SECRET` 与 GitHub OAuth
4. `pnpm exec prisma generate && pnpm exec prisma migrate deploy`
5. `pnpm dev` → http://localhost:3000

### 常用检查

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 文档

- [docs/DOCKER.md](docs/DOCKER.md) — Docker 数据库 / 全栈运行
- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — 阶段与功能状态
- [docs/AI_CONTEXT.md](docs/AI_CONTEXT.md) — AI 会话上下文

## Notes

- `pnpm-workspace.yaml` 含 `allowBuilds`（pnpm v11 配置）。
- GitHub OAuth callback：`http://localhost:3000/api/auth/callback/github`（端口变更须同步 `AUTH_URL`）。
