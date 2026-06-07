---
name: fdd-validation-contract
description: 为一个 plan 撰写 validation contract——把 definition of done 落成一组可测试、用户可观测的 assertion（VAL-<AREA>-NNN），带 persona 与声明的 Evidence。它是 fdd 的 Phase 2。契约通过逐 area 的 investigation subagent 与若干轮 adversarial review 构建，而非一人独写。产出 .harness-runtime/plans/<slug>/validation-contract.md，并经由 hs-plan init-state 播种 validation-state.json。在项目内首次使用时，还会 bootstrap 项目级约定文档 docs/user-test-patterns.md。
---

# fdd-validation-contract：撰写 Validation Contract

## Overview

这是 **fdd 的 Phase 2**：当 plan 定义了「要构建什么」之后，本技能写出 definition of done——即 **validation contract**，一组结构化、可测试、用户可观测的 **assertion**，任何人（人类或 agent）都能据此探测，从用户视角证明构建确实可用。

产出物 `.harness-runtime/plans/<slug>/validation-contract.md` 成为以下内容的事实来源：

- 哪些用户可见的行为必须成立
- 哪些 persona 必须能完成这些行为
- 证明每个行为的那条精确可观测 assertion（`VAL-<AREA>-NNN`）
- 每条 assertion 的探测必须抓取的 Evidence，以及所需的 fixture 与起始状态

工作单元是 **plan**。plan 被拆解为若干 **area**（其用户可见的子能力）；每个 area 收纳该能力对应的 assertion。每条 assertion 拿到一个稳定 id `VAL-<AREA>-NNN`——这些 id 正是 Phase 3 中 `features.json` 所绑定（`fulfills`）的对象，也是 Phase 4 中 runtime validator 所探测的对象。契约变更时，assertion id 保持稳定。

一遍写成的契约必有盲区。本技能改为 **为每个 area 派发一个专门的 subagent 做 investigation**，据其发现起草 assertion，然后在交接前 **跑若干轮 adversarial review 来猎查缺口**。这份较真正是要点所在。

## When to Use

- 已存在一个 plan，且已在 `.harness-runtime/plans/<slug>/plan.md` 被接受（FDD 的 Phase 1）
- 构建带有用户可观测的行为（UI、API、CLI 输出、用户可见的副作用）
- 在 feature 被拆解之前——`VAL-` id 正是 `features.json` 所绑定的对象

**何时不用：**

- 这项工作没有用户可观测的界面（纯重构、内部优化）。改用 test-first development 与 `docs/references/testing-patterns.md` 来驱动单测与集成测试覆盖。
- 还没有被接受的 plan。先跑 FDD Phase 1；契约是针对 plan 撰写的。

## Philosophy

你负责的是 *definition of done*。plan 声明的每条 requirement 都必须归约为一条或多条可观测、可复现的 assertion。

- **要 assertion，不要脚本。** 一条 assertion 指明一个用户可见的结果及如何验证它；用什么 runner 由 patterns 文档决定，而不是你。
- **persona 锚定真相。** 「一个用户」太含糊。persona 是具体的，且可在各 case 间复用。
- **area 拆解 feature。** 一个 feature 是一组用户可见的子能力。事先把它们命名清楚，就给了 investigation 与 review 一条可以扇出展开的主脊。
- **多步价值用 journey 承载。** 当价值只在多个动作串起来后才显现（登录 → 加购物车 → 结账），case 捕获的是整条 journey，而不只是最后一条 assertion。
- **assertion 只谈可观测。** 不引用任何实现。如果一条 assertion 无法从运行系统外部探测，它就不属于这里。
- **Evidence 是声明的，不是临场凑的。** 每条 assertion 指明 validator 必须抓取的凭证——一张截图、一段 network 签名、一行 DB 记录——这样 PASS 背后是 artifact，而非一句声称。
- **别信第一稿。** 一人独写的契约看上去完整，实则不然。investigation 暴露一个人会遗忘的东西；adversarial review 暴露这一稿仍然漏掉的东西。
- **对 plan 做穷尽覆盖。** plan 里的每条 requirement 都映射到 ≥ 1 条 assertion。没有 assertion 的 requirement 就是覆盖漏洞。（反方向——每条 assertion 恰被一个 feature 认领——稍后由 Phase 3 的 `hs-plan contract-coverage` 强制保证。）

## Prerequisites

1. 已被接受的 plan，位于 `.harness-runtime/plans/<slug>/plan.md`——FDD 的 Phase 1
2. 项目测试约定，位于 `docs/user-test-patterns.md`——若缺失，由下面的 Step 0 来 bootstrap

若 plan 缺失，停下。第 2 项在首次运行时由 Step 0 处理。

## Process

