---
name: fdd-planning
description: FDD 主流程 step 1（规划与拆解）。覆盖两段——plan（与用户弄清需求、经 investigator 调查代码库、定出 milestone、写出 plan.md 并呈现）与 features（把 milestone 拆成 features.json 并过 coverage 闸）。中间的 contract 段交给 harness-stack:fdd-validation-contract。由 harness-stack:fdd 调用。
---

# fdd-planning：规划与拆解

本技能是主流程的 **step 1（规划）**，覆盖其 **plan** 段与 **features** 段；中间的 **contract** 段由 `harness-stack:fdd-validation-contract` 完成。

规划是最重要的一步。这里的质量会被后续每一步放大；规划赶工会导致遗漏、返工和构建失败。

**人类确认只发生一次：在 Step 1 的需求澄清。** 这是整个 FDD 流程唯一会阻塞等你的环节——之后的 milestone、plan、contract 都只**呈现、不阻塞**：写定即自动进入下一段，用户可随时打断纠正，但流程默认不停。正因如此，Step 1 的彻底程度，就是后续自主执行是否安全的前提——把需求、范围边界、以及「完成」长什么样，都在这里一次性敲定。

## 工具：fdd CLI

本技能所有 `fdd <subcommand>` 都指 `node <plugin-root>/packages/fdd/bin/fdd.mjs <subcommand>`——插件自带的预构建 bundle，不在 PATH 上、无需安装、无需编译（只要 Node >= 20）。定位 bundle、命令速查与故障排查见 `<plugin-root>/references/fdd-cli.md`。

## Plan

### Step 0 — Init

挑一个简短的 kebab-case slug（`checkout-flow`、`auth-migration`），然后：

```bash
fdd init <slug>     # creates .harness-runtime/plans/<slug>/ + makes it active
fdd active          # verify
```

### Step 1 — Understand requirements with the user（唯一的人类确认闸）

**这是整个 FDD 流程唯一阻塞等你的环节。** 下游的 milestone、plan、contract 都只呈现不阻塞，所以这里没问到的，后面不会再有第二次机会拦你。把它问透——目标、范围边界、以及「完成」长什么样，都要在这里一次性敲定。

目标：把用户真正想要的东西（而非你的假设）浮出水面，抓住隐含 / 顺口提及的需求，梳理出基础设施边界，并把后续 plan 与 contract 所需的判断**前置**到此刻。

1. 用一段话**复述目标**，结尾加上「*告诉我哪里说错了。*」等待纠正。
2. 识别面向用户的各个**界面**（CLI、HTTP API、UI 页面、后台任务、库）。与用户确认。
3. 提澄清问题。用 `AskUserQuestion` 把 2-4 个相关决策归为一组；别把不相关的混在一起。轮数不设上限——含糊未消除就继续问。

建议的澄清话题（已答过的跳过）：

| 话题 | 为何对下游重要 |
|---|---|
| 范围边界——「X 在范围内吗？」 | 防止 features 段出现特性蔓延 |
| **「完成」长什么样——验收意图、关键 happy path、必须成立的可观测结果** | **下游 contract 不再单独找用户批准，其断言以此为锚** |
| **里程碑切分偏好——一次交付还是分阶段可用** | **下游 milestone 只呈现不阻塞，倾向前置到此处** |
| 非功能性需求：性能、安全、可访问性 | 在 contract 里成为跨 area 的断言 |
| 技术偏好 / 约束 | 塑造 implementer brief |
| 测试界面——真实浏览器？curl？CLI？ | 塑造 contract 的 evidence + user-test 探测 |
| 基础设施——端口？已有服务？禁区资源？ | 原样写入 `plan.md` 的 Infrastructure（worker 边界） |

**不要假设。** 拿不准就问。一句顺口的「哦，它还应该……」就是一条完整需求——把它捕获下来。把含糊的请求重述为具体、可测试的意图；把假设显式摆出来；把 must-have 和 nice-to-have 分开。

4. **统一签收（confirmation 收口）。** 在动用 investigator 之前，把已捕获的一切回读一遍，并做一次合并确认——它把过去散落在 milestone 确认（旧 Step 4）与 plan 接受闸（旧 Step 9）的人类判断，统一前置到此刻：

```
REQUIREMENTS LOCKED — 动 investigator 前最后一次纠正机会：
- 目标：<一句话>
- 范围内：<bullets>　范围外：<bullets>
- 完成长这样（验收意图）：<bullets>
- 里程碑偏好：<一次交付 / 分阶段：…>
- 基础设施边界：<端口 / 已有服务 / 禁区>
→ 改这里，否则我据此调查并一路把 plan 与 contract 走到底（之后只呈现、不再阻塞）。
```

签收之后，规划不再为确认而停。

### Step 2 — Investigate the codebase

委派给只读的 `harness-stack:investigator` 子代理；让互不相关的调查并行跑。**你**只读结构：README、AGENTS.md、清单文件（`package.json` / `Cargo.toml` / `pyproject.toml`）、顶层目录树、以及顶层的 build/test 入口。investigator 读：受影响 area 里现有的模块结构、同级 feature 是怎么接线的、测试框架和如何跑单个测试、目标界面是否已存在、以及哪些 dev/db/queue 服务跑在哪些端口上。

