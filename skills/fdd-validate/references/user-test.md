# Stage 3 — user-test：运行时断言验证

> `fdd-validate` 流水线第 3 级的执行细则——在静态验证（stage 1）与代码审查（stage 2）之后，从用户视角确认运行中的系统真的符合 validation contract。由 fdd-validate 在 milestone / final scope 调用，断言子集与 diff 区间由调用方按 scope 给定（milestone scope = 该里程碑断言子集；final scope = 全集 coverage）。

## Overview

静态工具——单测、lint、类型检查、code review——读的是代码。它们无法告诉你**运行中的系统**是否真的符合 validation contract 的要求。本 stage 补上这道缝：拉起应用、规划如何隔离各条断言、对活系统逐条探测、给出带证据的覆盖矩阵。探测由一个从未读过实现的全新 subagent 执行；PASS / FAIL 只依据可观测状态判定。

在本 stage，**fdd-validate 担任 controller**：它解析运行目标、规划隔离、派发 validator、合并结果。`user-test-validator` subagent 是**无状态探针**：跑一组断言，返回一份局部矩阵。controller 按资源与隔离能力派发 validator：共享 GUI 通道只允许一个 owner，其他组排队；只有入口、状态和资源完全隔离的组才能并行。昂贵不等于可以并发。没有单独的「flow」agent：复用同一个 validator，编排由 controller 负责。

本 stage 按受影响的 contract 断言探测。修复/基础性 feature 的 `fulfills: []` 不代表无验证：它们可能影响由其他 feature 认领的已有断言。仅确认没有任何适用断言时才为 no-op，仍需 stage 1/2 把关。

## Prerequisites

1. **Validation contract**：`.harness-runtime/plans/<slug>/validation-contract.md`——每条断言（`### VAL-<AREA>-NNN: <title>`）带一段可观测行为描述、一个 persona、以及声明的 Evidence。见 `harness-stack:fdd-validation-contract`。
2. **项目测试约定**：`docs/user-test-patterns.md`——声明各平台工具链、ready 信号、状态隔离协议、**surface cost tier**、personas（各自如何认证 / 能访问什么）、artifacts 布局、以及一个 knowledge-persistence 小节。模板见 `skills/fdd-validation-contract/assets/user-test-patterns.md`。
3. **可运行目标**——一条把系统拉起来的命令（`pnpm dev`、`cargo run`、`docker compose up`）以及一个已知的 ready 信号（URL 有响应、日志行、端口打开）。定义在 `docs/user-test-patterns.md`。
4. **Diff 区间**——覆盖被验证工作的 `BASE_SHA..HEAD_SHA`，以便把报告挂到某个 feature、里程碑或 PR。
5. **断言子集**——本次 milestone、修复批次或 final 负责的 `VAL-` id。修复过程中先保留最小失败 reproducer，批次结束再 sweep；不要求每个 feature 完成后重启昂贵 GUI 全量探测。

## Process

### Step 1：解析运行目标

读 `docs/user-test-patterns.md` 拿到各平台工具与 ready 信号。对照项目清单文件（`package.json`、`Cargo.toml`、`pyproject.toml` 等）确认启动命令与工作目录。从 `.env.example` 或 env-init 技能的产物里取所需环境变量。

先从项目文档、配置和 brief 查明启动条件；仍缺必需信息时向 controller 报告 BLOCKED，不猜测运行，也不重复询问已有答案。

### Step 2：环境预检与启动

先执行项目声明的环境 preflight（来自 plan 的 Infrastructure、`docs/user-test-patterns.md` 或项目配置）：检查本次 surface 所需的工具、权限、交互会话、入口与 fixtures。记录命令和证据；缺少必需配置时先向 controller 报告。不要假设某个平台、权限系统或 GUI 工具。环境预检失败时返回 `BLOCKED`、恢复条件与日志；不自动创建产品修复 feature。

