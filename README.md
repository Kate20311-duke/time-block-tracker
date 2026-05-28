## TimeBlock Tracker

个人时间块日历与时间追踪 Web 应用（Next.js + Prisma + PostgreSQL）。

## Getting Started

### 本地开发（Mac + Docker PostgreSQL）

#### 前置条件

- Node.js：建议使用 `.nvmrc` 指定版本（推荐 `nvm use`）
- pnpm：项目使用 pnpm
- Docker Desktop：用于本地 PostgreSQL

#### 1) 安装依赖

```bash
pnpm install
```

#### 2) 启动数据库（Docker）

```bash
docker compose up -d
```

停止数据库：

```bash
docker compose down
```

不要随便使用：

```bash
docker compose down -v
```

因为这会删除本地数据库 volume 与数据。

#### 3) 配置环境变量

```bash
cp .env.example .env
```

`.env` 里需要配置 `DATABASE_URL`（示例见 `.env.example`），并确保包含 `?schema=app`。

#### 4) 生成 Prisma Client

```bash
pnpm prisma generate
```

#### 5) 运行 migration

```bash
pnpm prisma migrate dev
```

#### 6) 启动开发服务器

```bash
pnpm dev
```

打开 `http://localhost:3000`。

### 常用检查命令

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Notes

- 本项目的 `pnpm-workspace.yaml` 中包含 `allowBuilds` 等配置（pnpm v11 不再读取 `package.json` 的 `"pnpm"` 字段）。

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
