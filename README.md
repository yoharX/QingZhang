# 轻帐 · Qingzhang

个人记账 Web App。纯前端，无后端，数据全部留在本机浏览器。

## 跑起来

```bash
npm install
npm run dev          # http://127.0.0.1:5173
```

## 构建

```bash
npm run build        # 产物在 dist/，可直接丢到任意静态托管
npm run preview      # 本地预览构建产物 http://127.0.0.1:4173
```

## 页面

| 路由 | 页面 |
|---|---|
| `#/` | 主页：本月支出、天气、账户、预算、分类占比、近 7 天、最近记录（板块可自定义） |
| `#/txns` | 收支列表：按月分组、类型筛选、搜索、删除 |
| `#/insights` | AI 分析：本地规则 / 接入大模型，健康分、洞察卡片、趋势、分类排行 |
| `#/me` | 我的：资料、账户、显示设置、AI 配置、数据导入导出与删除 |

未登录时整站由登录页接管，路由自动回到 `#/`。

## 配色

| 用途 | 色值 |
|---|---|
| 主色（按钮、选中态、收入） | `#0092C7` |
| 浅天蓝（浅底、图表第二档） | `#9FE0F6` |
| 淡黄（强调、健康分环） | `#F3E59A` |
| 珊瑚橙（支出） | `#F3B59B` |
| 柔红（超支、删除、负余额） | `#F29C9C` |

全部收在 `src/styles/tokens.css`，深色区块用 `#063B52` 深海军蓝。图表色板 `--c1` ~ `--c8` 从这五个色派生。

## 天气

`src/lib/weather.ts`，走 Open-Meteo（无需 key、支持 CORS）。

- 定位顺序：IP 定位（ipwho.is → ipinfo.io，最多等 3 秒）→ 默认城市北京
- 不自动调浏览器 GPS —— 那会弹权限框打断用户；GPS 只在点「定位」按钮时用
- 点城市名可手动选城市（24 个预设），选择记在 `qingzhang.weather.city`
- 结果缓存 30 分钟，`qingzhang.weather.v1`

## 首页板块

6 个板块（天气 / 账户 / 预算 / 分类占比 / 近 7 天 / 最近记录）可排序、可隐藏，主卡「本月支出」固定在最上方。

设置面板支持拖拽（pointer events + transform 让位）和上下箭头两种排序方式，改动即时生效。配置存在 `user.homeModules`，新增板块会自动追加到末尾。

## AI 分析

两种模式，在「我的 → AI 分析」或分析页顶部切换。

**本地**（`src/lib/insights.ts`）：规则引擎，指标全部现算 O(n)，不联网。环比、预算预测、储蓄率、小额高频、健康分（储蓄 40 + 预算 30 + 结构 15 + 习惯 15）。

**大模型**（`src/lib/ai.ts`）：OpenAI 兼容接口，前端直连。填 Base URL（到 `/v1`）、API Key、模型名，内置 DeepSeek / OpenAI / Kimi / 智谱 / 通义 五个预设。请求要求模型返回结构化 JSON，解析失败时退化成纯文本展示，不丢结果。

密钥只写在本机 localStorage，不经过任何中转服务器。分析时账目摘要会直接发给你配置的服务商。

## 账户

- 类型：支付宝 / 微信 / 银行卡 / 现金
- 银行卡名称可从 14 家常见银行选，也可自己填
- 余额用「期初 + 收入 − 支出」实时算，不单独存会漂移的数字
- 改余额只反推期初，已有流水不动
- 删账户时流水迁移到剩下的第一个账户

## 记一笔的动效

点保存后（时间线在 `src/components/SaveFlow.tsx` 顶部可调）：

1. 白色卡片弹出（520ms，`ease-out`）
2. 圆环描边 + 对勾用 `stroke-dashoffset` 逐段画出
3. 卡片缩小淡出（340ms）
4. 小票回执从下方浮起（460ms），底部带撕口齿孔

## 数据

全部存在 `localStorage`，key 为 `qingzhang.v1`，内部 `version: 3`。

| 内容 | 位置 |
|---|---|
| 账号、昵称、头像、首页板块、AI 配置 | `user` 字段 |
| 账户与流水 | `accounts` / `txns` |
| 天气缓存、手动选的城市 | 独立 key |

老数据自动迁移：v1 补账户与 `accountId`，v2 补头像、板块顺序、AI 配置。

「我的 → 删除本机数据」会清空所有 key 并回到登录页，localStorage 里不留痕迹。

## 移动端

- 窄于 860px 切底部 tab 栏 + 中间浮动记账按钮
- 输入框统一 16px，避免 iOS 聚焦时自动放大页面
- 用 `100dvh` 而不是 `100vh`，地址栏收放不跳
- 弹窗在移动端变成底部抽屉，按钮撑满并适配安全区
- 所有可点元素热区 ≥ 40px（开关、箭头用伪元素扩大点击范围）

## 目录

```
src/
  lib/          types · format · categories · accounts · stats · insights
                seed · storage · weather · ai · homeModules
  store/        AppContext（全局状态 + localStorage 持久化）
  components/   AppShell · Composer · SaveFlow · Modal · Icon · charts
                CategoryGlyph · AccountGlyph · AccountEditor · Avatar
                ProfileEditor · AiSettings · HomeModuleSettings · WeatherCard
  pages/        Login · Home · Transactions · Insights · Profile
  styles/       tokens · global · shell · components · pages · auth · flow
scripts/        shoot.mjs 截图 · test.mjs 交互测试 · migrate-test.mjs 迁移测试
```

## 部署

```bash
npx vercel --prod
npx netlify deploy --prod --dir=dist
```

用的是 HashRouter，不需要服务端 rewrite。
