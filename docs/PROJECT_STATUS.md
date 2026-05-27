# TimeBlock Tracker — 项目状态

## 1. 项目名称

**TimeBlock Tracker** — 个人时间块日历与时间追踪 Web 应用

## 2. 当前阶段

**Phase 2：基础日历视图（进行中）**

- **Phase 1：已完成** — 数据模型、分类/时间块 CRUD、Dashboard、导航、i18n、测试
- **已完成子步骤**
  - **Day View MVP（日视图）** — 已手动验证
  - **Week View（周视图）** — 已手动验证
- **建议下一子步骤**
  - 日历事件详情增强（块上展示更多字段 / 悬停详情）
  - 可选：从日历块链接到 `/time-blocks` 对应记录的查看或编辑

## 3. 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16（App Router） |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4 |
| ORM | Prisma 7（`@prisma/adapter-pg` + `pg`） |
| 数据库 | PostgreSQL（schema `app`） |
| 包管理 | pnpm |
| Node | **20.19+**（见 `.nvmrc`） |
| 测试 | Vitest + Testing Library |

## 4. Phase 1 已完成功能

- [x] Prisma 模型：`Category`、`TimeBlock`（一对多，`onDelete: Restrict`）
- [x] 可复用 Prisma Client（`src/lib/prisma.ts`，开发环境单例）
- [x] **分类 CRUD**：创建 / 列表 / 编辑 / 删除（有关联时间块时禁止删除）
- [x] **时间块 CRUD**：创建 / 列表 / 编辑 / 删除（列表视图）
- [x] 表单校验（标题、分类、时间范围、状态、完成度 0–100）
- [x] **Dashboard**：基础数字概览 + 按分类汇总时长（无图表）
- [x] **导航**：全局顶栏（`AppNav`）+ 首页快速入口
- [x] 时间工具（`src/lib/time.ts`）、校验纯函数（`src/lib/validation.ts`）
- [x] Server Actions（`src/lib/actions/categories.ts`、`time-blocks.ts`）
- [x] Vitest 单元/组件测试
- [x] **中英双语 UI**：默认中文，顶栏语言切换（`zh` / `en`）
- [x] `.env.example`、`.nvmrc`、`prisma/migrations`

## 5. Phase 2 — 日历视图

### 5.1 URL 与查询参数

| 参数 | 说明 |
|------|------|
| `?date=YYYY-MM-DD` | **锚定日期**（本地时区）。无效或缺失时回退到**今天** 00:00。日视图显示该日；周视图显示**包含该日**的那一周。 |
| `?view=day` | **日视图** — 单列 24 小时网格。 |
| `?view=week` | **周视图**（与默认相同）。 |
| （无 `view`） | **默认周视图**。 |

示例：

| URL | 行为 |
|-----|------|
| `/calendar` | 周视图，锚定今天 |
| `/calendar?date=2026-05-21` | 周视图，含 5/21 的那一周（周一 5/18 – 周日 5/24） |
| `/calendar?date=2026-05-21&view=day` | 日视图，仅 5/21 |
| `/calendar?view=week` | 周视图，锚定今天 |

导航链接由 `buildCalendarHref(date, view)` 生成：日视图带 `view=day`；周视图省略 `view`（默认 week）。

### 5.2 周范围计算（周一为一周起点）

- `startOfWeekMonday(anchor)`：锚定日所在周的 **周一 00:00**（本地）。
- `endOfWeekMonday(anchor)`：下周一 00:00（**不含**，用于查询上界）。
- `getWeekDays(weekStart)`：返回周一至周日共 **7** 天。
- 周导航：`addCalendarWeeks(anchor, ±1)` 将锚定日移动 ±7 天（基于当周周一）。

Prisma 周查询：`startTime < weekEnd && endTime > weekStart`（`getWeekQueryRange`）。

### 5.3 跨天 TimeBlock 显示

- 每条记录在**每个有交集的日历日**单独渲染一块。
- `layoutBlockInDay(block, day)` 将 `startTime`/`endTime` **裁剪**到该日 `[00:00, 24:00)`，计算 `topPercent` / `heightPercent`。
- 周视图中同一 `TimeBlock` 在多天出现时使用不同 React key（`{id}-{YYYY-MM-DD}`）。
- 示例：周一 22:00 – 周二 02:00 → 周一列显示 22:00–24:00，周二列显示 00:00–02:00。

### 5.4 Day View MVP（已完成）

- [x] `/calendar` + `?view=day` — 24 小时单列网格
- [x] 前一天 / 今天 / 后一天导航
- [x] `calendar-day-grid.tsx` + `calendar-block.tsx`（后抽取 `calendar-day-column.tsx`）
- [x] 分类颜色、跨天裁剪、空状态、i18n、`revalidatePath("/calendar")`
- [x] i18n 服务端边界：`getLocale()` → `src/lib/i18n/server.ts`

