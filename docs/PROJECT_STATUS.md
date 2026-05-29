# TimeBlock Tracker — 项目状态

## 1. 项目名称

**TimeBlock Tracker** — 个人时间块日历与时间追踪 Web 应用

## 2. 当前阶段

**Phase 7：Docker 化（已完成）** — 详见 §19

**Phase 6：用户认证与按用户数据隔离（已完成）** — 详见 §18

**Phase 5 及更早**：专注、复盘、日历等 — 见上文各 Phase 小节

**下一步（Phase 8）**：Sealos 部署（见 §19.11、§16）

- **Phase 5.4（已完成第一版）Dashboard 专注统计**
  - 独立区块「专注统计（FocusSession）」：今天/本周专注时长、完成/放弃次数、完成率、已转换数量
  - 各分类专注时长列表（仅已完成/已转换会话；标注已写入时间块的次数）
  - 时间块图表与「各分类时间统计」仍仅使用 `TimeBlock`；文案说明避免重复相加
  - 工具：`src/lib/focus-stats.ts` + 单元测试

- **Phase 5.3（已完成第一版）专注完成 → 时间块**
  - 完成后提示「是否转为时间块」；确认调用 `convertFocusSessionToTimeBlock`
  - 默认标题：无标题时用「专注会话」/ `Focus Session`
  - 防重复转换（`already_converted` / `convertedToTimeBlock`）
  - 放弃会话不自动转换
  - `/focus` 底部「最近专注记录」：状态、时长、是否已转换；未完成转换的 `completed` 可补转

- **Phase 5.2（已完成第一版）`/focus` 专注页与番茄钟 UI**
  - 路由：`/focus`（服务端取分类 + 客户端倒计时）
  - 组件：`src/components/focus-timer.tsx`、`src/components/focus-history.tsx`
  - 时长预设：15 / 25 / 45 / 50 / 90 分钟 + 自定义
  - 操作：开始（创建 `running` 会话）、暂停/继续（纯客户端）、完成、放弃
  - 导航与首页入口、中英 i18n

- **Phase 5.8（已完成）Dashboard 专注区拆分（Option B + 文案）**
  - 专注区显式展示：本周专注总时长、已写入时间块的专注、尚未写入时间块的专注
  - `summarizeFocusSessions` 新增 `convertedFocusMinutes` / `unconvertedFocusMinutes`
  - 统计口径不变：TimeBlock 仅来自时间块；FocusSession 仍计全部 completed/converted
  - 文案：`timeBlocksSectionNote`、`focusSectionNote` 说明双视角重叠，勿直接相加

- **Phase 5.7（已完成）四项收尾修复**
  - 时长展示：统一 `formatDurationMinutes`（85 分钟 → `1 小时 25 分钟`，非 `85 小时` 或 `1.4 小时`）
  - 转换事务：先 `updateMany` claim（`status: completed`, `convertedToTimeBlock: false`），再创建 TimeBlock，再写 `timeBlockId`；失败回滚无孤儿块
  - Dashboard 文案：`timeBlocksSectionNote` + 优化 `focusSectionNote`
  - 测试：`focus-convert.test.ts`、`time.test.ts`（formatDurationMinutes）

- **Phase 5.6（已完成）Dashboard 重复计数审计**
  - **结论：未发现将 Focus 时长并入 TimeBlock 合计的 bug**（两路数据独立计算，分区展示）
  - TimeBlock/分类/图表：仅 `prisma.timeBlock` → `src/lib/stats.ts`
  - 专注统计：仅 `prisma.focusSession` → `src/lib/focus-stats.ts`
  - 已转换专注：25 分钟计入 **TimeBlock 85** 与 **专注 55** 两个指标（ intentional 双视角，非同一「总时长」字段相加）
  - 测试：`src/lib/dashboard-metrics.test.ts`（含 60+25+30+20 场景）

- **Phase 5.5（已完成）收尾与测试**
  - 空状态：无分类、无专注记录、无已完成记录
  - 按钮 loading / disabled、`aria-busy`、移动端按钮与倒计时布局
  - 转换幂等：`updateMany` + `convertedToTimeBlock: false` 条件
  - 集成规则测试：`src/lib/focus-flow.test.ts`、`src/lib/dashboard-metrics.test.ts`（104 tests 总量见下方验证）

- **Phase 5.1（已完成）FocusSession 数据模型与 Server Actions**
  - Prisma 模型 `FocusSession` + 与 `Category`、`TimeBlock` 可选 1:1 关联
  - 迁移：`20260529120000_add_focus_session`
  - Actions：`src/lib/actions/focus-sessions.ts`（创建、更新状态、完成、放弃、转换为 TimeBlock）
  - 校验：`src/lib/validation.ts`、`src/lib/actions/focus-shared.ts`
  - 单元测试：`focus-shared.test.ts`、扩展 `validation.test.ts`

