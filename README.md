# 轻帐 · Qingzhang

个人记账 Web App。纯前端 Demo，无后端。

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
| `#/` | 主页：本月支出、账户余额、预算进度、近 7 天、最近记录 |
| `#/txns` | 收支列表：按月分组、类型筛选、搜索、删除 |
| `#/insights` | AI 分析：健康分、洞察卡片、近 6 月趋势、分类排行 |
| `#/me` | 我的：账户管理、预算、导出 CSV/JSON、清空、退出 |

未登录时整站由登录页接管，路由自动回到 `#/`。

## 配色

| 用途 | 色值 |
|---|---|
| 主色（按钮、选中态、收入） | `#0092C7` |
| 浅天蓝（浅底、图表第二档） | `#9FE0F6` |
| 淡黄（强调、健康分环） | `#F3E59A` |
| 珊瑚橙（支出） | `#F3B59B` |
| 柔红（超支、删除、负余额） | `#F29C9C` |

全部收在 `src/styles/tokens.css`，深色区块用 `#063B52` 深海军蓝。图表色板 `--c1` ~ `--c8` 从这五个色派生，分类按序循环取色。

## 账户

- 类型：支付宝 / 微信 / 银行卡 / 现金
- 银行卡名称可从 14 家常见银行里选，也可以自己填
- 余额用「期初 + 收入 − 支出」实时算，不单独存一个会漂移的数字
- 改余额时只反推期初余额，已有流水不动
- 删账户时流水迁移到剩下的第一个账户，不会凭空消失

## 记一笔的动效

点保存后的顺序（时间线在 `src/components/SaveFlow.tsx` 顶部可调）：

1. 白色卡片弹出（520ms，`ease-out`）
2. 圆环描边 + 对勾用 `stroke-dashoffset` 逐段画出（120ms / 620ms 两段启动）
3. 卡片缩小淡出（340ms）
4. 小票回执从下方浮起（460ms），底部带撕口齿孔，显示分类、账户、余额变化

## 数据

全部存在 `localStorage`，key 为 `qingzhang.v1`，内部 `version: 2`。首次登录/注册会写入 6 个月示例流水，可在「我的 → 载入示例数据」重置。

v1 老数据会自动迁移：补三个默认账户、给每条流水按分类推断所属账户（房租/工资走银行卡，日常小额走支付宝）。

读写集中在 `src/lib/storage.ts`——接后端时只替换这一个文件即可，页面不用动。

## AI 分析怎么算的

`src/lib/insights.ts` 是本地规则引擎，指标全部从流水现算（O(n)），不联网：

- 环比、增长最快的分类、最大分类占比
- 预算执行进度 vs 时间进度 → 月末支出预测
- 储蓄率、小额高频消费、记账完整度
- 健康分 = 储蓄 40 + 预算 30 + 结构 15 + 习惯 15

接真实模型时，把 `analyze()` 里生成 `insights` 的部分换成一次 API 调用即可，返回结构保持不变。

## 目录

```
src/
  lib/          types · format · categories · accounts · stats · insights · seed · storage
  store/        AppContext（全局状态 + localStorage 持久化）
  components/   AppShell · Composer · SaveFlow · AccountEditor · Modal · Icon
                CategoryGlyph · AccountGlyph · charts
  pages/        Login · Home · Transactions · Insights · Profile
  styles/       tokens · global · shell · components · pages · auth · flow
scripts/        shoot.mjs 截图验收 · test.mjs 交互测试 · migrate-test.mjs 数据迁移测试
```

## 部署

产物是静态文件，任意静态托管都能放：

```bash
npx vercel --prod
npx netlify deploy --prod --dir=dist
```

用的是 HashRouter，不需要服务端 rewrite 规则。