在解析出的工作目录里启动目标，记录可追踪进程/工具 session、日志与 owner，遵循 `skills/fdd-execution/references/worker-lifecycle.md`。服务可以后台运行，但必须由 controller 跟踪和回收。在任何探测开始前，先施加 `docs/user-test-patterns.md` 的状态隔离协议（DB reset、storage seed、fixture load）。等到 ready 信号——**不要**在就绪前就开始探测。把 stdout/stderr 抓到日志文件，便于归因失败。

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
- 大子集按共享状态与 reset 成本分组。共享 GUI 由 controller 排队派发，同一时刻只有一个 owner；独立资源上的组可以并行，不能仅凭断言数量决定。
- 构建使用项目声明的并发上限；GUI 所用产物绑定代码 SHA/patch、配置及环境证据，避免重复构建或探错版本。

记录该方案；它会进 run 综合报告。

### Step 5：派发 validator

派发 `user-test-validator`（见 `agents/user-test-validator.md`），brief 里**针对其分组**给出：

- 该组解析好的各断言（每个 id 一份）。
- 运行系统的 base URL 或其它入口坐标。
- 启动日志文件路径。
- diff 区间 `BASE_SHA..HEAD_SHA`（仅用于归因；validator **不**读 diff）。
- validator 必须写入的 artifacts 目录（并行运行时按组命名空间隔离）。
- 它负责的状态 reset 边界，来自隔离方案。
- preflight 证据、代码/产物与契约版本、环境记录、resource/owner、生命周期记录及释放方式。

只有资源隔离的分组才一批派发；共享 GUI 组等待前一个 owner 完成并释放后再派发。validator 不自行启动额外 GUI owner。资源占用是 controller 的编排记录，不假设 CLI 提供自动锁。每个 validator 只跑分配给它的那组，PASS 时抓取每条断言声明的 Evidence、FAIL 时抓取 artifacts-on-FAIL，返回一份局部矩阵。validator 绝不读实现源码；它严格按声明探测每条断言，用 `docs/user-test-patterns.md` 指定的平台工具。

### Step 6：合并覆盖矩阵

收齐所有 validator 的局部矩阵并合一。每行 PASS 时带声明的证据，FAIL 时带失败断言 + reproducer：

```
| Assertion ID    | Status | Evidence                                                       |
|-----------------|--------|----------------------------------------------------------------|
| VAL-AUTH-001    | PASS   | DOM: <form> with email + password inputs; screenshot at .harness-runtime/plans/<slug>/validation/<ts>/g1/VAL-AUTH-001/screenshot.png |
| VAL-AUTH-002    | PASS   | network: POST /sessions → 303 → GET /dashboard; 412 ms total   |
| VAL-AUTH-003    | FAIL   | expected body {"error":"invalid_credentials"}, got {"error":"unknown"}; repro at .harness-runtime/plans/<slug>/validation/<ts>/g1/VAL-AUTH-003/repro.sh |
```

一条断言 PASS，当且仅当其可观测行为成立**且**声明的 Evidence 已抓取。行为不成立即 FAIL（记录怎么不成立）。请求子集里每个 `VAL-` id 必须恰好出现一次。漏项或重复时先用原始产物核对并请原 validator 补正报告；结果冲突、缺真实测量或证据已失效时才重探受影响项。

### Step 7：拆环境

回收本 run 拥有的进程/工具 session，并确认 GUI owner 已退出再释放通道；不得停止其他任务的服务。对 run artifacts 目录施加 patterns 文档的保留策略。

### Step 8：回写状态、报告、沉淀

把一份 run **综合报告（synthesis）**写到 artifacts 目录
（`.harness-runtime/plans/<slug>/validation/<ts>/synthesis.md`），记录：结论、代码/产物与契约版本、配置/依赖/环境、起止时间、所用隔离方案与 owner、各组结果、任何 setup 问题，以及发现的操作性事实清单。

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
- 对产品 FAIL，列出失败断言与最小 reproducer，由 controller 按共同根因/修改范围合并修复批次并优先交回原 implementer；不要一条 finding 创建一个 feature。对环境 BLOCKED 列出恢复条件，恢复后重验。

**Knowledge persistence。** 若 setup 暴露出一条持久的操作性事实——错误的 ready 信号、漏掉的 seed 步骤、更快到达就绪的路径、某个界面的坑——把它追加到 `docs/user-test-patterns.md` 的 Knowledge Persistence 小节，让下次运行更快。只记事实，不记测试断言。若某项发现改变了约定（例如真实的 ready 信号），把那一节也改掉。

## Final 与修复后的覆盖