**Phase 4：完成追踪与复盘（已完成第一版）**

- **Phase 1：已完成** — 数据模型、分类/时间块 CRUD、Dashboard、导航、i18n、测试
- **Phase 2：已完成** — `/calendar` 周/日视图、URL 参数、跨天裁剪、测试
- **Phase 2.5：已完成（交互能力）**
  - **calendar-specific server actions**：`src/lib/actions/calendar-time-blocks.ts`
  - **click-to-edit from calendar**：点击块打开 `/calendar?blockId=...` 的页内编辑面板
  - **day view drag-to-move**：日视图列内纵向拖拽移动（保持时长、5 分钟吸附、00:00–24:00 夹取）
  - **day view bottom resize**：日视图底部手柄 resize（只改 `endTime`、5 分钟吸附、最小时长、00:00–24:00 夹取）
  - **week view column-internal interactions（受限）**：周视图列内拖拽/底部 resize（不跨列、不改日期）
  - **00:00–24:00 全日交互范围**：拖拽/resize 的计算与 clamp 都以单日网格为边界
  - **可配置吸附间隔**：`CALENDAR_SNAP_MINUTES`（当前 5 分钟）
  - **可配置最小时长**：`MIN_TIME_BLOCK_DURATION_MINUTES`
- **Phase 3（本阶段）已完成（第一版）**
  - **统计工具层（纯函数）**：`src/lib/stats.ts`（按分类/按状态/按周每日汇总等）
  - **Dashboard 日期范围工具**：`src/lib/dashboard-ranges.ts`（今天/本周；周一为起点）
  - **Dashboard（/dashboard）第一版**
    - 今天与本周：总时长、时间块数量、状态计数/汇总
    - 分类 breakdown：时长 + 占比 + 颜色
    - **基础图表**（Recharts）：分类 donut、周内每日柱状图、状态柱状图
    - 服务端取数 + 统计，图表在独立 client component 渲染：`src/components/dashboard-charts.tsx`

- **Phase 4.1（本阶段进行中）完成度数据模型（已完成）**
  - `TimeBlock` 新增字段：
    - `efficiencyLevel?: "low" | "medium" | "high"`（主观效率，允许为空）
    - `reviewNote?: string`（复盘备注，允许为空）
  - 解析/校验/写入已预埋（UI 尚未添加字段）：
    - `src/lib/actions/time-block-shared.ts`
    - `src/lib/actions/time-blocks.ts`
    - `src/lib/validation.ts`
    - `src/lib/constants.ts`

- **Phase 4.2（进行中）完成度编辑 UI（已完成第一版）**
  - `/time-blocks`：新建与编辑表单支持编辑
    - `status`、`completionLevel`
    - `efficiencyLevel`（可选）
    - `reviewNote`（可选）
  - `/calendar` 页内编辑面板：支持编辑 `efficiencyLevel` 与 `reviewNote`
  - i18n：中英文字典已补齐相关字段文案

- **Phase 4.3（进行中）复盘/完成度统计（已完成第一版）**
  - 统计工具：`src/lib/stats.ts` 新增 `summarizeCompletionQuality(...)`
  - 单元测试：`src/lib/stats.review.test.ts`
  - 统计规则（简化版）：
    - `completed`：整段时长计为完成
    - `skipped`：整段时长计为跳过
    - `partial`：按 `completionLevel%` 折算完成分钟（例如 60 分钟、50% → 30 分钟完成）
    - `planned`：不计入完成分钟

- **Phase 4.4（进行中）每日复盘页（已完成第一版）**
  - 路由：`/review/day`
  - 能力：选择日期、查看当日 TimeBlocks、完成质量摘要、分类汇总、未完成/跳过列表、显示 `reviewNote`、跳转回日历/看板
  - 导航：顶栏新增「复盘」入口

- **Phase 4.5（进行中）每周复盘页（已完成第一版）**
  - 路由：`/review/week`
  - 能力：选择周（任意日期）、周摘要、分类汇总、按分类完成情况、周一至周日每日分解、需要复盘条目列表、跳转回日历/看板
  - 统计：复用 `summarizeCompletionQuality(...)`（不在页面内重复计算规则）

- **Phase 4.6（进行中）Dashboard 完成度指标整合（已完成第一版）**
  - `/dashboard` 增加本周完成质量指标：计划时长、估算完成时长、完成率、平均完成度、跳过时长
  - 可选显示：低效率（low）时长（若填写了 `efficiencyLevel`）
  - 增加跳转：`/review/day` 与 `/review/week`

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
| 图表 | Recharts（Phase 3 引入，基础可视化） |

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