```
[Step 0: BOOTSTRAP — first run only] ──┐
                                       ▼
INGEST → AREAS → INVESTIGATE → WRITE → REVIEW (≥2) → COVER → APPROVE
   │       │         │           │        │           │        │
   ▼       ▼         ▼           ▼        ▼           ▼        ▼
 read   plan →    one sub-    draft     adversarial  req →    human
 plan   sub-      agent per   rich      gap-hunt,    assert.  confirms
 +conv  capab.    area        assert.   update doc   matrix
```

### Step 0：Bootstrap 项目约定（仅首次运行）

每个项目只跑一次。当 `docs/user-test-patterns.md` 已存在并已批准时跳过。这次 bootstrap 定义了后续每次运行（以及 runtime validator）都要读取的测试契约。

你在定义测试契约，而不是在写 test case。五条规则指导这份文档：

- **贴合平台。** Web、macOS、iOS、Android 各有不同的 runner 与可观测界面。按平台选对工具；别假装一套技术栈通吃。
- **只谈可观测。** selector 与 assertion 引用的是用户能看见的、或外部探针能读到的东西。CSS class、文件路径、函数名一律禁止——它们会腐烂。
- **状态隔离。** 每个 case 都从一个已知 seed 起步。任何 case 都不借用另一个 case 的副作用。
- **persona 锚定。** 一个 case 指名一个 persona；persona 提供凭证、权限、数据。没有 persona，「合法用户」会演变成十种不同定义。
- **可复现。** 每个 artifact（截图、视频、日志）都落在一个可预测的路径，好让失败能被重放。

#### 0.1 Discover

读项目清单文件，推断范围：

- `package.json` / `Cargo.toml` / `pyproject.toml` / `Podfile` / `build.gradle` 等
- 已有的测试目录（`tests/`、`e2e/`、`cypress/`、`playwright/`、`Tests/`、`androidTest/`、`xcuitest/`）
- 架构文档（`docs/architecture.md`）——哪些界面是面向用户的？

起草前先把假设摆出来：

```
ASSUMPTIONS I'M MAKING:
1. Target platforms = Web (Vite + React)
2. Primary user surface = browser at localhost:5173
3. No mobile client in this iteration
4. Backend exposes HTTP under /api
→ Correct me now or I'll proceed with these.
```

#### 0.2 选定平台与工具

对每个目标平台，恰好选定一个主用 runner，并记录其 fallback：

| 平台 | 主用工具（对 LLM agent 友好） | Fallback |
|---|---|---|
| Web | Chrome DevTools MCP（DOM / network / console / screenshot / a11y tree） | Playwright |
| macOS app | computer-use API + 截图；应用内自省用 XCUITest | AppleScript |
| iOS app | 模拟器上的 WebDriverAgent / Appium + computer-use | XCUITest |
| Android app | UIAutomator / Maestro / Appium | adb + 截图 |
| HTTP API | curl + JSON 解析 | recorded fixtures |
| 后台 worker | 日志 grep + DB select | metrics endpoint |

记录清楚：选用 **哪个** 工具、**为何** 这样选、agent **如何** 调用它（确切命令或 MCP 调用）、以及探测前 **什么** 算作 ready 信号。

#### 0.3 撰写 `docs/user-test-patterns.md`

使用模板 `skills/fdd-validation-contract/assets/user-test-patterns.md`。挑出适用于本项目的子小节。这份文档必须回答：

1. **范围内的平台**——逐项列出，每项配一行理由。
2. **各平台的工具**——主用 + fallback，附调用方式。
3. **Case 维度**——happy path、edge、error、accessibility、performance、i18n、security。哪些每个 case 必须考虑，哪些可选。
4. **selector 与 assertion 规则**——只谈可观测；各给一个正例 + 一个反例。
5. **状态隔离**——每次探测都从一个已知 seed 起步；fixture / DB reset 协议。
6. **surface cost tier**——把每个界面分档为 cheap / medium / expensive，好让 runtime validator 规划隔离与批处理。
7. **Artifacts**——一次运行的截图 / 视频 / 日志写到哪里；保留规则。
8. **失败复现期望**——每个 FAIL 都附带一个可运行的 reproducer；格式与位置。
9. **反模式**——禁用 selector / 臆造 assertion / 状态泄漏 / grader gaming 的具体示例。

#### 0.4 交接

```
USER-TEST PATTERNS READY FOR REVIEW:
- Platforms in scope: [list]
- Primary tooling: [list]
- Surface cost tiers: [list]
- Anti-patterns called out: [count]
→ Approve, or tell me what to change.
```

一经批准，继续下面的 Step 1。本项目后续的运行将完全跳过 Step 0。

### Step 1：Ingest

按此顺序阅读：

