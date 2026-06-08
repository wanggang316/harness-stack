# Stage 3 — user-test：运行时断言验证

> `fdd-validate` 流水线第 3 级的执行细则——在静态验证（stage 1）与代码审查（stage 2）之后，从用户视角确认运行中的系统真的符合 validation contract。由 fdd-validate 在 milestone / final scope 调用，断言子集与 diff 区间由调用方按 scope 给定（milestone scope = 该里程碑断言子集；final scope = 全集 coverage）。

## Overview

静态工具——单测、lint、类型检查、code review——读的是代码。它们无法告诉你**运行中的系统**是否真的符合 validation contract 的要求。本 stage 补上这道缝：拉起应用、规划如何隔离各条断言、对活系统逐条探测、给出带证据的覆盖矩阵。探测由一个从未读过实现的全新 subagent 执行；PASS / FAIL 只依据可观测状态判定。

在本 stage，**fdd-validate 担任 controller**：它解析运行目标、规划隔离、派发 validator、合并结果。`user-test-validator` subagent 是**无状态探针**：跑一组断言，返回一份局部矩阵。当一次运行规模大、或其界面成本昂贵时，controller 并行派发多个 validator——每个隔离组一个——再合并。没有单独的「flow」agent：复用同一个 validator，编排由 controller 负责。

本 stage 只探有断言可探的范围：里程碑/全集中那些 `fulfills` 非空的工作。纯重构、无用户可见变化的改动由 stage 1/2 把关；无断言时本 stage 为 no-op。

## Prerequisites

1. **Validation contract**：`.harness-runtime/plans/<slug>/validation-contract.md`——每条断言（`### VAL-<AREA>-NNN: <title>`）带一段可观测行为描述、一个 persona、以及声明的 Evidence。见 `harness-stack:fdd-validation-contract`。
2. **项目测试约定**：`docs/user-test-patterns.md`——声明各平台工具链、ready 信号、状态隔离协议、**surface cost tier**、personas（各自如何认证 / 能访问什么）、artifacts 布局、以及一个 knowledge-persistence 小节。模板见 `skills/fdd-validation-contract/assets/user-test-patterns.md`。
3. **可运行目标**——一条把系统拉起来的命令（`pnpm dev`、`cargo run`、`docker compose up`）以及一个已知的 ready 信号（URL 有响应、日志行、端口打开）。定义在 `docs/user-test-patterns.md`。
4. **Diff 区间**——覆盖被验证工作的 `BASE_SHA..HEAD_SHA`，以便把报告挂到某个 feature、里程碑或 PR。
5. **断言子集**——本次运行负责的 `VAL-` id（例如验证某个 feature 的 `fulfills` 时为 `{VAL-AUTH-001, VAL-AUTH-002}`）。验证一个里程碑或整个 PR 时用全集。

## Process

### Step 1：解析运行目标

读 `docs/user-test-patterns.md` 拿到各平台工具与 ready 信号。对照项目清单文件（`package.json`、`Cargo.toml`、`pyproject.toml` 等）确认启动命令与工作目录。从 `.env.example` 或 env-init 技能的产物里取所需环境变量。

任一项含糊就**停下来问**。猜启动命令是假 FAIL 的常见来源。

### Step 2：把系统拉起来

在解析出的工作目录里，以后台进程启动目标。在任何探测开始前，先施加 `docs/user-test-patterns.md` 的状态隔离协议（DB reset、storage seed、fixture load）。等到 ready 信号——**不要**在就绪前就开始探测。把 stdout/stderr 抓到日志文件，便于归因失败。

若系统拒绝启动，本次运行以 `BLOCKED` 中止：报告启动日志并停止。不要对一个从未起来的系统编造探测。

### Step 3：解析断言子集

对请求子集里的每个 `VAL-` id，从 `.harness-runtime/plans/<slug>/validation-contract.md` 加载：

- 可观测行为段落（必须成立的是什么）
- 声明的 `Evidence:`（PASS 时必须抓取什么）
- 它指名的 persona——在 `docs/user-test-patterns.md` 的 Personas 小节里查清该 persona 如何认证、能访问什么

完整解析好的断言包就是进 validator brief 的内容。validator 不从源码里重新推导这些。

### Step 4：规划隔离

读 `docs/user-test-patterns.md` 的 **surface cost tier**，给本次运行的各断言分档：

