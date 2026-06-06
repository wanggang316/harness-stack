# User-Test Patterns

> 运行时用户级验证的项目级约定。在 `/harness-stack:validation-contract` 首次运行（Step 0: Bootstrap）时撰写。在撰写或探测某个 plan 的 validation contract 之前先读这份；契约 assertion 存放于 `.harness-runtime/plans/<slug>/validation-contract.md`。

## Status

**Status:** Draft | Approved
**Last updated:** YYYY-MM-DD

## Platforms in Scope

<!--
列出本项目所测试的目标平台。每个平台一条，配一行理由。
-->

- **Web (browser)** — public reading site at https://...
- **HTTP API** — backend exposed under /api
- **(macOS / iOS / Android — remove if not in scope)**

## Tooling per Platform

<!--
对每个平台，声明主用 + fallback 工具。写明 agent 会用的确切调用方式
（MCP server 名、CLI 命令或库调用），以及作为探测前置门槛的 ready 信号。
-->

### Web

- **Primary:** Chrome DevTools MCP——能力：DOM 查询、network 抓取、console 读取、screenshot、accessibility tree、performance trace、只读 JS 求值
- **Fallback:** Playwright（`@playwright/test`），用于 CI 中的 headless 运行
- **Invocation:** `mcp__claude-in-chrome__*` 下的 MCP 工具调用；Playwright 则用 `pnpm exec playwright test <case>`
- **Ready signal:** 对 `<base-url>/health` 的 HTTP GET 返回 200，**或** dev server 日志含 `ready in`
- **Base URL discovery:** 从 `.env` 读 `VITE_SITE_URL`，默认 `http://localhost:5173`

### HTTP API

- **Primary:** `curl`，并用 `jq` 解析 JSON
- **Fallback:** `apps/api/tests/` 下的集成测试框架
- **Invocation:** `curl -sS -X <METHOD> <base>/api/<path> -H 'content-type: application/json' -d <body> | jq`
- **Ready signal:** `GET /api/health` 返回 200
- **Auth:** 见 persona registry——每个 persona 声明自己的 session token / API key

### (macOS / iOS / Android — fill in or delete)

- **Primary:** ...
- **Fallback:** ...
- **Invocation:** ...
- **Ready signal:** ...

## Case Dimensions

<!--
列出每位 case 作者都必须考虑的维度。把每个标为 Mandatory
（每个 case 都必须显式回答它，哪怕只是声明「不适用」）或
Optional（仅在相关时纳入）。
-->

| 维度 | 是否必须？ | 检查什么 |
|---|---|---|
| Happy path | Mandatory | 本 case 的主要成功流 |
| Error path | Mandatory | 至少一种声明的失败模式（network、校验、数据缺失） |
| Edge values | Mandatory | 空 / null / 边界 / 最大尺寸 的输入 |
| Accessibility | UI case 必须 | role、label、键盘可达性、焦点顺序 |
| Performance budget | Optional | 若 spec 指定了目标，则测 LCP / INP / TTFB |
| i18n | Optional | 若项目支持多语言，写明所测的 locale |
| Security | auth / data case 必须 | AuthN/AuthZ 边界、输出中不含 secret |

## Selector and Assertion Rules

<!--
只谈可观测。每条 assertion 都必须引用用户可见 / 外部可探测的状态。
用具体示例说明什么被允许、什么被禁止。
-->

### Allowed selectors (Web)

- ARIA role + accessible name：`getByRole('button', {name: 'Subscribe'})`
- 可见文本：`getByText('Order confirmed')`
- `<a>` href 模式：`a[href^="/d/"]`
- Network：`POST /sessions → 401`
- Database：`SELECT count(*) FROM orders WHERE user_id = $persona.id`

### Forbidden selectors

- CSS class 名（`.btn-primary-v2`）——重构会让它们失效
- 文件路径或函数名——实现细节
- DOM 位置（`div:first-child > span:nth-of-type(2)`）——脆弱
- 指向代码模块的内部 test id（`data-testid="OrderConfirmationContainer__heading"`）——把测试耦合到源码布局

### Allowed assertions

- 二元：PASS 或 FAIL，没有「looks good」
- 具体：写明期望值，而非对噪声做正则匹配
- 独立：每条 assertion 一次探测

## State Isolation

<!--
每个 case 都必须从一个已知 seed 起步。记录 reset 协议。
-->

- **DB reset:** 每个 case 之前，运行 `pnpm db:reset` 来 drop 并从 `tests/fixtures/seed/<scenario>.sql` 重新播种
- **Storage:** 每个 persona 有一个 `.auth/<persona>.json` storageState 文件；case 经由 Playwright 的 `storageState` 选项（或其它平台上的等价物）加载它
- **No cross-case state:** 一个 case 不得依赖另一个 case 已经跑过；顺序必须无关紧要
- **External services:** 用 `tests/fixtures/external/` 里的 recorded fixture 来 mock / 重放第三方 API；CI 中绝不打真实第三方 endpoint

## Surface Cost Tiers

<!--
按「对某个界面验证一个 case 的代价」给每个用户界面分档。
runtime validator 读这个来规划隔离与批处理：cheap 界面每步跑一个 case；
expensive 界面则做批处理并排序，以尽量减少 reset。把示例调整成本项目的真实界面。
-->

| Tier | 代价 | 隔离策略 | 示例界面（本项目） |
|---|---|---|---|
| **cheap** | 一次探测，无共享状态，亚秒级 | 每个验证步骤一个 case；无需批处理 | 经 `curl` 的 HTTP API；纯 CLI 调用；库函数调用 |
| **medium** | 一个可被多个 case 共享的会话 | 把共享会话且互不改写状态的 case 归一组；组间 reset | 浏览器会话（一次登录，多条只读 assertion） |
| **expensive** | 每个 case 一次整环境 reset | 尽量少 reset；把需要 reset 的 case 排在一个批次末尾 | 每个 case 全量 DB 重播种；设备 / 模拟器启动；破坏性工作流 |