近期结果（本地 Mac + Docker 环境）：

- `pnpm test` ✅（104 tests）
- `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm build` ✅
- `pnpm typecheck` ✅
- `pnpm lint` ✅
- `pnpm build` ✅

### 5.10 手动测试清单（日历）

**通用**

- [ ] `pnpm test`、`typecheck`、`lint`、`build` 通过
- [ ] `/categories`、`/time-blocks`、`/dashboard` 正常
- [ ] 顶栏「日历」与高亮正确；中英文切换正常
- [ ] `/time-blocks` 增删改后日历数据更新
- [ ] 日历点击块打开编辑面板；保存后仍在 `/calendar`，且数据刷新
- [ ] 拖拽/resize 保存失败时有提示，并会刷新回最新数据

**周视图（默认）**

- [ ] `/calendar` 默认周视图，「周视图」按钮高亮
- [ ] `?date=2026-05-21` 显示含该日的一周（周一 5/18 – 周日 5/24）
- [ ] 7 列列头可点击，进入对应 `view=day`
- [ ] 「上一周」「下一周」「本周」链接与范围正确
- [ ] 跨午夜块在涉及的多天各显示裁剪片段
- [ ] 整周无记录：空状态 + 7 列空网格不崩
- [ ] 窄屏可横向滚动浏览 7 列
- [ ] 仅在同一列内拖拽移动/底部 resize；不会跨列改变日期

**日视图**

- [ ] `/calendar?view=day` 或列头进入日视图
- [ ] 「前一天」「后一天」「今天」正确
- [ ] 单日块位置、分类色、跨天裁剪（单日段）正确
- [ ] 当日无记录：空状态 + 日网格正常
- [ ] **拖拽移动**：00:00–24:00 全范围可拖；吸附 5 分钟；保持原始时长；保存后刷新
- [ ] **底部 resize**：只改 `endTime`；吸附 5 分钟；满足最小时长；靠近 24:00 正确夹取；保存后刷新

**参数**

- [ ] `?view=week` 与无 `view` 行为一致
- [ ] 无效 `?date=` 内容回退今天（URL 可仍显示无效值）

### 5.11 日历已知限制

- **无日历内点击创建**、无 FullCalendar 等第三方库
- **无冲突检测**：允许 overlaps；重叠块可能遮挡（未分列）
- **无撤销/重做**
- **无重复事件**
- **无外部日历同步**
- **无空白处创建（blank-space creation）**
- **周视图不支持跨列拖拽/跨天改变日期**（仅列内交互）
- **重叠块**：同列多条记录可能互相遮挡（未分列）
- **浅色分类 + 白字**：对比度可能不足
- **周列 `compact`**：仅显示标题，时间在 `title` 属性
- **无效 `?date=`**：不回写 URL
- **极短块**：`minHeight` 可能略长于真实时长
- **时间记录页副标题**：仍写「暂无日历」（陈旧文案）

### 5.12 Phase 2 仍未做

- [ ] 日历块详情增强 / 跳转编辑
- [ ] Dashboard 图表与日期筛选
- [ ] 用户认证、Pomodoro、外部日历同步、E2E

## 5.13 Phase 2.5 — 日历交互实现说明

### 5.13.1 `updateTimeBlockFromCalendar`（全量编辑，保存后留在 `/calendar`）

文件：`src/lib/actions/calendar-time-blocks.ts`

- 用途：从日历页内编辑面板提交完整 TimeBlock 表单
- 行为：
  - 校验表单字段与时间范围
  - `prisma.timeBlock.update(...)` 写入完整字段
  - `revalidatePath("/calendar")` + `revalidatePath("/time-blocks")`
  - 使用隐藏字段（`calendarDate` / `calendarView` / `calendarBlockId`）构造重定向 URL，确保用户保存后仍停留在相同日历上下文

### 5.13.2 `updateTimeBlockSchedule`（拖拽/resize，仅更新 start/end，不 redirect）

文件：`src/lib/actions/calendar-time-blocks.ts`

- 用途：拖拽移动或 resize 时仅更新 `startTime` / `endTime`
- 行为：
  - 解析与校验 schedule-only 输入（`startTime < endTime`）
  - `prisma.timeBlock.update({ startTime, endTime })`
  - `revalidatePath("/calendar")` + `revalidatePath("/time-blocks")`
  - 返回 `{ ok: true } | { ok: false; error }`，由客户端决定刷新与提示

### 5.13.3 交互组件（Client Components）

以下均为客户端组件（含 `"use client"`）：

