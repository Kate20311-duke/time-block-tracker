# TimeBlock Tracker — 项目状态

## 1. 项目名称

**TimeBlock Tracker** — 个人时间块日历与时间追踪 Web 应用

## 2. 当前阶段

**TZ-1：用户本地时区** — 浏览器 cookie + `getUserCalendarTimeZone()`，详见 §28  
**TZ-2：表单 UTC ISO** — `datetime-local` 在浏览器转 ISO 提交，详见 §29  
**TZ-3：日历用户时区** — 日/周查询、布局、标签，详见 §30  
**TZ-4：仪表盘/复盘用户时区** — 今日/本周与日历一致，详见 §31  
**TZ-4.5：列表时长与跳转清理** — 裁剪时长与汇总一致，详见 §32  
**TZ-5：时区收尾** — 审计、测试、文档、部署清单，详见 §33

**Phase 9.6：周视图安全拖拽（已完成）** — 详见 §27

**Phase 9.3–9.5：日历布局与周视图体验（已完成）** — 详见 §24–§26

**Phase 9.2：日历拖拽稳定性（已完成）** — 详见 §23

**Phase 9：正计时秒表（已完成）** — 详见 §21

**Phase 7：Docker 化（已完成）** — 详见 §19

**Phase 8A：Vercel + Neon 部署准备（已完成文档）** — 详见 §20；**日常流程**见 [WORKFLOW.md](./WORKFLOW.md)

**Phase 6：用户认证与按用户数据隔离（已完成）** — 详见 §18

**Phase 5 及更早**：专注、复盘、日历等 — 见上文各 Phase 小节

**下一步（推荐）**：专注页 UI 打磨 / 整体 redesign（见 §21.6）

**UI-1：Dashboard + App Shell（已完成第一版）** — 见 §34

**UI-2：Focus 页 UI 打磨（已完成第一版）** — 见 §35

**UI-3：Review 页 v0 风格对齐（已完成第一版）** — 见 §36

- **Phase 9（已完成）正计时秒表**
  - `FocusSession.mode`：`pomodoro` | `stopwatch`（默认 `pomodoro`）
  - `TimeBlock.source`：`manual` | `pomodoro` | `stopwatch`（默认 `manual`）
  - Server Actions：`startStopwatch`、`completeStopwatchAndCreateTimeBlock`、`cancelStopwatch`
  - 每用户最多一个 `status=running` 的 FocusSession（番茄钟与秒表互斥）
  - 秒表结束：事务内 claim → 创建 `TimeBlock`（`source=stopwatch`）→ 链接 `timeBlockId`
  - UI：`StopwatchTimer` + `ElapsedTimer`（客户端仅显示 HH:MM:SS，不写库）
  - 迁移：`20260601120000_add_focus_mode_timeblock_source`
  - 测试：`stopwatch-complete.test.ts` 等（113 tests）

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
  - **click-to-create from calendar**：点击空白时段打开页内创建面板（§5.14）
  - **click-to-edit/delete from calendar**：点击块打开编辑面板，可保存或删除（§5.15）
  - **day view drag-to-move**：日视图列内纵向拖拽（可见段时长、5 分钟吸附、预览与保存一致、00:00–24:00 夹取）— Phase 9.2 加固
  - **day view bottom resize**：日视图底部手柄 resize（只改 `endTime`、5 分钟吸附、最小时长、00:00–24:00 夹取）
  - **week view drag**：同日块列内纵向拖（Phase 9.6）；跨午夜块不可拖；resize 仅日视图
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

- **无 FullCalendar 等第三方库**
- **无冲突检测**：允许 overlaps；重叠块可能遮挡（未分列）
- **无撤销/重做**
- **无重复事件**
- **无外部日历同步**
- **日历内删除**需确认对话框（与列表页一致）
- **周视图不支持跨列拖拽/跨天改变日期**（仅列内交互）
- **重叠块**：同列多条记录可能互相遮挡（未分列）
- **浅色分类 + 白字**：对比度可能不足
- **周列 `compact`**：仅显示标题，时间在 `title` 属性
- **无效 `?date=`**：不回写 URL
- **极短块**：`minHeight` 可能略长于真实时长
- **时间记录页副标题**：仍写「暂无日历」（陈旧文案）

### 5.14 日历空白处点击创建（已完成）

| 项 | 说明 |
|----|------|
| 交互 | 日/周视图列内**空白网格**点击 → 页内 `CalendarBlockCreatePanel` |
| 选中槽位状态 | `CalendarInteractiveView` 客户端 `createDraft`（`startTimeIso` / `endTimeIso`） |
| 时间预填 | `slotTimesFromGridClick`（`src/lib/calendar-slot-create.ts`）：5 分钟吸附 + 默认 **30 分钟**时长，夹取在当日 00:00–24:00 |
| 表单 | 复用 `TimeBlockDatetimeFields`；字段：title、category、status、起止时间、note、completionLevel |
| Server Action | `createTimeBlockFromCalendar`（`calendar-time-blocks.ts`）— 复用 `parseTimeBlockFormData` + `assertCategoryOwned` |
| 保存后 | redirect 回 `/calendar?success=created`；`revalidatePath`：`/calendar`、`/time-blocks`、`/dashboard`、`/review/*` |
| 测试 | `src/lib/calendar-slot-create.test.ts` |

**已知限制**

- 须点击列网格空白处（非已有块）；靠近日末不足 30 分钟时不打开面板
- 创建面板为客户端状态，刷新页面会丢失未保存草稿
- 无 `efficiencyLevel` / `reviewNote`（与列表页创建表单字段略少；可后续补齐）
- 创建面板无 `efficiencyLevel` / `reviewNote`（可后续补齐）

### 5.15 日历点击编辑与删除（已完成）

| 项 | 说明 |
|----|------|
| 选中块 | URL `?blockId=` + 服务端 `selectedBlock`（`timeBlocksForUser` 归属校验） |
| 面板模式 | `resolveCalendarPanelMode`（`src/lib/calendar-panel-mode.ts`）：`create` \| `edit` \| `null`；`CalendarInteractiveView` 管理 `createDraft` + URL `blockId` |
| 编辑表单 | `CalendarBlockEditPanel` — 预填 title/category/起止时间/note/status/completionLevel/efficiency/reviewNote |
| 更新 | `updateTimeBlockFromCalendar`（`updateMany` + `category.userId`；不修改 `source`） |
| 删除 | `deleteTimeBlockFromCalendar` + `DeleteConfirmButton`（含 `calendarDate`/`calendarView` 重定向上下文） |
| 保存/删除后 | redirect 回 `/calendar`（删除时无 `blockId`）；`revalidateTimeBlockPaths` |
| 与创建共存 | 点块清 `createDraft`；点空白清 `blockId`；`panelMode` 互斥 |

**已知限制**

- 编辑/删除为页内面板（非 modal）；跨午夜块在周视图显示裁剪段，编辑的是完整记录
- ~~创建/编辑/删除表单字段仍分散在三处组件~~ → 已抽取 `TimeBlockForm`（§5.16）

### 5.16 可复用 TimeBlock 表单（已完成）

| 项 | 说明 |
|----|------|
| 组件 | `src/components/time-block-form.tsx` — `mode: create \| edit`，共享字段 + `TimeBlockDatetimeFields` |
| 使用处 | `/time-blocks` 创建；`TimeBlockRow` 编辑；`CalendarBlockCreatePanel`；`CalendarBlockEditPanel` |
| 字段 | title、categoryId、status、start/end（ISO）、note；可选 efficiency + reviewNote（**无** completionLevel 输入） |
| Server Actions | 仍由调用方传入 `action`（未内聚到组件内） |
| 面板壳层 | 日历面板仍保留 section 标题/删除区；列表行保留查看/删除按钮 |

**已知限制**

- 日历创建面板仍不显示 efficiency/reviewNote（`showEfficiencyAndReview={false}`，行为与重构前一致）
- 删除按钮仍在 `CalendarBlockEditPanel` / 列表查看模式，不在 `TimeBlockForm` 内

**推荐下一步**：UI polish；或跨列/跨日拖拽（当前未支持）

### 5.18 completionLevel UX 下线（已完成，DB 列保留）

| 项 | 说明 |
|----|------|
| UX | 所有表单、列表、Dashboard、复盘页**不再显示或编辑** completionLevel |
| DB | `TimeBlock.completionLevel` **未删除**；无 Prisma migration |
| 创建 | `resolveCompletionLevelForWrite(status, null)` → completed/partial=100，planned/skipped=0 |
| 更新 | 表单不提交该字段时 **omit** Prisma update，保留库中旧值 |
| Focus 转换 | 仍写入 `completionLevel: 100`（`focus-shared.ts`，未改） |
| 统计 | `summarizeCompletionQuality` 等 **内部函数保留**；用户可见的完成率/平均完成度卡片已移除 |
| 后续 | 单独 Phase 可从 schema + 统计层彻底移除 completionLevel |

**推荐下一步**：数据库与 `stats.ts` 清理 completionLevel（需 migration + 数据回填策略）

### 5.17 日历拖拽与 Resize（已实现，与点击创建/编辑共存）