每条调查 prompt 都要说明它的 **goal**（它支撑什么决策）、**scope**（哪些路径）、以及 **expected output**（一段话 + 一份带 `path:line` 的简短清单，而非一坨代码）。如果你必须跑项目才能学会怎么跑，**先确认怎么跑**——build/test 命令、dev server、db 配置、所需服务、环境变量。

### Step 3 — Online research (only if needed)

如果构建依赖一个小众/新生的生态、或一个 SDK 重度集成且精确 API 界面很关键，派 `harness-stack:investigator`（它带 WebSearch/WebFetch）做在线调研。把耐久的发现提炼进 `docs/` Library，而非 plan。

### Step 4 — Identify milestones（呈现，不阻塞）

一个 **milestone** 是一个垂直切片，它让产品停在一个可测试、自洽的状态。每个 milestone 边界都会触发完整验证（review + user-test）。

- 小型构建：**1 个 milestone**（validator 在最后跑一次）。
- 中型：**2-3 个 milestone**，按界面或「先分层再集成」组织。
- 大型：**3-5 个 milestone**。超过 5 个通常意味着这份工作该拆了。

把每个 milestone 表述为「名字 + 一句『这之后，产品就能做 X』」。**呈现这份切分供用户知悉，随即继续——不阻塞等待批准**（里程碑偏好已在 Step 1 签收时前置）。若切分与 Step 1 的偏好相冲突，那是 Step 1 没问清，回去补问。

### Step 5 — Infrastructure and boundaries

确认并记录 worker 可碰与不可碰的东西：新服务的端口范围；它们可用的外部服务（例如跑在 `:5432` 上的现有 postgres）；禁区服务和路径；并发规则（默认：一次一个 feature）。这些原样写入 `plan.md` 的 **Infrastructure** 小节，并回显进 implementer brief 的 Boundaries 块——不存在逐 plan 的 AGENTS.md，所以边界以 `plan.md` 为准。

### Step 6 — Testing strategy

确认：**测试命令**（确认它*现在*能跑——派一个 subagent 跑一次）；**user-test 界面**（validator 如何端到端地驱动产品——dev server + browser MCP、对 API 打 curl、CLI 二进制、库 fixture）；以及每个界面的 **surface cost tier**（cheap / medium / expensive），user-test 探测据此选择隔离策略。这些约定活在 `docs/user-test-patterns.md`（Library）里；引用它，别重新推导。

### Step 7 — Draft features (shape only)

按 milestone 列出候选 feature——足够与用户确认范围即可。每个应约为一个 worker session 的工作量、可独立评审、且具体（一个特定的 endpoint/table/component/function），基础性 feature 排在依赖它的 feature 前面。把 precondition/`verificationSteps` 推迟到 features 段。

### Step 8 — Write the plan

用 `references/plan-template.md` 把方案写到 `.harness-runtime/plans/<slug>/plan.md`。把每一条已捕获的需求在 **Captured requirements** 小节里复述一遍——它对照的是 Step 1 已签收的需求。

### Step 9 — Present the plan（呈现，不阻塞）

呈现 plan 摘要供用户知悉，**随即自动进入 contract 段——不阻塞等待批准**（需求已在 Step 1 签收）。措辞用「这是据已签收需求写定的 plan，我继续做 contract；要改随时打断。」`plan.md` 就此确立为本次构建的方案。只有当 plan 暴露出 Step 1 未澄清的新含糊时，才停下回到 Step 1。

## Contract（交给 fdd-validation-contract）

plan 写定后，FDD 编排会调 `harness-stack:fdd-validation-contract` 把 plan 里可测试的行为写成 `.harness-runtime/plans/<slug>/validation-contract.md` 的 `VAL-<AREA>-NNN` 断言，并 `fdd init-state` 播种 `validation-state.json`。这不在本技能内——但 features 段必须等它定稿，否则 feature 的 `fulfills` 无从绑定。

## Features

contract 定稿、state 播种之后，回到本技能把写定的 plan + 定稿的 contract 拆进 `.harness-runtime/plans/<slug>/features.json`。每个 feature 是一个 implementer 单 session 的工作单元，以 `fulfills` 绑定到它要让其变得可测的那些断言。完整 schema、`fulfills` 语义、排序与 sizing 规则见 `references/features.md`。

收尾必须过 coverage 闸：

```bash
fdd contract-coverage     # MUST report 'coverage OK'（每条断言恰好被一个 feature 认领）
```

解决每一处 `ORPHAN` / `DUPLICATE` / `UNKNOWN-CLAIM` / `STATE-ONLY` / `CONTRACT-ONLY` 后才进 step 2（`harness-stack:fdd-execution`）。

## Anti-patterns

- ❌ 在 Step 1 之前就调查代码库（你还不知道要找什么）。
- ❌ 自己调查而不经 subagent（污染你的上下文）。
- ❌ 在 milestone 呈现（Step 4）之前就拆解 feature（Step 7）。
- ❌ 在 plan 段就写 `features.json`——features 是 features 段的事，要等 contract 定稿后再拆。
- ❌ 跳过需求复述（几乎必然会漏掉一条需求）。
- ❌ 把 Step 1 的需求澄清赶工，指望后面的 milestone / plan / contract 再拦住用户确认——后面只呈现、不阻塞，不会再有第二次机会。
- ❌ 在中间环节（milestone / plan / contract 呈现）重新设阻塞确认闸——确认只在 Step 1。