- `src/components/calendar-interactive-view.tsx`
- `src/components/calendar-day-grid.tsx`
- `src/components/calendar-week-grid.tsx`
- `src/components/calendar-day-column.tsx`
- `src/components/calendar-block.tsx`
- `src/components/calendar-draggable-block.tsx`
- `src/components/calendar-block-edit-panel.tsx`

### 5.13.4 拖拽移动（高层计算）

- 将 pointer Y 位置映射到“分钟”（`pixelYToMinutes`）
- 以 `CALENDAR_SNAP_MINUTES` 做吸附（`snapMinutes`）
- 使用 `calculateMovedRange`：
  - **保持原始 duration**
  - 对 start 做 clamp，确保最终范围在 00:00–24:00 内（必要时向上夹取到最晚可开始）
- 保存：调用 `updateTimeBlockSchedule`，保存结束后 `router.refresh()`

### 5.13.5 底部 resize（高层计算）

- 底部 handle 使用 pointer events，并阻止冒泡避免误触选中
- 将“块底部”Y 位置映射到分钟（`pixelYToMinutes`）
- 使用 `calculateResizedRange`：
  - **只改变 `endTime`，不改变 `startTime`**
  - 吸附到 `CALENDAR_SNAP_MINUTES`
  - 强制最小时长 `MIN_TIME_BLOCK_DURATION_MINUTES`
  - clamp 到 00:00–24:00（无法满足最小约束则返回失败）
- 保存：调用 `updateTimeBlockSchedule`，保存结束后 `router.refresh()`

## 6. 数据库模型

PostgreSQL **schema `app`**（`DATABASE_URL` 须含 `?schema=app`）。

### User（Auth.js）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| name, email, image | 可选 | GitHub 资料 |
| categories | Category[] | 用户拥有的分类 |

另：`Account`、`Session`、`VerificationToken`（Prisma Adapter 标准表）。

### Category

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| **userId** | String | 外键 → User（**数据隔离根**） |
| name | String | 名称 |
| color | String | 颜色（如 `#3b82f6`） |
| description | String? | 可选说明 |
| createdAt | DateTime | 默认 now |
| updatedAt | DateTime | 自动更新 |
| timeBlocks | TimeBlock[] | 关联时间块 |
| focusSessions | FocusSession[] | 关联专注 |

### TimeBlock

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| title | String | 标题 |
| note | String? | 可选备注 |
| reviewNote | String? | 复盘备注（可选） |
| startTime | DateTime | 开始时间 |
| endTime | DateTime | 结束时间 |
| status | String | 默认 `planned`；见下方状态值 |
| completionLevel | Int | 0–100，默认 0 |
| efficiencyLevel | String? | `"low" \| "medium" \| "high"`（可选） |
| categoryId | String | 外键 → Category |
| createdAt | DateTime | 默认 now |
| updatedAt | DateTime | 自动更新 |

**status 字符串值**（非 enum）：`planned` | `completed` | `partial` | `skipped`

**关系**：User 1 — N Category；Category 1 — N TimeBlock。删除分类前应用层检查关联 TimeBlock **与** FocusSession（`has-records`）。

### FocusSession

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| title | String? | 可选标题 |
| note | String? | 可选备注 |
| categoryId | String | 外键 → Category |
| startTime | DateTime | 开始时间 |
| endTime | DateTime? | 结束时间（进行中可为空） |
| plannedDurationMinutes | Int | 计划时长（分钟，须 > 0） |
| actualDurationMinutes | Int? | 实际时长（完成/放弃时可填） |
| status | String | 默认 `planned`；见下方 |
| convertedToTimeBlock | Boolean | 是否已转为 TimeBlock，默认 false |
| timeBlockId | String? | 可选，唯一，关联生成的 TimeBlock |
| createdAt / updatedAt | DateTime | 审计字段 |

**status 字符串值**：`planned` | `running` | `completed` | `abandoned` | `converted`

**关系**：

- Category 1 — N FocusSession（`onDelete: Restrict`）
- FocusSession 0..1 — 1 TimeBlock（`timeBlockId` 唯一；删除 TimeBlock 时 `SetNull`）

**Server Actions**（`src/lib/actions/focus-sessions.ts`，返回 `{ ok, data } | { ok, error }`）：

| Action | 说明 |
|--------|------|
| `createFocusSession` | 创建会话（默认 `planned`，`startTime` 默认当前时间） |
| `updateFocusSessionStatus` | 更新 status（已 converted 的不可改） |
| `completeFocusSession` | `completed` + `endTime` + `actualDurationMinutes` |
| `abandonFocusSession` | `abandoned`；可选 `endTime` |
| `convertFocusSessionToTimeBlock` | 仅 `completed` 且未转换；创建 `TimeBlock`（`completed`, 100%）并链接 |