1. `.harness-runtime/plans/<slug>/plan.md`——抽取 requirement、milestone、引用到的 persona、测试界面
2. `docs/user-test-patterns.md`——确认适用哪些工具、维度与 cost tier
3. `docs/design-docs/<name>.md`（若存在相关设计文档）——用于获取界面入口（URL 路径、API endpoint、CLI 命令）；**不要** 把实现细节带进 assertion

摆出假设：

```
ASSUMPTIONS I'M MAKING:
1. Requirements R1..R6 map to Web UI journeys; R7..R9 map to API + DB probes
2. Persona "returning_reader" must be added (not yet in registry)
3. No mobile platform applies to this build
→ Correct me now or I'll proceed with these.
```

### Step 2：Map Areas

把 feature 拆解成其用户可见的子能力——也就是 **area**。一个 area 是用户感知为「一件事」的、内聚的一片 feature：对一个登录 feature 而言，area 可能是 *credential sign-in*、*password recovery*、*session persistence*。它们成为文档里的 `## Area:` 小节，也是 investigation 与 review 的主脊。

- **按 plan 的规模来。** 简单的 plan 就是一个 area——不要人为拆分。丰富的 plan 有好几个。让 plan 的 requirement 与 milestone 来提示切缝。
- **一个跨 area 的位置。** 跨越 *本 feature 内* 多个子能力的 flow（例如「找回密码 → 然后用新密码登录」）放进单一的 `## Cross-Area Journeys` 小节。
- **止步于 feature 边界。** 跨入 *其它 feature* 的 flow 不在这里的范围内——把它们记成一条 Open Question，指向 milestone 集成验证，然后继续。

列出各 area 并在 investigation 前确认它们：

```
AREAS FOR <feature>:
1. <sub-capability A> — covers R1, R2
2. <sub-capability B> — covers R3, R4, R5
   Cross-area: <within-plan flow spanning A+B> — covers R6
→ Correct the decomposition or I'll investigate these.
```

### Step 3：Investigate（每个 area 一个 subagent）

对每个 area，在写任何 assertion 之前，派发一个全新 subagent 去枚举该 area 的所有用户交互。subagent 读 plan 与相关源码，返回一份按 **obvious / subtle / error-edge** 分组的交互清单——它不写 assertion。使用 `skills/fdd-validation-contract/references/investigation-prompt.md` 里的 prompt。

- 各 area 并行派发；每个 subagent 负责一个 area。
- 对单 area 的 feature，一个 subagent 足矣（若 feature 极其简单，也可内联做 investigation）。
- 价值在 **subtle** 与 **error-edge** 那些条目上——也就是第一稿会悄悄漏掉的那些交互。一份只列 happy path 的「友善」枚举，等于没完成本职工作。

把返回的各份清单综合起来；它们是 Step 4 的原材料。不要把它们逐字粘进文档——它们是交互清单，不是 case。

### Step 4：Write Assertions

把 investigation 得到的清单转成 assertion，归到各自的 area 下。每条 assertion 是一个 H3 标题，形式严格为 `### VAL-<AREA>-NNN: <title>`（AREA 为大写字母数字，NNN 为零填充 3 位数字——正是这个标题被 `hs-plan init-state` 解析），其后只跟两行（见 `references/user-test-template.md`）：

- **一段可观测行为段落**——以 persona 为锚，从用户视角描述必须成立的是什么。在行内指名 persona（按 registry id）。不引用任何实现。
- **一行 `Evidence:`**——validator 必须抓取、才能判这条 assertion 为 PASS 的凭证，用 patterns 文档的词汇：`screenshot` / `console-errors` / `network(POST /sessions → 303)` / `terminal-output`。

整块就这些。保持精简：逐 feature 的前置条件放在 `features.json`；requirement→assertion 的映射放在覆盖矩阵里；失败 artifact 是 validator 的常态职责——这些都不属于 assertion 内部。

多步价值（登录 → 加购物车 → 结账）是一条 assertion，描述整条 journey 的可观测终态。把跨越 *本 plan 内* 多个子能力的 assertion 放到 `## Cross-Area Flows` 小节下。每条 assertion 只对应一个可观测终态。

### Step 5：Adversarial Review（≥ 2 轮，顺序进行）

看上去完整的草稿几乎总有缺口。**至少跑两轮顺序 review**；每一轮为每个 area 派发一个 adversarial reviewer（一轮之内并行）。使用 `skills/fdd-validation-contract/references/adversarial-review-prompt.md` 里的 prompt。

每个 reviewer 都被要求保持怀疑、去找 **缺了什么**——交互、edge 取值、错误状态、accessibility、security 边界、feature 内跨 area 的 flow——并返回一份缺失 case 清单，而不是盖个橡皮章。

每一轮之后：

1. 综合各 reviewer 的发现。
2. **编辑文档** 补上缺失的 case——不要只是记录他们说了什么。
3. 在 **更新后** 的文档上开始下一轮。