| 能力 | 日视图 | 周视图 |
|------|--------|--------|
| **拖拽移动** | ✅ 列内纵向；保持可见段时长；5 分钟吸附 | ✅ 仅**同日**块、列内纵向 |
| **Resize** | ✅ 底部手柄；只改 `endTime` | ❌ `compact` 列 `enableResize={false}` |
| **跨列/改日期** | ❌ | ❌ |
| **跨午夜块** | 可显示/点击编辑；拖动可见段可能保存为**单日**块 | 不可拖（`canDragCalendarColumnBlockInWeekView`） |

**实现文件**

- `CalendarDraggableBlock` — pointer 拖/resize 预览 + 保存
- `CalendarDayColumn` — `enableDrag` / `canDragBlock` / `enableResize={!compact}`
- `updateTimeBlockSchedule` — 仅更新 `startTime`/`endTime`；`assertTimeBlockOwned`；`revalidateTimeBlockPaths`
- `src/lib/calendar.ts` — `calculateMovedRange`、`calculateResizedRange`、`calculateSnappedDragTopPx`
- `src/lib/week-view-drag.ts` — 周视图同日块门控

**失败回滚**

- 无乐观持久化：松手后先清预览偏移，再调 Server Action
- 失败：`onSaveEnd(false)` → `CalendarInteractiveView` 显示 `drag.saveFailed` + `router.refresh()` 拉回服务端数据
- 无效 resize/移动：`calculateMovedRange` / `calculateResizedRange` 返回 `ok: false` → 不写入库

**与点击创建/编辑**

- 轻点块（未过 `DRAG_THRESHOLD_PX`）→ `onSelect` → 编辑面板
- 拖块体不触发空白格 `onEmptySlotClick`（事件在子元素上）
- 拖拽保存不调用 create/update 全量表单 action

**手动测试**：见 §23.5、§27.3 及下方清单

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
| source | String | 默认 `manual`；`manual` \| `pomodoro` \| `stopwatch` |
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
| mode | String | 默认 `pomodoro`；`pomodoro` \| `stopwatch` |
| plannedDurationMinutes | Int | 计划时长（分钟，须 > 0）；秒表用占位值 `1`（UI 用实际经过时长） |
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
| `convertFocusSessionToTimeBlock` | 仅 `completed` 且未转换；创建 `TimeBlock`（`source=pomodoro`）并链接 |
| `startStopwatch` | 创建 `mode=stopwatch`、`status=running`；拒绝已有 running 会话 |
| `completeStopwatchAndCreateTimeBlock` | 事务结束秒表并创建 `TimeBlock`（`source=stopwatch`） |
| `cancelStopwatch` | `abandoned`，不创建 TimeBlock |

### 迁移

- `20260521173159_init`
- `20260521180044_add_category_description`
- `20260528030837_add_timeblock_review_fields`（新增 `TimeBlock.efficiencyLevel`、`TimeBlock.reviewNote`）
- `20260529120000_add_focus_session`（新增 `FocusSession` 表）
- `20260601120000_add_focus_mode_timeblock_source`（`FocusSession.mode`、`TimeBlock.source`）

## 7. 已实现页面

| 路由 | 类型 | 功能 |
|------|------|------|
| `/` | 动态 | 应用介绍、快速入口（含日历） |
| `/categories` | 动态 | 分类 CRUD（查看/编辑模式 + 顶部新建表单） |
| `/time-blocks` | 动态 | 时间块 CRUD（列表 + 表单） |
| `/calendar` | 动态 | **周/日视图**（默认周）；`?date=`、`?view=day\|week` |
| `/dashboard` | 动态 | 时间块统计 + 图表 + 专注会话统计（分区展示） |
| `/focus` | 动态 | 正计时秒表 + 番茄钟；秒表结束自动写入时间块 |

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
- **专注**：番茄钟暂停不写入数据库；刷新后番茄钟倒计时 UI 不恢复（秒表 `running` 会话会从数据库恢复）
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

## 16. 建议下一阶段（Phase 8B 及以后）

1. **Sealos 部署**（Phase 8B）：复用 Phase 7 Docker 镜像；镜像仓库、应用、PostgreSQL、环境变量、域名、OAuth callback
2. **Vercel + Neon 实际上线**（Phase 8A 文档已就绪）：按 `docs/DEPLOYMENT_VERCEL_NEON.md` 手动部署并验证
3. **统计精度**：跨午夜 TimeBlock / FocusSession 按天裁剪拆分（与日历一致）
4. **专注增强**：localStorage 恢复进行中计时、可选浏览器通知
5. **复盘**：Review 页纳入 FocusSession 摘要（可选）
6. 更远期：重复事件、外部日历、E2E、多因素认证

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

**Phase 8A — Vercel + Neon**（文档）→ **Phase 8B — Sealos**（Docker 镜像路径）

## 20. Phase 8A — Vercel + Neon 部署准备（已完成）

### 20.1 本阶段目标

- 文档化 Vercel + Neon 部署路径（**无新用户功能**）
- 保留 Phase 7 Docker / 未来 Sealos（Phase 8B）路径
- 确认现有 `package.json` build 脚本与 Auth/Prisma 配置可用于 Vercel

**未做**：实际上线部署、Sealos、Neon serverless driver 改造、移除 Docker 文件。

### 20.2 部署就绪结论

| 项 | 状态 | 说明 |
|----|------|------|
| `build` 脚本 | ✅ | `prisma generate && next build`；**未**在 build 中跑 migrate |
| `postinstall` | — | 无；generate 在 build 内 |
| Prisma + Neon | ✅ | `DATABASE_URL` + `?schema=app`；`prisma.config.ts` 读 env |
| Auth 变量名 | ✅ | `AUTH_URL`（非 `NEXTAUTH_URL`）、`AUTH_GITHUB_*`、`AUTH_TRUST_HOST` |
| middleware | ⚠️ | Next 16 可能警告 middleware→proxy；不阻塞 Vercel |
| `output: standalone` | ℹ️ | 为 Docker 保留；Vercel 忽略 standalone 产物 |
| 本地 Docker | ✅ | 未改动 `docker-compose.yml` / `Dockerfile` |

### 20.3 新增 / 修改文件

| 文件 | 说明 |
|------|------|
| `docs/DEPLOYMENT_VERCEL_NEON.md` | 完整 Vercel + Neon 首次部署指南 |
| `docs/WORKFLOW.md` | 本地开发 + 部署上线 + 双环境 + 用量说明 |
| `.env.example` | Neon / Vercel 注释 |
| `README.md` | 链接 WORKFLOW / 部署文档 |
| `docs/PROJECT_STATUS.md` | 本节 |
| `docs/AI_CONTEXT.md` | Phase 8A 摘要 |

**无业务代码变更**（Phase 8A 仅文档 + `.env.example` 注释）。

### 20.4 Vercel 环境变量（生产）

与 §10 / §18.4 相同，额外注意：

- `DATABASE_URL`：Neon **Pooled** URL + `schema=app`
- `AUTH_URL`：`https://<vercel-domain>`（非 localhost）
- 迁移：**手动** `pnpm exec prisma migrate deploy` 指向 Neon（不在 Vercel build 中）

### 20.5 已知风险（上线时）

- Vercel 构建前须已配置 `DATABASE_URL`（`prisma.config.ts` 需要）
- Serverless + `pg.Pool`：高并发宜用 Neon pooler URL
- GitHub OAuth callback 须与 `AUTH_URL` 一致

### 20.6 下一阶段

**Phase 8B — Sealos**：使用 Phase 7 `Dockerfile` + `docs/DOCKER.md`

## 21. Phase 9 — 正计时秒表（已完成）

### 21.1 目标

用户选择分类、可选标题/备注 → **开始计时**（从 `00:00:00` 向上）→ **结束并保存** 自动创建已完成 `TimeBlock`（真实 `startTime` / `endTime`）。

### 21.2 数据模型

| 模型 | 字段 | 说明 |
|------|------|------|
| `FocusSession` | `mode` | `pomodoro`（默认）或 `stopwatch` |
| `TimeBlock` | `source` | `manual`（默认）、`pomodoro`（番茄转换）、`stopwatch`（秒表结束） |

秒表 `plannedDurationMinutes` 使用常量 `STOPWATCH_PLANNED_DURATION_PLACEHOLDER_MINUTES = 1`（满足 DB/校验；展示与统计用 `actualDurationMinutes` 或起止时间）。

取消秒表：`status=abandoned`（与番茄「放弃」一致，未新增 `canceled` 状态）。

### 21.3 Server Actions（`src/lib/actions/focus-sessions.ts`）

| Action | 行为 |
|--------|------|
| `startStopwatch` | `requireUser` + `assertCategoryOwned` + 无其它 `running` 会话 |
| `completeStopwatchAndCreateTimeBlock` | `completeStopwatchInTransaction`：claim `running`+`stopwatch`+未转换 → 创建块 → `timeBlockId` |
| `cancelStopwatch` | `updateMany` 条件 claim，`abandoned`，无 TimeBlock |
| `createFocusSession`（番茄） | 同样检查无 `running`；写入 `mode=pomodoro` |

防重复：`updateMany` 条件 claim；第二次结束返回 `already_converted`，不创建第二块。