### 5.5 Week View（已完成）

- [x] **默认周视图** — 7 列（周一至周日），共享左侧小时刻度
- [x] **视图切换** — 顶栏「周视图 | 日视图」
- [x] **周导航** — 上一周 / 本周 / 下一周
- [x] **列头** — 点击某天 → 该日 `view=day`
- [x] `calendar-week-grid.tsx` + 复用 `calendar-day-column.tsx`（`compact` 模式，列内仅标题）
- [x] 窄屏：`overflow-x-auto` + `min-w-[640px]` 横向滚动
- [x] 空周仍渲染 7 列网格 + `emptyWeek` 文案

### 5.6 新增文件（Phase 2 累计）

```
src/lib/calendar.ts
src/lib/calendar.test.ts
src/app/calendar/page.tsx
src/components/calendar-block.tsx
src/components/calendar-day-column.tsx
src/components/calendar-day-grid.tsx
src/components/calendar-week-grid.tsx
src/lib/i18n/dictionaries.ts
src/lib/i18n/server.ts
```

### 5.7 修改文件（Phase 2 累计）

```
src/components/app-nav.tsx
src/components/app-nav.test.tsx
src/lib/i18n/index.ts
src/lib/i18n/types.ts
src/lib/i18n/zh.ts
src/lib/i18n/en.ts
src/lib/actions/categories.ts
src/lib/actions/time-blocks.ts
src/lib/constants.ts
src/app/page.tsx
src/app/layout.tsx
src/app/categories/page.tsx
src/app/dashboard/page.tsx
src/app/time-blocks/page.tsx
```

### 5.8 测试（`src/lib/calendar.test.ts`）

**Day View 起：**

- `parseCalendarDateParam`、`formatCalendarDateParam`、`addCalendarDays`
- `layoutBlockInDay`（含跨天裁剪）

**Week View 增：**

- `parseCalendarViewParam`（默认 `week`，仅 `day` 返回日视图）
- `startOfWeekMonday`、`getWeekDays`（7 天 Mon–Sun）
- `getWeekQueryRange`、`addCalendarWeeks`

当前：**32** 项 Vitest 测试通过。

### 5.9 验证命令

```bash
nvm use
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm dev    # http://localhost:3000/calendar
```

### 5.10 手动测试清单（日历）

**通用**

- [ ] `pnpm test`、`typecheck`、`lint`、`build` 通过
- [ ] `/categories`、`/time-blocks`、`/dashboard` 正常
- [ ] 顶栏「日历」与高亮正确；中英文切换正常
- [ ] `/time-blocks` 增删改后日历数据更新

**周视图（默认）**

- [ ] `/calendar` 默认周视图，「周视图」按钮高亮
- [ ] `?date=2026-05-21` 显示含该日的一周（周一 5/18 – 周日 5/24）
- [ ] 7 列列头可点击，进入对应 `view=day`
- [ ] 「上一周」「下一周」「本周」链接与范围正确
- [ ] 跨午夜块在涉及的多天各显示裁剪片段
- [ ] 整周无记录：空状态 + 7 列空网格不崩
- [ ] 窄屏可横向滚动浏览 7 列

**日视图**

- [ ] `/calendar?view=day` 或列头进入日视图
- [ ] 「前一天」「后一天」「今天」正确
- [ ] 单日块位置、分类色、跨天裁剪（单日段）正确
- [ ] 当日无记录：空状态 + 日网格正常

**参数**

- [ ] `?view=week` 与无 `view` 行为一致
- [ ] 无效 `?date=` 内容回退今天（URL 可仍显示无效值）

### 5.11 日历已知限制

- **只读**：创建/编辑在 `/time-blocks`（页底文字链接）；日历块本身不可点击编辑
- **无拖拽**、无日历内点击创建、无 FullCalendar 等第三方库
- **重叠块**：同列多条记录可能互相遮挡（未分列）
- **浅色分类 + 白字**：对比度可能不足
- **周列 `compact`**：仅显示标题，时间在 `title` 属性
- **无效 `?date=`**：不回写 URL
- **极短块**：`minHeight` 可能略长于真实时长
- **时间记录页副标题**：仍写「暂无日历」（陈旧文案）

### 5.12 Phase 2 仍未做

- [ ] 日历块详情增强 / 跳转编辑
- [ ] 日历内拖拽调整时间
- [ ] Dashboard 图表与日期筛选
- [ ] 用户认证、Pomodoro、外部日历同步、E2E

## 6. 数据库模型

PostgreSQL **schema `app`**（`DATABASE_URL` 须含 `?schema=app`）。

### Category

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| name | String | 名称 |
| color | String | 颜色（如 `#3b82f6`） |
| description | String? | 可选说明 |
| createdAt | DateTime | 默认 now |
| updatedAt | DateTime | 自动更新 |
| timeBlocks | TimeBlock[] | 关联时间块 |