各轮顺序进行，这样每一轮都建立在上一轮的补充之上。两轮是下限：第一轮多半捉到表层缺口，第二轮才见深度。当某一轮再也浮不出实质内容时停下。

plan 的每条 requirement 都必须被至少一条 assertion 覆盖——靠阅读来核验，而不是靠矩阵。一条不证明任何 plan requirement 的 assertion，要么是臆造覆盖（删掉它），要么是 plan 缺口（暴露它）。若你发现 plan 不完整或含糊，停下并暴露它；**不要** 凭空发明 plan 没有声明的行为。

### Step 6：Seed state 并交接

播种状态文件，然后交付人类评审：

```bash
hs-plan init-state          # parses the VAL- headings into validation-state.json (all pending)
```

任何一轮 adversarial review 增删了 assertion 标题之后，重新跑一次 `hs-plan init-state`；它会保留已存在 id 的状态。

```
VALIDATION CONTRACT READY FOR REVIEW:
- Plan: <slug>
- Areas: <list>
- Assertions written: <count>  (investigation surfaced <N>, review added <M>)
→ Approve, or tell me what to change.
```

一经批准，`VAL-` id 就是 `features.json`（Phase 3）与 runtime validation（Phase 4）的稳定输入。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「plan 的 requirement 本就可测，我不需要 contract。」 | plan requirement 是散文式意图。assertion 是可运行的：persona + 可观测行为 + 声明的 Evidence + 一个 feature 所绑定的稳定 VAL- id。不同 artifact，不同消费者。 |
| 「assertion 我自己写就行，investigation subagent 是额外开销。」 | 一人独写恰恰是本技能要防的失败。一个人列出 happy path，却忘了那些 subtle 交互。investigation 一轮正是让它们浮现的地方。 |
| 「一轮 review 就够了。」 | 第一轮捉到表层缺口；第二轮才出深度。两轮是下限，不是上限。 |
| 「reviewer 都同意它完整了。」 | 如果某个 reviewer 盖了橡皮章，那是 prompt 不够 adversarial。必须要求 reviewer 去猎查缺了什么，否则他们什么也找不到。 |
| 「一条 requirement 配一条 assertion 就够。」 | 一条 requirement 往往覆盖 happy + error + edge；每个分支一条 assertion 是下限，不是上限。 |
| 「persona 是额外负担——『一个登录用户』就行。」 | 跨多条 assertion，『一个登录用户』会漂移成十种略有差异的含义。在行内指名一个具体 persona，让每次探测都指同一件事。 |
| 「我注意到一个 plan 没覆盖的行为，我加条 assertion。」 | 停下。那是 scope drift。暴露它；让 plan 被更新；然后 assertion 才跟上。 |

## Red Flags

- 文档一遍写成，既无 investigation 也无 adversarial review
- 某个 reviewer 返回「looks good」且无任何缺失 case——那它不 adversarial
- 某条 assertion 不证明任何 plan requirement，又未标 `(guard: ...)`（臆造覆盖）
- 某个 case 引用了实现（函数名、文件路径、指向某代码模块的内部 data-test id）
- 某条 assertion 没指名具体 persona，或写成「any user」
- 某条 assertion 没有 `Evidence:` 行，或证据无法抓取（「人工核验」）
- requirement 覆盖矩阵漏掉了某条 plan requirement
- 某个 area 被拆得太细，以致每个「area」只有一条 assertion——过度拆解
- selector 用了 CSS class、DOM 位置或内部 test id——允许清单见 `docs/user-test-patterns.md`

## Verification

- [ ] plan 已在 `.harness-runtime/plans/<slug>/plan.md` 被接受
- [ ] 若为项目内首次运行：已按 Step 0 撰写并批准 `docs/user-test-patterns.md`（9 个小节齐全；selector 规则含正例 + 反例；surface cost tier 已设定；反模式已点明）
- [ ] plan 已拆解为 area；area 已在 investigation 前确认
- [ ] 每个 area 都由一个 subagent 做过 investigation（单 area 的简单 plan 可内联进行）
- [ ] 至少跑了两轮 adversarial review；两轮之间编辑过 contract
- [ ] 每条 assertion 都是 `### VAL-<AREA>-NNN: <title>` 形式的 H3，含一段可观测行为段落（行内指名 persona）+ 一行 `Evidence:`，符合 `references/user-test-template.md`
- [ ] plan 的每条 requirement 都被 ≥ 1 条 assertion 覆盖
- [ ] selector 与 assertion 只谈可观测（不引用任何实现）
- [ ] 已经人类评审并批准
- [ ] contract 已保存到 `.harness-runtime/plans/<slug>/validation-contract.md`，且已跑 `hs-plan init-state`