### 21.4 UI 组件

| 组件 | 说明 |
|------|------|
| `src/components/stopwatch-timer.tsx` | 秒表表单与进行中/结束/取消 |
| `src/components/elapsed-timer.tsx` | 接收 `startTimeIso`，客户端 HH:MM:SS |
| `src/components/focus-timer.tsx` | 番茄钟（行为不变；与其它 running 会话互斥提示） |

`/focus` 服务端加载 `status=running` 会话；秒表模式刷新后恢复 UI。

### 21.5 与番茄钟差异

| | 番茄钟 | 秒表 |
|--|--------|------|
| 计时方向 | 倒计时 | 正计时 |
| 计划时长 | 用户选择 | 占位 1 分钟（不用作 UI） |
| 结束 | `complete` → 可选「转为时间块」 | 一步「结束并保存」 |
| 最终 FocusSession | 常 `converted`（若转换） | `completed` + `convertedToTimeBlock=true` |
| TimeBlock.source | `pomodoro` | `stopwatch` |

### 21.6 Dashboard / 重复计数

- **时间块统计**：仅 `TimeBlock`（`src/lib/stats.ts`）— 秒表保存后计入此处。
- **专注统计**：仅 `FocusSession`（`src/lib/focus-stats.ts`）— 已保存秒表计为 `convertedToTimeBlock` 的 completed 会话。
- **与 Phase 5.6 相同**：两栏为双视角，勿将「记录时间」与「专注时长」简单相加；未改 Dashboard 结构。

### 21.7 手动测试清单

- [ ] 开始秒表 → 计时递增 → 结束并保存 → `/time-blocks` 与 `/calendar` 出现一条 `completed` 块
- [ ] 秒表进行中刷新 `/focus` → 仍显示进行中与已用时长
- [ ] 已有 running 秒表时无法再开番茄钟 / 第二个秒表（提示 `session_already_running`）
- [ ] 双击「结束并保存」仅一条 TimeBlock
- [ ] 取消秒表 → 无 TimeBlock；FocusSession 为 `abandoned`
- [ ] 用户 B 无法操作用户 A 的 session id
- [ ] Dashboard：时间块时长含秒表记录；专注区「已写入时间块」计数合理

### 21.8 已知限制

- 番茄钟进行中刷新仍不恢复倒计时 UI（仅 DB 中 `running` 行存在）
- 秒表无暂停（Phase 9 范围外）
- `TimeBlock.source` 尚未在列表 UI 展示
- 无浏览器通知 / PWA

### 21.9 建议下一阶段

专注页 UI 打磨（分区视觉、历史列表标注 mode/source）、可选番茄刷新恢复（localStorage）。

## 22. Phase 9.1 — 专注僵尸会话与分类删除（已完成）

### 22.1 修复的问题

| 问题 | 原因 | 修复 |
|------|------|------|
| 放弃后仍提示「有进行中」 | `historyNoCompleted` 在无 completed 时隐藏列表且文案误导 | 始终展示列表；区分 running / 仅 abandoned |
| 刷新后无法放弃番茄钟 | 放弃依赖客户端 `sessionId` | 服务端 `running` 番茄显示「放弃未结束的会话」 |
| 历史里无法处理 running | 列表被隐藏 | running 行显示放弃/取消按钮 |
| 分类删不掉（仅 abandoned） | 删除统计全部 FocusSession | 删除时清理 `abandoned`；仅 TimeBlock / 非 abandoned 阻挡 |

### 22.2 分类删除新规则

- **阻挡**：该分类下存在 TimeBlock；或 `running` / `planned` / `completed` / `converted` 的 FocusSession
- **不阻挡**：仅有 `abandoned` 的 FocusSession（删除分类时在事务内 `deleteMany` 清理 abandoned 后删分类）
- **无 schema 变更**；`FocusSession.categoryId` 仍为 `onDelete: Restrict`

### 22.3 新增/修改

| 文件 | 说明 |
|------|------|
| `src/lib/focus-session-status.ts` | `isFocusSessionRunning`、`blocksCategoryDeletionFocusStatus` 等 |
| `src/components/focus-history.tsx` | 列表常显、banner、running 操作 |
| `src/components/focus-timer.tsx` | `orphanRunningPomodoro` 恢复放弃 |
| `src/lib/actions/categories.ts` | 分步校验 + 事务删除 abandoned |
| `src/app/categories/page.tsx` | 按阻挡原因显示不可删文案 |

### 22.4 手动测试清单

- [ ] 番茄开始 → 刷新 → 番茄区「放弃未结束的会话」→ 历史无 running
- [ ] 秒表开始 → 刷新 → 秒表区取消或历史「取消计时」
- [ ] 仅 abandoned 专注、无时间块 → 可删除分类
- [ ] 有 TimeBlock 或 running/completed 专注 → 不可删，提示含数量
- [ ] 历史仅有 abandoned 时显示「尚无已完成…」，不显示「有进行中」

### 22.5 已知限制

- `planned` 仍阻挡分类删除（极少使用）
- 已完成未转换的 FocusSession 仍阻挡删除（需先转换或后续产品决策）

## 23. Phase 9.2 — 日历拖拽稳定性（已完成）

### 23.1 修复的问题

| 问题 | 原因 | 修复 |
|------|------|------|
| 拖放落点不可预测 | 拖拽用整段 `startTime`/`endTime` 而非列内可见段；跨午夜块时长与视觉不符 | 传入 `visibleStart`/`visibleEnd` 计算移动与保存 |
| 松手后块「跳一下」 | 拖动预览未吸附，仅在 `pointerup` 吸附 | `calculateSnappedDragTopPx` + 移动过程同步 5 分钟吸附 |
| 周视图拖拽混乱 | 多列同块 + 整段时长 | **周视图关闭拖拽**；提示改用日视图 |

### 23.2 当前行为

| 视图 | 拖拽 | Resize | 点击编辑 |
|------|------|--------|----------|
| **日视图** | ✅ 纵向移动（可见段时长） | ✅ 底部手柄 | ✅ |
| **周视图** | ✅ 仅同日块、列内（9.6） | ❌ | ✅ |

- **吸附**：`CALENDAR_SNAP_MINUTES` = 5（预览与保存一致）
- **边界**：结果夹在当日 `00:00–24:00`；`endTime > startTime`；最小时长 `MIN_TIME_BLOCK_DURATION_MINUTES`
- **保存**：`updateTimeBlockSchedule`（用户隔离不变）；失败刷新并提示

### 23.3 跨午夜块（已知产品限制）

在日视图中拖动**裁剪后的可见段**，保存后会把该时间块改为**当日内的起止时间**（可见段时长不变）。不会保留跨日多段；完整跨日编辑留待后续 Phase。

### 23.4 新增/修改

| 文件 | 说明 |
|------|------|
| `src/lib/calendar.ts` | `minutesToPixelY`、`calculateSnappedDragTopPx` |
| `src/components/calendar-draggable-block.tsx` | 可见段 ISO、吸附预览、resize 用可见起点 |
| `src/components/calendar-day-column.tsx` | 传入 `visibleStartIso` / `visibleEndIso` |
| `src/components/calendar-week-grid.tsx` | 移除 `enableDrag` |
| `src/lib/calendar.test.ts` | 可见段移动 / 吸附 / 跨午夜裁剪用例 |

### 23.5 手动测试清单

- [ ] 日视图：拖 30 分钟块下移 30 分钟，时长仍为 30 分钟
- [ ] 日视图：拖动过程与松手位置均为 5 分钟格
- [ ] 日视图：刷新后位置与保存一致
- [ ] 日视图：拖到顶部/底部不越界
- [ ] 日视图：底部 resize 改时长；拖块体不触发 resize
- [ ] 周视图：块可显示、不可拖；点击仍可编辑
- [ ] 跨午夜块：日视图拖动可见段行为可预期（可能变为同日块）
- [ ] 保存失败时出现错误提示且数据恢复

### 23.6 建议后续

- 周视图可靠的目标列检测 + 列内拖拽（见 §26 未来规则）
- 真正的跨日 / 跨午夜块编辑（不强制合并为单日）
- 可选：resize 预览也做 5 分钟吸附

## 24. Phase 9.3 — 日视图布局与时间显示（已完成）

### 24.1 修复内容

- **可见段**：`getVisibleSegmentInDay` + `layoutBlocksInDay` 统一裁剪与定位。
- **重叠分列**：`visibleIntervalsOverlap` + `assignOverlapColumns`；真重叠并排显示，相邻（如 05:00 结束 / 05:00 开始）不重叠。
- **垂直位置**：`topPercent` / `heightPercent` 仅由可见段计算；移除 `minHeight` 撑高导致的视觉压盖。
- **时间文案**：`formatCalendarBlockTimeLabel` — 未裁剪显示原时段；裁剪段显示可见时段 + `continued` / `续`。
- **周/日共用**：`mapBlocksForDay` 经 `layoutBlocksInDay` 一次布局整列。

### 24.2 主要文件