### 迁移

- `20260521173159_init`
- `20260521180044_add_category_description`
- `20260528030837_add_timeblock_review_fields`（新增 `TimeBlock.efficiencyLevel`、`TimeBlock.reviewNote`）
- `20260529120000_add_focus_session`（新增 `FocusSession` 表）

## 7. 已实现页面

| 路由 | 类型 | 功能 |
|------|------|------|
| `/` | 动态 | 应用介绍、快速入口（含日历） |
| `/categories` | 动态 | 分类 CRUD（查看/编辑模式 + 顶部新建表单） |
| `/time-blocks` | 动态 | 时间块 CRUD（列表 + 表单） |
| `/calendar` | 动态 | **周/日视图**（默认周）；`?date=`、`?view=day\|week` |
| `/dashboard` | 动态 | 时间块统计 + 图表 + 专注会话统计（分区展示） |
| `/focus` | 动态 | 番茄钟专注：配置会话 + 倒计时 + 完成/放弃 |

全局布局：`src/app/layout.tsx` + `src/components/app-nav.tsx`（顶栏、当前路由高亮）。

## 8. 重要命令

```bash
nvm use
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

### 本地开发（Mac + Docker PostgreSQL）

本项目已可在本地 Mac 环境中使用 Docker PostgreSQL 稳定开发。

#### 启动/停止数据库

```bash
docker compose up -d
docker compose down
```

注意：不要随便运行 `docker compose down -v`，否则会删除本地数据库 volume 与数据。

#### DATABASE_URL（本地 Docker 示例）

`.env.example` 提供了本地默认示例（包含 `?schema=app`）：

```
DATABASE_URL="postgresql://timeblock:timeblock_password@localhost:5432/timeblock_db?schema=app"
```

对应 `docker-compose.yml` 的默认配置：

- `POSTGRES_USER=timeblock`
- `POSTGRES_PASSWORD=timeblock_password`
- `POSTGRES_DB=timeblock_db`
- 端口映射：`5432:5432`

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
| `AUTH_SECRET` | 是 | Auth.js 会话签名（`openssl rand -base64 32`） |
| `AUTH_URL` | 是（生产） | 应用根 URL，本地 `http://localhost:3000` |
| `AUTH_TRUST_HOST` | 本地可选 | 开发环境可设 `true` |
| `AUTH_GITHUB_ID` | 是 | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | 是 | GitHub OAuth App Client Secret |

GitHub OAuth 回调：`http://localhost:3000/api/auth/callback/github`

示例见 `.env.example`。

## 11. 主要文件