### TimeBlock

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| title | String | 标题 |
| note | String? | 可选备注 |
| startTime | DateTime | 开始时间 |
| endTime | DateTime | 结束时间 |
| status | String | 默认 `planned`；见下方状态值 |
| completionLevel | Int | 0–100，默认 0 |
| categoryId | String | 外键 → Category |
| createdAt | DateTime | 默认 now |
| updatedAt | DateTime | 自动更新 |

**status 字符串值**（非 enum）：`planned` | `completed` | `partial` | `skipped`

**关系**：Category 1 — N TimeBlock；删除分类时若仍有关联时间块则被拒绝。

### 迁移

- `20260521173159_init`
- `20260521180044_add_category_description`

## 7. 已实现页面

| 路由 | 类型 | 功能 |
|------|------|------|
| `/` | 动态 | 应用介绍、快速入口（含日历） |
| `/categories` | 动态 | 分类 CRUD（查看/编辑模式 + 顶部新建表单） |
| `/time-blocks` | 动态 | 时间块 CRUD（列表 + 表单） |
| `/calendar` | 动态 | **周/日视图**（默认周）；`?date=`、`?view=day\|week` |
| `/dashboard` | 动态 | 概览数字 + 按分类时长汇总 |

全局布局：`src/app/layout.tsx` + `src/components/app-nav.tsx`（顶栏、当前路由高亮）。

## 8. 重要命令

```bash
nvm use
cd /home/devbox/project

pnpm install
cp .env.example .env    # 编辑 DATABASE_URL

pnpm db:generate
pnpm db:migrate         # 应用迁移（推荐）
pnpm exec prisma migrate status

pnpm dev                # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

**Sealos / 托管 PostgreSQL**：勿对默认 `public` 做未隔离的 `db push`。使用 `?schema=app` + `@@schema("app")`。

首次连接（一次性、非破坏性）：

```bash
node -e "require('dotenv/config');const{Pool}=require('pg');(async()=>{const p=new Pool({connectionString:process.env.DATABASE_URL});await p.query('CREATE SCHEMA IF NOT EXISTS app');await p.end();console.log('Schema app ready')})()"
```

## 9. 国际化（i18n）

| 项 | 说明 |
|----|------|
| 默认语言 | 中文（`zh`） |
| 支持语言 | 中文、English（`en`） |
| 字典 | `src/lib/i18n/zh.ts`、`en.ts`（类型 `types.ts`） |
| 客户端安全入口 | `src/lib/i18n/index.ts` → `dictionaries.ts` |
| 服务端 locale | `src/lib/i18n/server.ts` → `getLocale()` |
| 语言切换 | `language-switcher.tsx`（写 cookie + `router.refresh()`） |
| 日历文案 | `calendar.*`（含 `weekView`、`dayView`、`prevWeek`、`emptyWeek` 等） |

## 10. 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 连接串 |

示例（`.env.example`）：

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?schema=app"
```

## 11. 主要文件

```
prisma/schema.prisma
prisma.config.ts
prisma/migrations/

src/lib/prisma.ts
src/lib/time.ts
src/lib/calendar.ts
src/lib/calendar.test.ts
src/lib/constants.ts
src/lib/validation.ts
src/lib/i18n/
src/lib/actions/

src/components/app-nav.tsx
src/components/language-switcher.tsx
src/components/calendar-block.tsx
src/components/calendar-day-column.tsx
src/components/calendar-day-grid.tsx
src/components/calendar-week-grid.tsx
src/components/category-row.tsx
src/components/time-block-row.tsx

src/app/calendar/page.tsx
src/app/categories/page.tsx
src/app/time-blocks/page.tsx
src/app/dashboard/page.tsx
src/app/page.tsx
src/app/layout.tsx

docs/PROJECT_STATUS.md
docs/AI_CONTEXT.md
```

## 12. UX 模式（列表页）

- **列表默认查看模式**；编辑 / 取消 / 保存 + `redirect`
- **顶部新建表单**；成功 `?success=created` + 表单 `key` 重置
- **删除**：`DeleteConfirmButton` + i18n `confirm`
- **日历页**：只读展示；底部链接至 `/time-blocks` 编辑

## 13. 全局已知限制

- **无用户认证**
- **日历**：无拖拽、无块级编辑链接（仅页底总链）、无第三方日历库
- **Dashboard**：无图表、无按日期筛选
- **无** Pomodoro、重复事件、外部日历、shadcn、E2E
- **Node 20.19+** 运行 Prisma 7 CLI

## 14. 建议下一阶段

1. **日历事件详情增强** — 块上展示 status、完成度、备注摘要等
2. **可选**：日历块 → `/time-blocks`（定位或高亮对应记录）
3. 日历拖拽调整时间（Phase 2 后期）
4. Dashboard 图表与日期范围筛选
5. 更远期：认证、Pomodoro、重复事件、外部日历