| 文件 | 说明 |
|------|------|
| `src/lib/calendar.ts` | 可见段、重叠列、时间标签 |
| `src/lib/calendar-block-style.ts` | 列宽/left 样式 |
| `src/app/calendar/page.tsx` | `mapBlocksForDay` |
| `src/components/calendar-block.tsx` | 按 layout 定位 |
| `src/components/calendar-draggable-block.tsx` | 同上，保留 9.2 拖拽 |
| `src/lib/calendar.test.ts` | 可见段 / 重叠 / 跨午夜用例 |

### 24.3 已知限制

- 跨午夜块在日视图拖动保存仍可能变为单日块（9.2 规则不变）。
- 极短块可能文字被 `overflow: hidden` 裁切（不再用 minHeight 撑开）。

## 25. Phase 9.4 — 周视图概览与点击编辑（已完成）

### 25.1 行为

| 能力 | 周视图 |
|------|--------|
| 按可见段显示 | ✅ 与日视图同一套 `layoutBlocksInDay` |
| 点击块编辑 | ✅ `onBlockSelect` → `blockId` 面板 |
| 列头进日视图 | ✅ `dayHref` → `?view=day&date=` |
| 拖拽 | ✅ 同日块列内（9.6） |
| resize | ❌ compact 周列关闭 |
| 提示文案 | ✅ `calendar.drag.weekViewHint` |

### 25.2 文件

- `calendar-week-grid.tsx` — 传入 `continuedSegmentLabel`；注释说明不启用拖拽。
- `calendar-interactive-view.tsx` — 周视图 `role="note"` 提示。

## 26. Phase 9.5 — 周视图拖拽预案（已完成，已由 9.6 启用）

### 26.1 历史

9.5 引入 `canDragTimeBlockInWeekView`；9.6 已接入周视图 UI。

## 27. Phase 9.6 — 周视图安全拖拽（已完成）

### 27.1 行为

| 能力 | 周视图 |
|------|--------|
| 同日块列内纵向拖 | ✅ `canDragCalendarColumnBlockInWeekView` |
| 5 分钟吸附 + 日界夹取 | ✅ 复用 `CalendarDraggableBlock` |
| 保存 | ✅ `updateTimeBlockSchedule` + `router.refresh` |
| 跨午夜 / 多日块 | ❌ 不可拖，可点击编辑；`title` 提示进日视图 |
| resize | ❌ `enableResize={false}`（compact 周列） |
| 跨列 / 改日期 | ❌ 未实现 |

### 27.2 文件

| 文件 | 说明 |
|------|------|
| `calendar-week-grid.tsx` | `enableDrag` + `canDragBlock` + 列 `calendarDate` |
| `calendar-day-column.tsx` | 按块 `canDragBlock` 选择 Draggable vs Block |
| `calendar-draggable-block.tsx` | `enableResize` 可选 |
| `week-view-drag.ts` | `canDragCalendarColumnBlockInWeekView` |
| i18n `calendar.drag.weekViewHint` / `dragDisabledInWeek` | 提示文案 |

### 27.3 手动测试清单（9.6）

- [ ] 周视图周一 07:00–09:00 列内下拖，仍在周一，时长 2h
- [ ] 5 分钟吸附；刷新后时间正确
- [ ] 横向移动不改变日期
- [ ] 22:00–04:00 不可拖，可点击编辑
- [ ] 日视图拖/resize 仍正常

### 27.4 已知限制 / 后续

- 跨列、跨日拖：未做
- 周视图跨午夜仍建议在日视图编辑
- 跨午夜块在日视图拖动保存仍为单日（9.2）

## 28. TZ-1 — 用户本地时区基础设施（已完成本阶段）

### 28.1 行为