```
prisma/schema.prisma
prisma.config.ts
prisma/migrations/

src/lib/prisma.ts
src/lib/time.ts
src/lib/calendar.ts
src/lib/calendar.test.ts
src/lib/stats.ts
src/lib/dashboard-ranges.ts
src/lib/db/scoped.ts
src/lib/db/scoped-where.ts
src/lib/actions/calendar-time-blocks.ts
src/lib/actions/focus-sessions.ts
src/lib/actions/focus-shared.ts
src/lib/actions/time-block-shared.ts
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
src/components/calendar-interactive-view.tsx
src/components/calendar-draggable-block.tsx
src/components/calendar-block-edit-panel.tsx
src/components/category-row.tsx
src/components/time-block-row.tsx
src/components/dashboard-charts.tsx
src/components/focus-timer.tsx
src/components/focus-history.tsx
src/lib/focus.ts
src/lib/focus-stats.ts
src/lib/focus-flow.test.ts
src/app/focus/page.tsx
src/app/review/day/page.tsx
src/app/review/week/page.tsx

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
- **日历页**：支持选择块并在页内编辑（保存后留在 `/calendar`）；仍保留底部链接至 `/time-blocks`

## 13. 全局已知限制

- **认证**：仅 GitHub OAuth；无邮箱密码登录
- **数据隔离**：每用户仅见自己的 Category / TimeBlock / FocusSession（经 `Category.userId`）
- **Next.js 16**：构建可能提示 `middleware` 将更名为 `proxy`（见 §18.11）
- **日历**：无“点击创建”；周视图交互相对有限；无第三方日历库
- **Dashboard**：
  - 无自定义日期筛选（仅默认“今天/本周”）
  - **跨午夜 TimeBlock 的统计口径（简化版）**：当前 Dashboard 统计会把**整段时长**计入其 `startTime` 所在的那一天/那一周（不会按天裁剪拆分）。例如 23:00–01:00 会全部算在开始日。
  - 图表为基础版：无日期选择器、无月统计、无高级交互（hover/tooltip 以 Recharts 默认实现为主）
- **专注**：暂停状态不写入数据库；刷新页面会丢失进行中的倒计时
- **无** 重复事件、外部日历、shadcn、E2E
- **Node 20.19+** 运行 Prisma 7 CLI

## 14. Phase 5 验证命令

```bash
nvm use
docker compose up -d
pnpm install
pnpm prisma generate
pnpm exec prisma migrate deploy   # 或 pnpm db:migrate
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm dev                          # http://localhost:3000/focus
```

## 15. Phase 5 手动测试清单

**数据与转换**

- [ ] 无分类时 `/focus` 显示空状态并引导至 `/categories`
- [ ] 开始 → 完成 → 「转为时间块」→ `/time-blocks` 与 `/calendar` 出现记录
- [ ] 完成但不转换 → 仅 `FocusSession` 为 `completed`，无新 TimeBlock
- [ ] 放弃 → `abandoned`，不出现转换提示，不创建 TimeBlock
- [ ] 已转换会话再次转换 → 错误提示（`already_converted`），历史无转换按钮
- [ ] 历史列表中 `completed` 未转换项可补转

**Dashboard**

- [ ] 「时间块统计」与「专注统计」分区显示，说明文案可见
- [ ] 已转换专注：时间块区有记录；专注区完成次数含该会话
- [ ] 勿将两栏「专注时长」与「记录时间」简单相加

**移动端**

- [ ] 窄屏下倒计时与按钮可点、无横向溢出

**重复计数（Dashboard）**

- [ ] Study 分类时间块合计 **85 分钟**（60 手动 + 25 转换），不是 110 或 140
- [ ] 本周记录时间（时间块）显示 **1 小时 25 分钟** 或 **85 分钟**（不是 `85 小时` 或 `1.4 小时`）
- [ ] 本周专注时长 **55 分钟**（25 已转换 + 30 未转换），不含放弃 20
- [ ] 已放弃 **1 次**；放弃不计入专注时长
- [ ] `/focus` 历史三条：**converted(25)**、**completed 未转换(30)**、**abandoned(20)**
- [ ] 页面有记录时间 / 专注时间分区说明，勿将两栏相加

## 16. 建议下一阶段（Phase 8 及以后）

1. **Sealos 部署**（Phase 8）：镜像仓库、应用、PostgreSQL、环境变量、域名、OAuth callback、线上 `migrate deploy`
2. **统计精度**：跨午夜 TimeBlock / FocusSession 按天裁剪拆分（与日历一致）
3. **专注增强**：localStorage 恢复进行中计时、可选浏览器通知
4. **复盘**：Review 页纳入 FocusSession 摘要（可选）
5. 更远期：重复事件、外部日历、E2E、多因素认证

## 17. Devbox（可选/历史）

仓库内保留了 `.devbox-original/` 作为迁移前的参考（不作为默认开发方式）。

## 18. Phase 6 — 用户认证与数据隔离（已完成）

### 18.1 已完成功能（Steps A–E）

| Step | 内容 |
|------|------|
| A | Auth.js v5 + GitHub OAuth + JWT session + `/login` + `middleware` |
| B | `src/lib/db/scoped.ts`（`*ForUser`、`assert*Owned`） |
| C | 7 个私有页面 scoped 读取 |
| D | 全部业务 Server Actions `requireUser()` + 归属校验 |
| E | 删除分类检查 TimeBlock + FocusSession；转换跨用户防护确认 |

### 18.2 认证方案

- **库**：`next-auth@5.0.0-beta.31`（Auth.js v5）+ `@auth/prisma-adapter`
- **会话**：`session: { strategy: "jwt" }`（Adapter 仍写入 `Account` 等表）
- **文件**：`src/auth.config.ts`（Edge，无 Prisma）· `src/auth.ts` · `src/app/api/auth/[...nextauth]/route.ts` · `src/middleware.ts` · `src/lib/session.ts`

### 18.3 GitHub OAuth 配置

1. [GitHub Developer Settings](https://github.com/settings/developers) → **New OAuth App**
2. **Homepage URL**：`http://localhost:3000`（生产改为你的域名）
3. **Authorization callback URL**：`http://localhost:3000/api/auth/callback/github`
4. 复制 **Client ID** → `AUTH_GITHUB_ID`；生成 **Client Secret** → `AUTH_GITHUB_SECRET`

### 18.4 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | 须含 `?schema=app` |
| `AUTH_SECRET` | 是 | `openssl rand -base64 32` |
| `AUTH_URL` | 是 | 本地 `http://localhost:3000` |
| `AUTH_TRUST_HOST` | 本地建议 | `true` |
| `AUTH_GITHUB_ID` | 是 | OAuth Client ID |
| `AUTH_GITHUB_SECRET` | 是 | OAuth Client Secret |