final 不能只检查「历史至少一次 PASS」。controller 对每条旧证据记录其版本及后续变化，判断代码、共享依赖、配置、契约、运行环境与跨 milestone 交互是否影响该断言。发现证据失效时立即经 CLI 复位 pending，重探缺证据、已失败、已受影响的断言；不能确定时扩大到相关 surface 或全量。仅明确不受影响的既有 PASS 可沿用，synthesis 必须引用报告并记录理由。当前 CLI 不自动校验版本，`fdd gate` 的状态检查不能替代这一判断。

修复先验证最小失败路径，修复批次结束做受影响范围 sweep。若尚未完成相关回归，不得凭 reproducer 单项通过宣布批次通过。

## Coverage Rules

- 请求子集里每条断言必须在合并矩阵中恰好出现一次，带明确的 `PASS`、`FAIL`、`INCONCLUSIVE` 或 `BLOCKED`。仅当同组中某条在先的断言已 FAIL 且依赖它的断言无法探测时，才允许 `SKIP`；并显式记录该依赖。
- 一条断言 PASS，当且仅当其行为成立**且**声明的 Evidence 已抓取。无证据的 PASS 不算 PASS——那是未经验证的断言；标 `INCONCLUSIVE`。
- 一条探测成功、但没用断言上声明的验证方法的断言，是 FAIL 而非 PASS。方法是 validation contract 的一部分。
- 合并矩阵漏项/重复时不能收口。先补正报告；只有缺少可靠测量、结果冲突或证据失效时重探。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「测试过了，这是多余的。」 | 测试断言的是作者写下的、贴着代码形状的期望。运行时验证跑的是一个全新 agent 读到的 validation contract。不同的不变量，两者都要。 |
| 「先跑了修复 reproducer 就不用批次回归。」 | 最小路径确认修复；批次 sweep 覆盖受影响行为，二者不能相互替代。 |
| 「validator 可以读源码弄清楚该探测什么。」 | 不行。它的全部意义在于 validator 只看到解析好的断言和运行系统。读源码会把你想摆脱的偏见重新装回去。 |
| 「全拆成并行组更快。」 | 并行派发每组都有 setup 成本、并有状态串扰风险。只有资源和状态均隔离才可并行；共享 GUI 必须串行，cost tier 只决定批次与 reset 策略。 |
| 「它过了，我不用抓证据。」 | 没有声明证据的 PASS 是断言，不是记录。Evidence 字段是 validation contract 的一部分；要么抓取，要么标 INCONCLUSIVE。 |
| 「某条断言失败了，我直接改 validation contract 里的断言。」 | 该断言是已批准 validation contract 的一部分。为了让运行通过去改它，会掩盖漂移。修系统，或把 validation contract 升级讨论——别悄悄放水。 |
| 「系统没起来，我把所有断言标 FAIL。」 | 起不来的系统是 `BLOCKED` 运行，不是一组失败的断言。把启动失败单独报告。 |
| 「每个 feature 都重跑全量 GUI 更安全。」 | feature 自验保留目标检查；昂贵 sweep 在 milestone / 修复批次执行，GUI 缺陷先跑最小 reproducer，避免重复启动成本。 |

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
- [ ] 产出了隔离方案；派发形态与资源隔离相符，共享 GUI 无重叠 owner，构建未超过项目并发上限。
- [ ] validator subagent 在全新上下文运行，且未读实现源码。
- [ ] 请求子集里每个 `VAL-` id 在合并矩阵中恰好出现一次，带 PASS、FAIL、INCONCLUSIVE、SKIP 或 BLOCKED 及证据。
- [ ] 每个 PASS 行带该断言声明的 Evidence；每个 FAIL 行含 reproducer。
- [ ] 每条结果已通过 `fdd set-assertion` 回写 `validation-state.json`（PASS→passed、FAIL→failed、INCONCLUSIVE/SKIP/BLOCKED→blocked）。
- [ ] run synthesis 落盘在 `.harness-runtime/plans/<slug>/validation/`；操作性发现已追加到 patterns 文档的 Knowledge Persistence 小节。

- [ ] preflight 证据已记录；环境阻塞没有自动转成产品修复任务。
- [ ] final 沿用的 PASS 均有版本证据和后续影响判断；不确定的范围已重验。