| 项 | 说明 |
|----|------|
| 浏览器检测 | `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| Cookie | `calendar_time_zone=<IANA>`，`path=/`，`SameSite=Lax`，1 年 |
| 客户端 | `TimezoneInitializer` 挂在根 `layout` |
| 同步 | Cookie 缺失或与浏览器不一致时写入，并 **最多 refresh 一次**（`sessionStorage` `calendar_tz_refresh_for` 防循环） |
| 服务端 | `getUserCalendarTimeZone()` 读 cookie → `NEXT_PUBLIC_CALENDAR_TIMEZONE` → **UTC** |
| 校验 | `isValidIanaTimeZone()`（Intl 探测） |

### 28.2 尚未迁移（TZ-4+）

- 仪表盘、复盘仍用 legacy `getCalendarTimeZone()` 默认（env / Asia/Shanghai）

## 29. TZ-2 — 表单 datetime-local → UTC ISO（已完成本阶段）

### 29.1 行为

| 项 | 说明 |
|----|------|
| 客户端 | `TimeBlockDatetimeFields` 同步隐藏字段 `startTimeIso` / `endTimeIso` |
| 转换 | `datetimeLocalValueToUtcIso`（浏览器本地墙钟 → `toISOString()`） |
| 编辑默认值 | `instantToDatetimeLocalValue(utc, getUserCalendarTimeZone())` |
| 服务端 | `parseTimeBlockScheduleFromForm` **仅**接受有效 `startTimeIso` / `endTimeIso` |
| 加固 | 已移除生产环境 `parseDateTimeLocal` 回退；缺/无效 ISO → `missing_fields` |
| 提交前 | `formId` + capture-phase `submit` 同步隐藏 ISO（转换失败则 `preventDefault`） |
| 未改 | 日历查询/布局、Prisma schema |

### 29.2 文件

| 文件 | 说明 |
|------|------|
| `src/lib/datetime-local-iso.ts` | 纯函数 + 测试（纽约/上海 09:00） |
| `src/components/time-block-datetime-fields.tsx` | 共用 datetime 字段 |
| `src/lib/actions/time-block-shared.ts` | `parseTimeBlockScheduleFromForm` |
| `src/app/time-blocks/page.tsx` | 创建/编辑 |
| `src/components/time-block-row.tsx` | 列表编辑 |
| `src/components/calendar-block-edit-panel.tsx` | 日历编辑 |

### 29.3 TZ-2 加固（已完成）

- Server Action **不再**解析无时区 `startTime`/`endTime` 字符串
- 仅 `startTimeIso`/`endTimeIso`；缺失或无效 → `missing_fields`（不会静默写成错误 UTC）
- 客户端提交前强制同步隐藏 ISO 字段

### 29.4 手动验证 TZ-2

- [ ] 创建 09:00–10:00：payload 含 `startTimeIso`/`endTimeIso`（`Z` 结尾），保存后时间正确
- [ ] 编辑不改时间：时间不漂移
- [ ] 编辑改时间：显示与保存一致
- [ ] **Vercel** 上重复上述三项
- [ ] 仅 `startTime`/`endTime`、无 ISO 的请求不会成功创建错误时间（应 `missing_fields`）
- [ ] 日历编辑：同上

## 30. TZ-3 — 日历用户时区（已完成本阶段）

### 30.1 行为

| 项 | 说明 |
|----|------|
| 时区来源 | `/calendar` 服务端 `getUserCalendarTimeZone()`（cookie → env → UTC） |
| `?date=YYYY-MM-DD` | 用户时区下的**民用日期**（非 `new Date("YYYY-MM-DD")` UTC 解析） |
| 查询 | `getDayQueryRange` / `getWeekQueryRange` 在用户 TZ 算日界，转 UTC 查 Prisma |
| 布局 | `getVisibleSegmentInDay` / `layoutBlocksInDay` 按用户 TZ 日界裁剪与定位 |
| 标签 | `formatTimeOfDay` / `formatCalendarBlockTimeLabel` 显式 `timeZone` |
| 拖拽 | 客户端传入 `userTimeZone`；仍保存 UTC ISO |
| 未改 | Prisma schema；仪表盘/复盘（TZ-4） |

### 30.2 文件

| 文件 | 说明 |
|------|------|
| `src/lib/calendar.ts` | 各函数增加 `timeZone` 参数 |
| `src/app/calendar/page.tsx` | 全链路传入 `userTimeZone` |
| `src/components/calendar-*` | 标签与拖拽使用 `userTimeZone` |
| `src/lib/calendar-user-timezone.test.ts` | 纽约/上海日界、09:00 布局、跨午夜 |

### 30.3 已知限制

- 周视图跨午夜块仍不可拖（Phase 9.6）；日视图拖可见段可能保存为单日块（9.2）
- （TZ-4.5 已修复 `buildCalendarRedirectPath` 与 Review 列表时长显示）
- Cookie 与浏览器时区不一致时，表单提交（TZ-2）与日历显示可能短暂不一致，直到 refresh

### 30.4 手动验证 TZ-3

- [ ] Chrome Sensors → `America/New_York`：创建 09:00–10:00，日历显示在 09:00 行
- [ ] 切换 `Asia/Shanghai` 并 refresh：本地 09:00 块位置正确
- [ ] 22:00–04:00 跨午夜：起始日 22:00–24:00、次日 00:00–04:00
- [ ] 日/周视图块落在正确日期列
- [ ] 日视图拖/resize 仍正常
- [ ] **Vercel** 与本地一致

## 31. TZ-4 — 仪表盘与复盘用户时区（已完成本阶段）

### 31.1 行为

| 项 | 说明 |
|----|------|
| 时区 | `getUserCalendarTimeZone()` 于 `/dashboard`、`/review/day`、`/review/week` |
| 今日/本周 | `getDashboardDateRanges(now, userTimeZone)` 与日历 `getDayQueryRange` / `getWeekQueryRange` 一致 |
| 查询 | TimeBlock：`startTime < rangeEnd` 且 `endTime > rangeStart`（重叠） |
| 今日/本周总时长 | `totalRecordedMinutesInRange`（按区间裁剪） |
| 周柱状图 | `dailyTotalsForSelectedWeek`（跨午夜按本地日裁剪，不重复计入两日） |
| 周汇总饼图/质量 | 块先 `clipTimeBlockToWindow` 到本周再聚合 |
| Focus | 仍按 `startTime` 落在区间内；与 TimeBlock 统计分离（不重复计入分类时长） |

### 31.2 文件

| 文件 | 说明 |
|------|------|
| `src/lib/dashboard-ranges.ts` | 需显式 `timeZone` |
| `src/lib/stats.ts` | `totalRecordedMinutesInRange`、`clipTimeBlockToWindow`、按 TZ 分组 |
| `src/app/dashboard/page.tsx` | 重叠查询 + 裁剪统计 |
| `src/app/review/day/page.tsx` | 用户 TZ 日界 |
| `src/app/review/week/page.tsx` | 用户 TZ 周界 |
| `src/lib/dashboard-ranges.test.ts` | 与日历范围一致 |
| `src/lib/stats-timezone.test.ts` | 跨午夜裁剪 |

### 31.3 手动验证 TZ-4

- [ ] 纽约：今日 09:00–10:00 → Dashboard 今日约 1 小时
- [ ] 纽约：22:00–04:00 → 两日各显示裁剪后时长（2h + 4h）
- [ ] 上海：重复上述
- [ ] Review/day 与 Calendar/day 同一块列表一致
- [ ] Review/week 与 Calendar/week 一致
- [ ] **Vercel** 与本地一致

## 32. TZ-4.5 — 列表时长与日历跳转清理（已完成）

### 32.1 行为

| 项 | 说明 |
|----|------|
| Review 列表 | `formatBlockDurationInRange` — 显示区间内裁剪时长；跨午夜显示「本日/本周 X · 共 Y」 |
| Review/Dashboard 汇总 | `clipBlocksToRange` + `summarizeCompletionQuality` 与列表/图表同一裁剪语义 |
| 日历跳转 | `buildCalendarRedirectPath(..., userTimeZone)`；`YYYY-MM-DD` 原样保留 |
| Focus | **不变**：仍按会话 `startTime` 归入今日/本周；文案已说明 |

### 32.2 手动验证

- [ ] 22:00–04:00：起始日复盘列表约 2h（非 6h）；次日约 4h
- [ ] 汇总「计划时长」与列表裁剪一致
- [ ] 日历编辑保存后 `?date=` 仍为正确本地日
- [ ] 纽约/上海切换后行为一致

## 33. TZ-5 — 时区收尾（已完成本阶段）

### Timezone model

| 规则 | 说明 |
|------|------|
| 数据库 | `DateTime` 存 **UTC 瞬时**（`startTime` / `endTime`） |
| 用户时区 | 浏览器 `Intl` 检测，写入 cookie **`calendar_time_zone`** |
| 服务端读取 | `getUserCalendarTimeZone()`：cookie → `NEXT_PUBLIC_CALENDAR_TIMEZONE` → `UTC` |
| URL `?date=YYYY-MM-DD` | 用户时区下的**本地日历日**（`parseCalendarDateParam`，非 `new Date("YYYY-MM-DD")`） |
| 日/周查询 | `getDayQueryRange` / `getWeekQueryRange` 在用户 TZ 算边界，转 UTC 查 Prisma |
| 表单 | `datetime-local` 在浏览器转 **`startTimeIso` / `endTimeIso`**；Server Action **仅**接受 UTC ISO |
| 仪表盘/复盘 | 与日历同一模型：`getDashboardDateRanges`、重叠查询、按日/周裁剪时长 |
| 环境变量 | `NEXT_PUBLIC_CALENDAR_TIMEZONE` **仅作 cookie 未设置时的 fallback** |
| Focus | `FocusSession` 按会话 **`startTime`** 归入日/周（非重叠裁剪）；与 TimeBlock 统计分离 |

**已知限制**

- 尚无「固定家乡时区」用户设置；旅行时依赖浏览器/cookie 刷新。
- 用户改系统/浏览器时区后需 refresh，cookie 会更新。
- 周视图跨午夜块不可拖（Phase 9.6）；日视图拖可见段可能保存为单日块。
- `getCalendarTimeZone()` / `Asia/Shanghai` 仍为部分 helper **默认参数**（用户页均传显式 `userTimeZone`）。

### 33.1 审计结论（TZ-5.1）

| 模式 | 结论 |
|------|------|
| `new Date("YYYY-MM-DD")` | 生产路径已避免；仅测试或遗留默认 TZ 的 `calendar.test.ts` |
| `new Date("YYYY-MM-DDTHH:mm")` | 生产 Server Action 已禁止；`datetime-local-iso` 客户端转换 |
| `toISOString().slice(0, 10)` | 无用于用户本地分组 |
| `getFullYear/getMonth/...` | `time.ts` 中 `toDateTimeLocalValue` **已弃用**（host TZ）；用户页用 `instantToDatetimeLocalValue(..., userTimeZone)` |
| 无 `timeZone` 的 `Intl`（用户页） | **已修** `review/week` 日分解标题 |
| `durationMinutesSafe` 在日/周列表 | Review 列表已用 `formatBlockDurationInRange` |
| `buildCalendarRedirectPath` | 传 `userTimeZone`；`YYYY-MM-DD` 原样保留 |

### 33.2 测试（TZ-5.3）

| 文件 | 覆盖 |
|------|------|
| `src/lib/timezone-integration.test.ts` | NY/SH 09:00 UTC、日/周界、跨午夜裁剪、复盘日界、redirect、TZ-2 严格解析 |
| `src/lib/calendar-user-timezone.test.ts` | 日历布局与可见段 |
| `src/lib/dashboard-ranges.test.ts` | 仪表盘与日历范围一致 |
| `src/lib/stats-timezone.test.ts` | 周柱状图跨午夜 |
| `src/lib/datetime-local-iso.test.ts` | `wallTimeInTimeZoneToUtcIso` |
| `src/lib/calendar-redirect-timezone.test.ts` | 跳转路径 |

说明：`datetimeLocalValueToUtcIso` 依赖浏览器本地时区，集成测试以 `wallTimeInTimeZoneToUtcIso` 为确定性对照；手动清单验证真实浏览器。

### 33.3 文件变更（本阶段）

| 文件 | 说明 |
|------|------|
| `src/app/review/week/page.tsx` | 日分解 `Intl` 增加 `timeZone: userTimeZone` |
| `src/lib/timezone-integration.test.ts` | TZ-5 集成测试 |
| `.env.example` | 时区 fallback 说明更新 |
| `docs/PROJECT_STATUS.md` / `docs/AI_CONTEXT.md` | Timezone model + 清单 |

### Manual timezone test checklist

1. Chrome DevTools → Sensors → **America/New_York**。
2. 刷新应用，确认 cookie **`calendar_time_zone`** = `America/New_York`。
3. 创建 **2026-06-01 09:00–10:00**。
4. 确认 Calendar 日视图显示 **09:00–10:00**。
5. 确认周视图落在 **2026-06-01** 列。
6. 确认 Dashboard 今日统计计入本地 **2026-06-01**。
7. 确认 Review/day 与 Calendar/day 一致。
8. 创建 **22:00–04:00**，确认跨本地两日正确拆分（2h + 4h）。
9. Sensors → **Asia/Shanghai**，刷新，确认 cookie 为 `Asia/Shanghai`。
10. 重复步骤 3–8。
11. Neon 中确认存 **UTC 瞬时**（非本地字符串）。
12. 部署 **Vercel** 后重复关键步骤。
13. 确认行为不依赖本地 dev 服务器 `TZ`（与 Vercel 一致）。

### 33.4 部署就绪

- 无 Prisma schema 变更；无需新 migration。
- 时区逻辑为代码层；Vercel 上应使用 Neon pooled `DATABASE_URL` + `AUTH_*` + 可选 `NEXT_PUBLIC_CALENDAR_TIMEZONE`。
- **建议**：合并前本地 `pnpm test` + `pnpm build`；上线后按上方 Manual checklist 在 NY/SH 各测一轮。

### 28.3 文件

| 文件 | 说明 |
|------|------|
| `src/components/timezone-initializer.tsx` | 写 cookie + 条件 refresh |
| `src/lib/user-calendar-timezone.ts` | 纯函数 + 常量 |
| `src/lib/user-calendar-timezone.server.ts` | `getUserCalendarTimeZone()` |
| `src/app/layout.tsx` | 挂载 initializer |

### 28.4 手动验证 TZ-1

- [ ] DevTools → Application → Cookies 出现 `calendar_time_zone`
- [ ] 与系统时区一致（如 `America/New_York` / `Asia/Shanghai`）
- [ ] 改系统时区后刷新页面，cookie 更新且不会无限刷新
- [ ] 服务端临时日志 `getUserCalendarTimeZone()` 与 cookie 一致

### 26.3 手动测试清单（9.3–9.5）

- [ ] 日视图 07:00–09:00 位置准确
- [ ] 相邻 04:00–05:00 与 05:00–06:00 不叠压
- [ ] 重叠 06:00–08:00 与 07:00–09:00 并排可读
- [ ] 跨午夜在起始日 22:00–24:00、次日 00:00–04:00 显示正确
- [ ] 日视图拖/resize 仍正常
- [ ] 周视图显示正确、可点击编辑、列头进日视图、不可拖
- [ ] 刷新后位置正确

## 34. UI-1 — Dashboard + App Shell（已完成第一版）

### 34.1 目标

- 参考 `reference/v0` 的视觉与结构，**不**直接复制 mock 数据或 import 生产代码
- 替换顶栏 `AppNav` 为 **侧边栏 + 顶栏 App Shell**（已登录应用路由）
- 重构 `/dashboard` 为 Card 布局：概览统计、进行中计时、快速开始、周图表、分类分布、最近时间块
- **不改** Prisma schema、Server Actions、统计口径（`stats.ts` / `focus-stats.ts` 仍分离）

### 34.2 行为

| 项 | 说明 |
|----|------|
| App Shell | 路由 `/categories`、`/time-blocks`、`/calendar`、`/dashboard`、`/focus`、`/review/*` 使用 `SidebarProvider` + `AppSidebar` + `AppHeader` |
| 公开页 | `/`、`/login` 仍为简化顶栏 + `max-w-4xl` 内容区 |
| 导航 | `src/lib/app-nav-config.ts` — 图标侧栏项；回顾链至 `/review/day` |
| 顶栏 | 当前页标题、占位搜索框（未接业务）、「新建时间块」→ `/time-blocks` |
| Dashboard 数据 | 服务端 `dashboard/page.tsx` 仍用 `*ForUser` + `getDashboardDateRanges` + 现有 stats/focus 函数 |
| 进行中计时 | `runningFocusSessionForUser` + 客户端 `ElapsedTimer`；操作链至 `/focus`（不新增 timer actions） |
| 快速开始 | 分类按钮链至 `/focus`（最多 4 个） |
| 主题 | `globals.css` 青绿 primary（对齐 v0 参考色） |

### 34.3 新增 / 修改文件

| 文件 | 说明 |
|------|------|
| `src/components/app-shell.tsx` | Shell 组合 |
| `src/components/app-sidebar.tsx` | 侧栏导航 + 用户区 + 语言切换 |
| `src/components/app-header.tsx` | 顶栏 |
| `src/components/app-layout-controller.tsx` | 按路由切换 Shell / 公开布局 |
| `src/lib/app-nav-config.ts` | 侧栏项与标题解析 |
| `src/components/dashboard-view.tsx` | Dashboard 呈现层 |
| `src/components/dashboard-active-timer.tsx` | 进行中会话卡片（client） |
| `src/components/dashboard-quick-start.tsx` | 快速开始卡片 |
| `src/components/dashboard-charts.tsx` | shadcn Card + ChartContainer |
| `src/app/dashboard/page.tsx` | 保留取数逻辑，传递 props |
| `src/app/layout.tsx` | 使用 `AppLayoutController` |
| `src/app/globals.css` | v0 风格 CSS 变量 |
| `src/lib/i18n/*` | `shell.*`、`nav.overview`、Dashboard 新文案 |
| `eslint.config.mjs` / `tsconfig.json` | 排除 `reference/` |

**删除**：`src/components/app-nav.tsx`（由 App Shell 取代）

**参考代码**：`reference/v0/` 仅作视觉参考；生产代码无 `reference/` import。

### 34.4 验证（2026-06-09）

| 命令 | 结果 |
|------|------|
| `pnpm lint` | ✅ |
| `pnpm build` | ✅ |
| `pnpm test` | ✅ 195 tests |

### 34.5 已知限制 / 下一步

- 顶栏搜索为占位 UI，未接时间块搜索
- 快速开始 / 进行中卡片仅跳转 `/focus`，不在 Dashboard 内启动计时
- 其他页面（日历、专注、复盘等）仍为旧版内容布局，仅共享 App Shell
- **推荐下一步**：Focus 页 UI 打磨（§21.6）或 Review 页 v0 风格对齐

## 35. UI-2 — Focus 页 UI 打磨（已完成第一版）

### 35.1 目标

- `/focus` 与 Dashboard / App Shell 视觉一致（shadcn Card、Button、Tabs、Badge 等）
- **正计时（秒表）为主 Tab**，番茄钟为次级 Tab
- 保留全部现有 FocusSession / stopwatch / Pomodoro / TimeBlock 转换业务逻辑
- Dashboard「快速开始」「进行中计时」通过 query 深链到 Focus 页

### 35.2 正计时逻辑状态

**已支持完整正计时业务**（Phase 9，本阶段仅 UI 重组）：

| 能力 | 状态 |
|------|------|
| `startStopwatch` | ✅ 未改 |
| `completeStopwatchAndCreateTimeBlock` | ✅ 未改 |
| `cancelStopwatch` | ✅ 未改 |
| 单用户单 `running` 会话互斥 | ✅ 未改 |
| 结束自动写入 `TimeBlock`（`source=stopwatch`） | ✅ 未改 |

### 35.3 UI 行为

| 项 | 说明 |
|----|------|
| 布局 | 左 2/3：Tabs（正计时 / 番茄钟）；右 1/3：最近专注记录（`lg:sticky`） |
| 默认 Tab | `?mode=stopwatch` 或有 running 秒表 → 正计时；`?mode=pomodoro` 或 orphan Pomodoro → 番茄钟 |
| 深链 | `/focus?mode=stopwatch&category=<id>` 预填分类（Dashboard 快速开始） |
| 进行中 | running 秒表在主 Tab 内大号计时；若当前 Tab 不匹配则顶部 `FocusRunningBanner` 提示 |
| 正计时 UI | 大号 `ElapsedTimer`；「结束并写入时间块」主按钮；「取消计时」ghost 次要 |
| 番茄钟 | 保留倒计时、暂停/继续、完成、放弃、转换 TimeBlock 全流程 |
| 历史列表 | Badge 显示状态 / 模式；时长、是否已写入 TimeBlock；running 行可放弃/取消 |

### 35.4 保留的业务逻辑（未改）

- Server Actions：`focus-sessions.ts`、`focus-shared.ts`
- Prisma schema / Auth / Dashboard 统计 / Calendar / Review
- Pomodoro 客户端倒计时（不写库暂停）
- orphan running Pomodoro 刷新后放弃
- 历史补转 TimeBlock（`convertFocusSessionToTimeBlock`）

### 35.5 新增 / 修改文件

| 文件 | 说明 |
|------|------|
| `src/components/focus/focus-page-view.tsx` | 客户端页面编排（Tabs + 布局 + query 解析） |
| `src/components/focus/focus-page-header.tsx` | 页内标题与说明 |
| `src/components/focus/focus-running-banner.tsx` | 非当前 Tab 时的进行中提示 |
| `src/components/stopwatch-timer.tsx` | shadcn 样式；`initialCategoryId` |
| `src/components/focus-timer.tsx` | shadcn 样式；`OrphanRunningPomodoro` 增 `categoryColor` |
| `src/components/focus-history.tsx` | Card + Badge 列表 |
| `src/app/focus/page.tsx` | 数据获取 + `FocusPageView` |
| `src/components/dashboard-quick-start.tsx` | `?mode=stopwatch&category=` 深链 |
| `src/components/dashboard-active-timer.tsx` | `?mode=stopwatch|pomodoro` 深链 |
| `src/lib/i18n/*` | `pageTitle`、`tabStopwatch`、`runningBanner*` 等 |

### 35.6 验证（2026-06-09）

| 命令 | 结果 |
|------|------|
| `pnpm lint` | ✅ |
| `pnpm build` | ✅ |
| `pnpm test` | ✅ 195 tests |

### 35.7 已知限制 / 下一阶段

- 番茄钟刷新后倒计时 UI 仍不恢复（仅 DB `running` + orphan 放弃流程）
- 秒表无暂停（Phase 9 范围外）
- Dashboard 仍不在页内启动计时，仅深链
- **推荐下一步**：Calendar / 列表页 UI 统一

## 36. UI-3 — Review 页 v0 风格对齐（已完成第一版）

### 36.1 目标

- `/review/day` 与 `/review/week` 与 Dashboard / Focus 视觉一致
- 成为「每日 / 每周复盘」中心：概览卡片、分类分布、列表、空状态
- **仅 UI 与页面组织**；统计仍用 `summarizeCompletionQuality`、`clipBlocksToRange`、`formatBlockDurationInRange` 等

### 36.2 统计口径

**未改变。** 复盘页仍仅统计 **TimeBlock**（与改造前一致）；未新增 FocusSession 查询或合并统计。页面顶部 `scopeNote` 说明与 Dashboard 双视角一致。

### 36.3 UI 行为

| 项 | 说明 |
|----|------|
| 导航 | `ReviewModeNav` — 每日 / 每周链至 `/review/day`、`/review/week`（保留 `?date=`） |
| 日期选择 | `ReviewDateControls` — 原 GET 表单逻辑不变 |
| 概览 | 4 卡：计划时长、估算完成、完成率、跳过时长（来自 `summarizeCompletionQuality`） |
| 周视图 | 本周总时长 Badge + CSS 柱状「每日分解」+ Progress 列表 |
| 分类 | Progress 堆叠条 + 占比列表 |
| 列表 | 标题、分类/状态 Badge、时间范围、裁剪时长、reviewNote |
| 空状态 | 链至 `/calendar` 与 `/focus?mode=stopwatch` |

### 36.4 新增 / 修改文件

| 文件 | 说明 |
|------|------|
| `src/components/review/review-page-header.tsx` | 页标题与说明 |
| `src/components/review/review-mode-nav.tsx` | 日/周切换 |
| `src/components/review/review-date-controls.tsx` | 日期表单与跳转 |
| `src/components/review/review-summary-cards.tsx` | 概览统计卡 |
| `src/components/review/review-category-breakdown.tsx` | 分类 Progress |
| `src/components/review/review-daily-breakdown.tsx` | 周每日分解 |
| `src/components/review/review-time-block-list.tsx` | 时间块列表 |
| `src/components/review/review-empty-state.tsx` | 空状态 |
| `src/components/review/review-scope-note.tsx` | TimeBlock 口径说明 |
| `src/lib/review-ui.ts` | 列表映射与完成数 helper |
| `src/app/review/day/page.tsx` | 日复盘页重构 |
| `src/app/review/week/page.tsx` | 周复盘页重构 |
| `src/lib/i18n/*` | `scopeNote`、`tabDay`、`empty*Hint` 等 |

### 36.5 验证（2026-06-09）

| 命令 | 结果 |
|------|------|
| `pnpm lint` | ✅ |
| `pnpm build` | ✅ |
| `pnpm test` | ✅ 195 tests |

### 36.6 已知限制 / 下一阶段

- 复盘页仍无 FocusSession 统计（有意保持原业务边界）
- 周视图柱状图为 CSS 简易图，非 Recharts
- **推荐下一步**：Calendar 页 UI 统一

## 37. UI-4 — Categories / Time Blocks 列表与表单统一（已完成第一版）

### 37.1 目标

- `/categories` 与 `/time-blocks` 与 Dashboard / Focus / Review 视觉一致
- Card 包装创建表单与列表；Badge 展示分类、状态、时长；保留删除确认
- **仅 UI 与页面组织**；Server Actions、验证、删除约束逻辑不变

### 37.2 业务逻辑

**未改变。** 仍使用 `createCategory` / `updateCategory` / `deleteCategory`、`createTimeBlock` / `updateTimeBlock` / `deleteTimeBlock`；分类删除前仍检查 timeBlocks 与 focusSessions；TimeBlock 表单仍通过 `TimeBlockForm` + `TimeBlockDatetimeFields` 提交 UTC ISO。

### 37.3 UI 行为

| 页 | 说明 |
|----|------|
| Categories | 页标题「分类」+ 说明；Card 创建表单；列表 Card 含色条、名称、关联数量 Badge、编辑/删除（`confirm()` 保留） |
| Categories 空状态 | 虚线 Card 引导创建第一个分类 |
| Time Blocks | 页标题「时间块」+ 说明；Card 创建区；列表 Card 含分类 Badge、状态 Badge、partial 完成度、日期/时间范围、备注 |
| Time Blocks 空状态 | 链至 `/calendar` 与 `/focus?mode=stopwatch` |

### 37.4 新增 / 修改文件

| 文件 | 说明 |
|------|------|
| `src/components/categories/category-page-header.tsx` | 页标题 |
| `src/components/categories/category-form-card.tsx` | Card 创建表单 |
| `src/components/categories/category-empty-state.tsx` | 空状态 |
| `src/components/time-blocks/time-block-page-header.tsx` | 页标题 |
| `src/components/time-blocks/time-block-status-badge.tsx` | 状态 + partial 完成度 |
| `src/components/time-blocks/time-block-empty-state.tsx` | 空状态 |
| `src/components/page-feedback.tsx` | 成功/错误提示 |
| `src/components/category-row.tsx` | shadcn Card + Button 列表行 |
| `src/components/time-block-row.tsx` | 对齐 Review 列表样式 |
| `src/components/time-block-form.tsx` | shadcn Input/Textarea |
| `src/components/submit-button.tsx` | shadcn Button |
| `src/components/delete-confirm-button.tsx` | destructive Button + confirm |
| `src/app/categories/page.tsx` | 页面编排 |
| `src/app/time-blocks/page.tsx` | 页面编排 |
| `src/lib/i18n/*` | `pageDescription`、`emptyHint`、空状态跳转文案 |

### 37.5 验证（2026-06-09）

| 命令 | 结果 |
|------|------|
| `pnpm lint` | ✅ |
| `pnpm build` | ✅ |
| `pnpm test` | ✅ |

### 37.6 已知限制 / 下一阶段

- 创建/编辑仍用原生 `<select>`（Server Actions 兼容），非 Radix Select
- 列表页仍为内联编辑，未改为 Dialog/Sheet
- **推荐下一步**：Calendar 页 UI 统一（见 §38）

## 38. UI-5 — Calendar 视觉细节与详情面板美化（已完成第一版）

### 38.1 目标

- `/calendar` 与 Dashboard / Focus / Review 视觉一致
- 工具栏、时间块卡片、创建/编辑面板、空状态产品化
- **仅展示层**；布局算法、拖拽、resize、时区、URL query 语义不变

### 38.2 明确未改的核心逻辑

| 区域 | 状态 |
|------|------|
| `src/lib/calendar.ts` | ✅ 未改 |
| 拖拽 / resize | ✅ CalendarDraggableBlock 指针逻辑未改 |
| 周视图 resize 禁用 | ✅ `enableResize={!compact}` 保留 |
| Server Actions | ✅ calendar-time-blocks actions 未改 |
| URL `date` / `view` / `blockId` | ✅ 行为不变 |

### 38.3 UI 行为

| 项 | 说明 |
|----|------|
| 页头 | `CalendarPageHeader` + `CalendarToolbar` |
| 新建 | `CalendarQuickCreateButton` — 默认 9:00 或今日 snapped 当前时间 |
| 时间块 | 左色条 + Card 风格；日视图显示状态/partial 完成度 Badge |
| 编辑面板 | Card + `CalendarBlockPanelSummary` + 原 TimeBlockForm |
| 空状态 | 虚线 Card |

### 38.4 新增 / 修改文件

见 `docs/AI_CONTEXT.md` UI-5 阶段；主要：`calendar-page-header`、`calendar-toolbar`、`calendar-block-card`、panels、grids、`calendar/page.tsx`、`calendar-slot-create.ts`、i18n。

### 38.5 验证（2026-06-09）

| 命令 | 结果 |
|------|------|
| `pnpm lint` | ✅ |
| `pnpm build` | ✅ |
| `pnpm test` | ✅ |

### 38.6 已知限制 / 下一阶段

- 周视图 compact 块不显示状态 Badge
- 编辑仍为页内 Card 面板，非 Sheet/Dialog
- **推荐下一步**：Settings 页（可选）

## 39. UI-6 — 全站 polish（已完成第一版）

### 39.1 目标

- Loading / Skeleton、Empty / Error 状态、Toast、删除确认 Dialog、表单 loading、移动端最小安全优化
- **仅 UI 层**；不改业务逻辑、统计口径、Auth、schema

### 39.2 完成项

| 项 | 说明 |
|----|------|
| Toaster | `Providers` + `ThemeProvider` 挂载于 `layout.tsx` |
| PageFeedback | 客户端组件：inline 提示 + sonner toast 双通道 |
| 删除确认 | `DeleteConfirmButton` 改为 Dialog；Focus 取消/放弃同样确认 |
| SubmitButton | pending 时 Loader2 + disabled |
| EmptyState | 通用组件；Categories / TimeBlocks / Review / Calendar / Dashboard 复用 |
| PageLoading | 各主路由 `loading.tsx` skeleton |
| Focus toast | 正计时开始/结束/取消、历史放弃/转换 client action 提示 |
| 移动端 | AppShell `overflow-x-hidden`；Header 新建按钮小屏图标 |

### 39.3 保留行为

- Server action + redirect 的 `?success=` / `?error=` **仍保留** inline PageFeedback（并 mirror toast）
- Calendar 拖拽/resize、Dashboard 统计、Focus 计时逻辑未改

### 39.4 验证（2026-06-09）

| 命令 | 结果 |
|------|------|
| `pnpm lint` | ✅ |
| `pnpm build` | ✅ |
| `pnpm test` | ✅ |

### 39.5 已知限制 / 下一阶段

- 番茄钟 client 倒计时成功仍主要用 inline alert，toast 覆盖不完整
- Calendar 移动端周视图仍依赖横向滚动
- **推荐下一步**：Settings 页（时区/语言/账户，可选）

## 40. Feature-2 — 秒表增强（pause / complete dialog / quick start / header indicator）

### 40.1 Schema

| 字段 | 说明 |
|------|------|
| `FocusSession.pausedAt` | 最近一次暂停开始的墙钟时刻（`null` = 未暂停） |
| `FocusSession.pausedTotalSeconds` | 累计暂停秒数（不含当前暂停段，resume 时累加） |
| `FocusSession.status = paused` | **仅 stopwatch**；pomodoro 不使用 |

迁移：`prisma/migrations/20260609120000_stopwatch_pause_fields/migration.sql`

### 40.2 TimeBlock.endTime 语义（stopwatch 专用）

秒表完成时：

- `TimeBlock.startTime = FocusSession.startTime`
- `TimeBlock.endTime = startTime + activeDuration`（**有效计时**，不含暂停）
- `FocusSession.endTime = 墙钟完成时刻`（审计/历史用）

Calendar 与 Dashboard **统计仍以 TimeBlock 为准**；块在日历上表示“记录的有效时长区间”，**不表示真实结束时刻**。手动块与 pomodoro 转换块不受影响。

实现：`src/lib/focus-session-elapsed.ts` + `completeStopwatchInTransaction`

### 40.3 Server Actions

| Action | 说明 |
|--------|------|
| `pauseStopwatch` | `running` → `paused`，写入 `pausedAt` |
| `resumeStopwatch` | `paused` → `running`，累加 `pausedTotalSeconds`，清空 `pausedAt` |
| `completeStopwatchAndCreateTimeBlock` | 接受 `title` / `note` / `status` / `completionLevel`；支持 `running`/`paused` claim |
| `cancelStopwatch` | `running`/`paused` → `abandoned`；不创建 TimeBlock |
| `startStopwatch` / `createFocusSession` | 互斥改为 `activeFocusSessionForUser`（`running` **或** `paused`） |

结束 Dialog **取消** → 不调用 complete action，session 保持 active。

默认 complete 字段：title（session → 分类名 → `instantRecordTitle`）、note（session）、status=`completed`、completionLevel=`100`。

### 40.4 UI

| 区域 | 变更 |
|------|------|
| `/focus` 秒表 | 暂停/继续；结束打开 `StopwatchCompleteDialog` |
| Dashboard 快速开始 | 页内 `startStopwatch`（分类名作默认 title）；有 active session 时 toast 拦截 |
| Dashboard 活动计时 | 支持 paused 状态与 pause-aware elapsed |
| AppHeader | `GlobalFocusTimerIndicator`（layout 查询 `activeFocusSessionForUser`） |

**未改：** pomodoro 业务逻辑、Calendar 拖拽/resize/TZ、Dashboard TimeBlock 统计口径。

### 40.5 测试覆盖

- pause / resume / pause 后 complete / paused cancel
- active session 互斥（`rejectStopwatchStartWhenActive`）
- repeated complete 防重复（transaction claim）
- elapsed 与 TimeBlock.endTime 语义单测

### 40.6 验证

```bash
pnpm exec prisma migrate deploy   # 或 migrate dev
pnpm prisma generate
pnpm lint
pnpm build
pnpm test
```

## 41. Product-1 — Demo 体验打磨

### 41.1 目标

让外部访客与朋友打开 demo 后快速理解产品，无需口头解释过多。**仅** Landing、本地 seed、轻量 onboarding、文档；不改业务逻辑与统计口径。

### 41.2 Landing Page

| 项 | 说明 |
|----|------|
| `/` 未登录 | 新产品 Landing（Hero、4 功能卡片、GitHub 登录 CTA） |
| `/` 已登录 | `redirect("/dashboard")` |
| 风格 | 复用 shadcn `Card` / `Button`，与 App 设计 token 一致 |
| i18n | `landing.*` 中英文 |

### 41.3 Demo seed（仅本地）

| 项 | 说明 |
|----|------|
| 脚本 | `scripts/seed-demo.ts` → `pnpm db:seed:demo` |
| 分类 | 学习 / 工作 / 休息 / 运动 / 娱乐（description 含 `[Demo]`） |
| 数据 | 最近一周 TimeBlocks + FocusSessions（多 status / completionLevel） |
| 绑定用户 | `DEMO_SEED_USER_EMAIL`（须先本地 GitHub 登录） |
| 安全 | `assertDemoSeedAllowed`：默认仅 localhost；非本地须 `DEMO_SEED=1` |
| 生产 | **不**接入 Vercel build；**不**创建线上共享 demo 账号 |

### 41.4 Onboarding

- Dashboard 顶部 **checklist card**（无 tour 库）
- 三步：创建分类 → 时间块/正计时 → 看板/复盘
- 有分类且有（TimeBlock 或 FocusSession）后隐藏

### 41.5 文档

| 文件 | 内容 |
|------|------|
| `README.md` | 简介、功能、技术栈、本地运行、demo seed、部署、截图占位 |
| `docs/DEPLOYMENT.md` | Vercel + Neon 索引与 FAQ |
| `docs/SCREENSHOTS.md` | 截图指南 |
| Demo URL | README 占位 `<!-- your-demo-url -->` |

### 41.6 验证

```bash
pnpm lint && pnpm test && pnpm build
# seed 手动：pnpm db:seed:demo（仅本地）
```

### 41.7 已知限制

- 线上 Demo 须 GitHub 登录，无免登录浏览
- 无共享 demo 账号；演示数据仅本地 seed
- 截图文件需自行截取，README 为占位
- Landing「本地 demo」说明指向 README，非应用内 seed

### 41.8 下一阶段建议

- 替换 README Demo URL 与 `public/screenshots/` 真实截图
- Settings 页（语言/时区偏好）
- 可选 staging Neon branch

## 42. UI bugfix — Sidebar 语言菜单遮挡 Calendar 编辑区

### 42.1 问题

Windows / Chrome 下，AppSidebar 底部语言切换（原横向「中文 / English」按钮组）在侧栏宽度不足或折叠时向右侧溢出，覆盖主内容区 Calendar 时间块编辑面板的「保存 / 取消」按钮。

### 42.2 修复

| 文件 | 变更 |
|------|------|
| `src/components/language-switcher.tsx` | 新增 `variant="sidebar"`：紧凑触发器 + `DropdownMenuContent` **`side="top"`**、`align="start"`，菜单在侧栏内向上展开；折叠态仅显示 Languages 图标 |
| `src/components/app-sidebar.tsx` | 使用 `variant="sidebar"`；footer 容器 `min-w-0` + 折叠居中 |

**未改：** Landing / 公开 header 仍用 `variant="inline"`（默认）；Calendar 编辑逻辑、Prisma、业务 actions 无变更。

### 42.3 验证

- Calendar 编辑时间块时，语言菜单不遮挡保存/取消
- 侧栏展开与 icon 折叠、Dashboard / Focus / Review 语言切换正常
- `pnpm lint` / `pnpm test` / `pnpm build`

## 43. Auth bugfix — 生产 GitHub OAuth profile 解析错误

### 43.1 问题

Vercel Runtime Logs 在 GitHub 登录回调阶段报错：

```
OAuthProfileParseError
TypeError: Cannot read properties of undefined (reading 'toString')
at Object.profile(...)
[auth][details]: { "provider": "github" }
```

OAuth token 交换可成功，但在将 GitHub userinfo 映射为 Auth.js 用户时失败。

### 43.2 根因

`src/auth.ts` 使用 Auth.js 内置 GitHub provider 的**默认** `profile()`。其实现为 `profile.id.toString()`，**未**校验 `id` 是否存在。

当 GitHub `/user` 响应缺少 `id`（例如 API 错误 JSON、异常响应体、或极少数字段形态差异）时，`profile.id` 为 `undefined`，触发上述 `TypeError` 并被包装为 `OAuthProfileParseError`。

### 43.3 修复

在 `src/auth.ts` 的 `GitHub({ ... })` 中覆盖 `profile()`，使用防护式 ID 与字段回退：

| 字段 | 映射 |
|------|------|
| `id` | `String(profile.id ?? profile.sub)`；两者皆无则抛出明确错误 |
| `name` | `profile.name ?? profile.login ?? "GitHub User"` |
| `email` | `profile.email ?? null` |
| `image` | `profile.avatar_url ?? null` |

**未改：** Prisma schema、UI、`auth.config.ts` middleware 逻辑、数据库迁移。

### 43.4 Vercel 验证

1. 确认 Production 环境变量：`AUTH_SECRET`、`AUTH_URL`（生产域名）、`AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET`、`AUTH_TRUST_HOST=true`（如适用）。
2. GitHub OAuth App 回调 URL 与 `AUTH_URL` 一致：`https://<vercel-domain>/api/auth/callback/github`。
3. 打开 `https://<vercel-domain>/login` →「使用 GitHub 登录」→ 授权后应进入 `/dashboard`，顶栏显示用户信息与「退出」。
4. Vercel → Project → **Logs**（Runtime）：筛选 `OAuthProfileParseError` 或 `profile`，确认登录流程无新错误。
5. 若仍失败且日志为 `GitHub profile is missing id`，检查 Vercel 上 `AUTH_GITHUB_*` 是否与 GitHub OAuth App 匹配，以及 GitHub API `/user` 是否返回有效用户对象。