见 `.env.example`。

### 18.5 用户归属模型

- **直接归属**：`Category.userId` → `User`
- **间接归属**：`TimeBlock.categoryId`、`FocusSession.categoryId` → 须 `Category.userId === 当前用户`
- **无** `TimeBlock.userId` / `FocusSession.userId` 列（有意保持 schema 最小）

### 18.6 查询隔离策略（页面）

- 每私有页：`const user = await requireUser()`
- 列表：`categoriesForUser` / `timeBlocksForUser` / `focusSessionsForUser`
- 日历 `blockId`：`timeBlocksForUser(user.id, { where: { id } })`，非本人无编辑块

### 18.7 Server Action 保护策略

- 每个 Action 开头 **`requireUser()`**（middleware 不够，Action 可被直接 POST）
- 创建 TimeBlock / FocusSession：**`assertCategoryOwned`**
- 更新/删除 TimeBlock / FocusSession：**`assert*Owned`** + **`updateMany`/`deleteMany`** 带 `category: { userId }`
- 专注转换：转换前 `assertFocusSessionOwned` + `assertCategoryOwned`；事务 claim 含 `category: { userId }`

### 18.8 迁移说明

- 迁移：`20260529191846_auth_and_category_user`（Auth 表 + `Category.userId` NOT NULL）
- 若库中已有无 `userId` 的 Category，迁移会失败
- **开发库**可（需你手动确认）：`pnpm exec prisma migrate reset`（**清空全部数据**）
- 成功后：`pnpm exec prisma migrate deploy` 或 `pnpm db:migrate`

### 18.9 命令（Phase 6 验证与完成审计）

**脚本（`package.json`）：** `typecheck` · `lint` · `test` · `build`（含 `prisma generate`）均存在。

**2026-05-29 完成审计复验（全部通过）：**

| 命令 | 结果 |
|------|------|
| `pnpm exec prisma generate` | ✅ |
| `pnpm typecheck` | ✅ |
| `pnpm lint` | ✅ |
| `pnpm test` | ✅ 110 tests |
| `pnpm build` | ✅（提示 middleware→proxy 为 Next 16 警告，非失败） |

**本地启动：**

```bash
docker compose up -d
cp .env.example .env    # 必填 AUTH_SECRET（非空）、GitHub OAuth
pnpm exec prisma migrate deploy
pnpm dev
```

**常见配置错误：** `AUTH_SECRET=""` → `MissingSecret`；行尾注释 `# AUTH_*` 在 zsh 可能导致 `pnpm dev` 失败——命令请分行执行。

### 18.10 手动测试清单（双用户隔离）

**准备**

- [ ] `.env` 已配置 AUTH_* 与 GitHub OAuth
- [ ] 数据库迁移已应用
- [ ] 两个 GitHub 账号（或：Chrome 正常窗口 + 无痕窗口各登录一个账号）

**用户 A**

- [ ] `/login` → GitHub 登录成功 → 顶栏显示「退出」
- [ ] 创建分类、时间块；`/focus` 完成或创建专注会话
- [ ] `/dashboard`、`/calendar`、`/review/day` 仅显示 A 的数据
- [ ] 记下 A 的某个 `category` id、`timeBlock` id（浏览器地址栏或列表）

**用户 B**（换账号 / 换浏览器）

- [ ] 登录后 **看不到** A 的分类、时间块、专注、看板数据
- [ ] 访问 `/categories`、`/time-blocks` 等为空或仅 B 自己的数据
- [ ] 访问 `/calendar?blockId=<A的timeBlockId>` → **无** A 的编辑面板（块不出现或无法编辑）
- [ ] 未登录访问 `/dashboard` → 重定向到 `/login`
- [ ] `/` 首页无需登录可访问
- [ ] `/api/auth/*` 不被 middleware 拦截

**登出**

- [ ] 顶栏「退出」→ 回到可访问公开页；再访问 `/categories` → `/login`

**删除分类边界（单用户）**

- [ ] 分类下仅有专注记录、无时间块时，删除被阻止并显示 `has-records` 类提示

### 18.11 已知限制

- 无团队/共享/邀请；一用户一套私有数据
- 无 E2E；隔离靠单元测试 + 上述手动清单
- Build 可能提示 middleware → proxy（Next.js 16），当前仍用 `middleware.ts`
- 跨午夜统计、专注刷新丢失等 Phase 5 限制仍在

### 18.12 安全自检（代码层）

