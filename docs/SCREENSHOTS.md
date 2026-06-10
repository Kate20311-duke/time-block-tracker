# 截图指南

本文说明如何为 README 与对外分享准备产品截图。**不要提交含真实隐私数据的截图**（邮箱、token、内部 URL 等）。

## 推荐目录

将 PNG 或 WebP 文件放在：

```text
public/screenshots/
```

README 中可引用：

```markdown
![Dashboard](/screenshots/dashboard.png)
```

## 建议截取的页面

| 文件建议名 | 页面 | 说明 |
|------------|------|------|
| `dashboard.png` | `/dashboard` | 有统计卡片与图表；可先运行 `pnpm db:seed:demo` |
| `focus.png` | `/focus?mode=stopwatch` | 正计时或番茄钟 Tab |
| `calendar.png` | `/calendar` | 周视图，含彩色时间块 |
| `review.png` | `/review/week` | 周复盘 |
| `landing.png` | `/`（未登录） | 产品 Landing |

## 拍摄步骤

1. 本地：`docker compose up -d db` → `pnpm dev`
2. 登录 GitHub OAuth（本地 OAuth App）
3. （可选）`pnpm db:seed:demo` 填充演示数据
4. 浏览器宽度建议 **1280px** 或 **1440px**（与 App Shell 布局一致）
5. 使用系统截图或浏览器 DevTools → Capture screenshot
6. 保存到 `public/screenshots/`，更新 README 中的占位注释

## 注意事项

- 线上 Demo 截图前确认无敏感信息
- 不要伪造截图文件；无图时保留 README 占位即可
- 深色/浅色模式任选一种，与 README 说明一致即可