- **cheap**（一次 curl、库函数调用、快速 CLI 调用）：每条断言一个验证步骤；无需分组。
- **medium**（每组一个浏览器会话）：把能共享会话的断言归一组——同一 area、互不改写状态。
- **expensive**（每条断言整环境 reset）：尽量少 reset；把需要 reset 的断言排在一组末尾。

产出一份**隔离方案**：一组组断言 id，每组共享一种界面、彼此不污染，外加组间的 reset 边界。据此决定派发形态：

- 子集小，或全 cheap 界面 → 整个子集**一个 validator**（最常见）。
- medium/expensive 界面上的大子集（多于约 12 条）→ **每组一个 validator，并行派发**。

记录该方案；它会进 run 综合报告。

### Step 5：派发 validator

派发 `user-test-validator`（见 `agents/user-test-validator.md`），brief 里**针对其分组**给出：

- 该组解析好的各断言（每个 id 一份）。
- 运行系统的 base URL 或其它入口坐标。
- 启动日志文件路径。
- diff 区间 `BASE_SHA..HEAD_SHA`（仅用于归因；validator **不**读 diff）。
- validator 必须写入的 artifacts 目录（并行运行时按组命名空间隔离）。
- 它负责的状态 reset 边界，来自隔离方案。

当方案要求并行派发时，把所有分组 brief 一批发出，让各 validator 并发运行。每个 validator 只跑分配给它的那组，PASS 时抓取每条断言声明的 Evidence、FAIL 时抓取 artifacts-on-FAIL，返回一份局部矩阵。validator 绝不读实现源码；它严格按声明探测每条断言，用 `docs/user-test-patterns.md` 指定的平台工具。

### Step 6：合并覆盖矩阵

收齐所有 validator 的局部矩阵并合一。每行 PASS 时带声明的证据，FAIL 时带失败断言 + reproducer：

```
| Assertion ID    | Status | Evidence                                                       |
|-----------------|--------|----------------------------------------------------------------|
| VAL-AUTH-001    | PASS   | DOM: <form> with email + password inputs; screenshot at .harness-runtime/plans/<slug>/validation/<ts>/g1/VAL-AUTH-001/screenshot.png |
| VAL-AUTH-002    | PASS   | network: POST /sessions → 303 → GET /dashboard; 412 ms total   |
| VAL-AUTH-003    | FAIL   | expected body {"error":"invalid_credentials"}, got {"error":"unknown"}; repro at .harness-runtime/plans/<slug>/validation/<ts>/g1/VAL-AUTH-003/repro.sh |
```

一条断言 PASS，当且仅当其可观测行为成立**且**声明的 Evidence 已抓取。行为不成立即 FAIL（记录怎么不成立）。请求子集里每个 `VAL-` id 必须恰好出现一次——若某个并行 validator 漏掉或重复了，重新派发那一组。

### Step 7：拆环境

停掉后台进程。对 run artifacts 目录施加 patterns 文档的保留策略。

### Step 8：回写状态、报告、沉淀

把一份 run **综合报告（synthesis）**写到 artifacts 目录
（`.harness-runtime/plans/<slug>/validation/<ts>/synthesis.md`），记录：结论、所用隔离方案、各组结果、任何 setup 问题，以及发现的操作性事实清单。

**把每条结果回写 `validation-state.json`**——这是关键一步。
对合并矩阵里每个 `VAL-` id，由 controller（而非无状态 validator）执行：

```bash
fdd set-assertion <VAL-id> <status> "<evidence-pointer>"
```

矩阵结论到 state 枚举的映射：`PASS → passed`、`FAIL → failed`、`INCONCLUSIVE / SKIP / BLOCKED → blocked`。evidence-pointer 是截图 / repro 路径（或一行 network/terminal 备注）。

然后返回给调用方：

- 一行结论：`PASS (N/N)`、`FAIL (k/N)`、`INCONCLUSIVE (m/N)`、或 `BLOCKED (system did not start)`。
- 合并后的覆盖矩阵。
- artifacts 路径（synthesis 在这里）。
- 对任何 FAIL，给一段「怎么修」存根，指明失败断言与 reproducer 路径，便于调用方交回给 implementer。

**Knowledge persistence。** 若 setup 暴露出一条持久的操作性事实——错误的 ready 信号、漏掉的 seed 步骤、更快到达就绪的路径、某个界面的坑——把它追加到 `docs/user-test-patterns.md` 的 Knowledge Persistence 小节，让下次运行更快。只记事实，不记测试断言。若某项发现改变了约定（例如真实的 ready 信号），把那一节也改掉。

## Coverage Rules