| # | 项 | 状态 |
|---|-----|------|
| 1 | 私有页无全表 `prisma.findMany` | ✅ `src/app` 无业务 `prisma.*` |
| 2 | Action 不单凭 `id` 写入 | ✅ `updateMany`/`deleteMany` + assert |
| 3–4 | Category create/update/delete | ✅ |
| 5–7 | TimeBlock create/update/delete | ✅ |
| 8 | FocusSession create/update/convert | ✅ |
| 9 | 日历编辑/拖拽 | ✅ |
| 10–11 | middleware + `requireUser()` | ✅ |
| 12–14 | `/` 公开、`/login`、Auth API | ✅ |

## 19. Phase 7 — Docker 化（已完成）

### 19.1 本阶段目标

- 本地 Docker Compose 一键启动 PostgreSQL（`db`）
- 生产 multi-stage Dockerfile + 可选 `app` + `db` 全栈
- Prisma / Auth.js / 用户隔离在容器环境中可用
- 文档：`docs/DOCKER.md`、更新 `.env.example` / README

**未做**：新业务功能、UI 改动、认证逻辑重构、seed 数据。

### 19.2 新增 / 修改文件

| 文件 | 说明 |
|------|------|
| `docker-compose.yml` | `db`（healthcheck）+ `app`（build、env、`depends_on`） |
| `Dockerfile` | deps → builder → runner；`output: standalone` |
| `.dockerignore` | 排除 `.env`、`node_modules` 等 |
| `next.config.ts` | `output: "standalone"` |
| `scripts/docker-entrypoint.sh` | schema 引导 → `migrate deploy` → `node server.js` |
| `docs/DOCKER.md` | Docker 开发与部署指南 |
| `.env.example` | `NODE_ENV`；宿主机 vs 容器 `DATABASE_URL` 注释 |

### 19.3 Docker Compose 服务

| 服务 | 镜像 / 构建 | 端口 | 说明 |
|------|-------------|------|------|
| `db` | `postgres:16` | `5432:5432` | volume `timeblock_postgres_data`；用户/库见 compose |
| `app` | `Dockerfile` | `3000:3000` | `env_file: .env`（可选）；`DATABASE_URL` 指向 `db` |

### 19.4 Dockerfile 策略

1. **deps**：`pnpm install --frozen-lockfile`
2. **builder**：占位 `DATABASE_URL` → `prisma generate` → `next build`
3. **runner**：复制 `.next/standalone`、static、`public`、`prisma/`、`prisma.config.ts`；全局 `prisma@7.8.0` CLI；`USER nextjs`

### 19.5 Prisma 在 Docker 中

- **Build**：`prisma generate`（无需真实数据库）
- **Runtime**：entrypoint 执行 `CREATE SCHEMA IF NOT EXISTS app` + `prisma migrate deploy`
- **开发机**：`pnpm exec prisma migrate dev` 或 `migrate deploy`
- 连接串必须含 `?schema=app`

### 19.6 必要环境变量

与 §10 / §18.4 相同；Compose `app` 另设 `NODE_ENV=production`、`AUTH_TRUST_HOST=true`。

### 19.7 启动流程

**仅数据库 + 本地 dev：**

```bash
docker compose up -d db
cp .env.example .env
pnpm exec prisma generate && pnpm exec prisma migrate deploy
pnpm dev
```

**全栈容器：**

```bash
docker compose build app
docker compose up -d
# 或 docker compose up app
```

### 19.8 GitHub OAuth（Docker 本地）

- `AUTH_URL=http://localhost:3000`（改端口须同步 GitHub App）
- Callback：`http://localhost:3000/api/auth/callback/github`

### 19.9 验证命令（2026-05-29）

| 命令 | 结果 |
|------|------|
| `docker compose config` | ✅ |
| `pnpm exec prisma generate` | ✅ |
| `pnpm typecheck` | ✅ |
| `pnpm lint` | ✅ |
| `pnpm test` | ✅ 110 tests |
| `pnpm build` | ✅（middleware→proxy 警告） |
| `docker compose build app` | ✅（pnpm 10.28.1 + Node 20） |
| `docker compose up -d db` + `up app` | ✅ migrate deploy + Next Ready |
| `curl localhost:3000/`、`/login` | ✅ 200 |

### 19.10 已知问题

- `app` 服务依赖 `.env` 中的 `AUTH_SECRET` 与 GitHub 密钥（`env_file` 可选，但 OAuth 需配置）
- Next.js build 可能提示 middleware → proxy（非阻塞）
- 无 Docker 业务 seed
- 生产镜像含 `prisma-cli/node_modules` 以运行迁移，体积较大（Phase 8 可改为独立 migrate Job）

### 19.11 下一阶段

**Phase 8 — Sealos 部署**（镜像、App、PostgreSQL、环境变量、域名、OAuth、迁移策略）