拿不准时默认 tier：**medium**。把 tier 记在上面 Tooling 小节里每个界面旁边，免得 validator 去猜。

## Personas

persona 是一个具体、可复用的身份，assertion 在行内指名它（例如
`anonymous_visitor`、`returning_reader`、`site_admin`），这样「一个用户」就不会漂移成
十种不同含义。在这里逐一记录（每个一行）：本项目用到的每个 persona 如何认证、能访问什么——
validator 把 persona 立起来所需的，仅此而已。

- `anonymous_visitor` — 未登录；无 auth。
- `returning_reader` — session auth；读访问。
- `site_admin` — admin API token（`ADMIN_API_TOKEN`）；读 / 写 / 管理。

## Fixtures and Test Data

**Naming:** `<scenario>.<format>`——例如 `empty-inbox.json`、`three-completed-reports.sql`、`large-list-1000.json`。

**Rule:** fixture 是静态数据。它们不 import 代码。任何 test runner 或 runtime validator 都能直接加载它们。把它们放在项目测试本就所在之处（`tests/fixtures/` 或类似目录）。

## Artifacts

**Location:** `tests/runs/<timestamp>/<case-id>/`

**Each FAIL must produce:**

- `report.md`——失败的 assertion + diff（期望 vs 观测）
- `repro.sh`——一个可运行的 shell 脚本，能在隔离环境中复现该探测
- `screenshot.png`（UI case）——失败发生的那一刻
- `console.log` / `network.har`（UI case）——完整抓取
- `query.sql`（DB case）——返回错误行的那条确切查询

**Retention:** 保留最近 10 次运行；更旧的由 CI 自动清理。

## Anti-Patterns

<!--
LLM agent 写用户测试时会踩中的失败模式的具体示例。
每项：名称、长什么样、为何错、改为怎么做。
-->

### Hallucinated assertion

**Looks like:** 在没有任何 spec 或 AC 提及的情况下，某个 case 断言「页面显示一条欢迎横幅」。
**Why wrong:** 这条 assertion 出自 agent 的想象，而非契约。PASS 给出虚假的信心；FAIL 浪费调试时间。
**Do instead:** 每条 assertion 都追溯到一条 spec AC 或一份回归报告。在行内引用 AC ID。

### Selector drift / implementation coupling

**Looks like:** `await page.click('.btn-primary-v2.cta-large')`
**Why wrong:** 一次 CSS 重构就破坏所有测试。这个 selector 完全说明不了用户意图。
**Do instead:** `await page.getByRole('button', {name: 'Subscribe'}).click()`

### Tool-loop exhaustion

**Looks like:** agent 把同一个不稳定的探测重试 50 次，耗尽工具预算，报告 timeout 而非 FAIL。
**Why wrong:** 探测本就不可靠；agent 从未做出判定。
**Do instead:** 把重试上限设为 3，每次之间显式等待。若仍不稳定，判 INCONCLUSIVE 并附上尝试日志。

### State leak between cases

**Looks like:** Case A 创建了一个用户。Case B 找到它并通过。单独运行 Case B 时却失败。
**Why wrong:** case 必须能以任意顺序运行，包括单独隔离运行。
**Do instead:** 每个 case 加载自己的 fixture，并在运行前 reset DB。

### Grader gaming

**Looks like:** 当用 LLM-as-judge 给回答打分时，agent 写出结构上讨好 grader、却错过底层行为的输出。
**Why wrong:** grader 是代理指标，不是真相。
**Do instead:** 给同一条 assertion 同时配上确定性探测（DOM / HTTP / DB）与 LLM judge；要求两者都 PASS。

## Knowledge Persistence

<!--
这份文档是活的。当一次 runtime validation 运行发现一条值得留存的 setup 事实——
一条错误的 healthcheck 命令、一个漏掉的 seed 步骤、更快到达就绪状态的路径、某个界面的坑——
validator 把它记回这里，让下次运行更快。本小节就是这些事实累积的地方。
-->

**Who writes here:** runtime validator，在一次运行之后，记录那些寿命超过单次运行的事实。
作者期的约定（工具、selector、隔离）留在上面各自的小节里；本小节专放操作性发现。

**Format:** 每条事实一项。

```
- [YYYY-MM-DD] <surface / step>: <fact discovered>. <what to do next time>.
```

**Examples:**

- `[2026-06-01] web ready signal: GET /health 200 fires ~3s before the SPA hydrates; wait for the role=main element, not just the health probe.`
- `[2026-06-01] db seed: tests/fixtures/seed/large-list.sql must run AFTER migrations, not before; ordering caused a FK error.`

**Rule:** 只记事实，不记 test case。若某项发现改变了一条约定（例如真实的 ready 信号），
也把上面相关的小节改掉，并在这里记一笔。

## Verification Checklist (for the patterns doc itself)

- [ ] 范围内的每个平台都有主用 + fallback 工具及其调用方式
- [ ] Case 维度表已填好（mandatory 与 optional 区分明确）
- [ ] selector 规则同时含 allowed 与 forbidden 示例
- [ ] 已指明状态隔离协议（哪条命令 reset 状态）
- [ ] surface cost tier 已分档（cheap / medium / expensive）并附隔离策略
- [ ] persona registry 路径 + schema 已记录
- [ ] fixture 布局已记录
- [ ] artifact 路径 + 保留规则已记录
- [ ] Knowledge Persistence 小节已存在（可起始为空）
- [ ] 至少有 4 条具体点明的反模式