- 请求子集里每条断言必须在合并矩阵中恰好出现一次，带明确的 `PASS`、`FAIL` 或 `INCONCLUSIVE`。仅当同组中某条在先的断言已 FAIL 且依赖它的断言无法探测时，才允许 `SKIP`；并显式记录该依赖。
- 一条断言 PASS，当且仅当其行为成立**且**声明的 Evidence 已抓取。无证据的 PASS 不算 PASS——那是未经验证的断言；标 `INCONCLUSIVE`。
- 一条探测成功、但没用断言上声明的验证方法的断言，是 FAIL 而非 PASS。方法是 validation contract 的一部分。
- 合并矩阵若漏掉子集里某个 id、或某个出现两次，即为无效——重新派发受影响的组。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「测试过了，这是多余的。」 | 测试断言的是作者写下的、贴着代码形状的期望。运行时验证跑的是一个全新 agent 读到的 validation contract。不同的不变量，两者都要。 |
| 「小任务我就跳过它。」 | 小任务覆盖断言少、跑得快；运行时验证在这里更便宜，不是更贵。跑它。 |
| 「validator 可以读源码弄清楚该探测什么。」 | 不行。它的全部意义在于 validator 只看到解析好的断言和运行系统。读源码会把你想摆脱的偏见重新装回去。 |
| 「全拆成并行组更快。」 | 并行派发每组都有 setup 成本、并有状态串扰风险。仅当子集大、且在 medium/expensive 界面时才拆；否则单个 validator 更简单也更稳。 |
| 「它过了，我不用抓证据。」 | 没有声明证据的 PASS 是断言，不是记录。Evidence 字段是 validation contract 的一部分；要么抓取，要么标 INCONCLUSIVE。 |
| 「某条断言失败了，我直接改 validation contract 里的断言。」 | 该断言是已批准 validation contract 的一部分。为了让运行通过去改它，会掩盖漂移。修系统，或把 validation contract 升级讨论——别悄悄放水。 |
| 「系统没起来，我把所有断言标 FAIL。」 | 起不来的系统是 `BLOCKED` 运行，不是一组失败的断言。把启动失败单独报告。 |
| 「逐 feature 验证太细，我只在里程碑闸跑。」 | 逐 feature 探测抓的是刚写下那段 diff 的回归；里程碑探测抓的是跨 feature 的交互。跳过逐 feature 会让缺陷一路堆积到里程碑闸，然后一起爆。 |

## Red Flags

- validator 输出里出现源码文件、函数名或实现细节——它已被「读代码」污染。换全新上下文重新派发。
- 合并矩阵的行数少于请求子集，或某条断言出现两次。
- 某个 PASS 行没有证据，或证据与该断言声明的 Evidence 不符。
- 某个 FAIL 行没有 reproducer。
- run artifacts 或 synthesis 未落盘；调用方拿不到审计痕迹。
- 并行组在状态上重叠（一组的写入改变了另一组的前置条件）——隔离方案错了；重新分组。
- 断言用了 `docs/user-test-patterns.md` 禁止的 selector 或断言方式（CSS class、文件路径、以实现命名的 test id）。先把 validation contract 退回修订再验证。
- 跳过状态隔离协议——断言互相污染，PASS / FAIL 变得依赖执行顺序。

## Verification

- [ ] `.harness-runtime/plans/<slug>/validation-contract.md` 存在，且请求的 `VAL-` id 能干净地解析为完整断言（含声明的 Evidence）。
- [ ] `docs/user-test-patterns.md` 存在，并指明了本次运行所用的工具与 surface cost tier。
- [ ] 系统干净启动，并抓到了 ready 信号。
- [ ] 任何断言运行前已施加状态隔离协议。
- [ ] 产出了隔离方案；派发形态（单个 vs 并行）与子集规模、界面成本相称。
- [ ] validator subagent 在全新上下文运行，且未读实现源码。
- [ ] 请求子集里每个 `VAL-` id 在合并矩阵中恰好出现一次，带 PASS、FAIL 或 INCONCLUSIVE 及证据。
- [ ] 每个 PASS 行带该断言声明的 Evidence；每个 FAIL 行含 reproducer。
- [ ] 每条结果已通过 `fdd set-assertion` 回写 `validation-state.json`（PASS→passed、FAIL→failed、INCONCLUSIVE/SKIP/BLOCKED→blocked）。
- [ ] run synthesis 落盘在 `.harness-runtime/plans/<slug>/validation/`；操作性发现已追加到 patterns 文档的 Knowledge Persistence 小节。
