---
name: fdd-execution
description: FDD 主流程 step 2——执行循环。串行驱动 feature 构建：next-feature → 派 implementer（自验）→ handoff 决策树 → complete。per-feature 不派独立验证器——feature 级把握来自 implementer 自验 + 交接决策树；真正的验证（静态→审查→user-test）批量放在里程碑收口（调 harness-stack:fdd-validate scope=milestone）与循环跑空（scope=final）。由 harness-stack:fdd 在 features.json 通过 coverage 后调用。
---

# fdd-execution：FDD 执行循环

最长的一步。你驱动一个**串行构建循环**：一次一个 feature——派 implementer 构建并自验，跑交接决策树收口；**per-feature 不跑独立验证器**。真正的验证（静态验证 → 代码审查 → user-test）批量交给 `harness-stack:fdd-validate`，只在里程碑收口与循环跑空时调。

```
loop:
  f = fdd next-feature           # first pending; empty => done
  sanity-check preconditions
  fdd set-status f in_progress
  dispatch implementer (self-verifies) -> handoff (fdd handoff f)
  run handoff decision tree (references/handoff-handling.md)   # per-feature gate
  fdd set-status f completed
  if milestone's impl features all completed/cancelled and not sealed:
     harness-stack:fdd-validate(scope=milestone)  -> fdd seal-milestone <m>
when loop empty:
  harness-stack:fdd-validate(scope=final)         -> fdd gate
```

**per-feature 的把握从哪来？** 不来自一个独立验证器，而来自两件事：(1) implementer 在交接前**自验**——跑该 feature 声明的 test/lint/type-check，把真实输出记进 handoff 的 `verificationEvidence`；(2) controller 跑**交接决策树**核验它（commit 在、树干净、每个 verificationStep 都有真实证据，否则降级为 `partial`）。批量验证（独立硬门禁、跨 feature scrutiny、code-review、运行时探测）成本高，放到里程碑一次跑更划算，也能抓到跨 feature 交互——这正是 fdd-validate 的职责。

**执行是串行的。** 一次一个 feature。一步内部的只读并行没问题；并发的 implementer 不行——它们会践踏共享状态、做出互相矛盾的决策。

**controller 绝不写代码、绝不为修一处发现而去编辑实现。** 每一处修复都回到 implementer。controller 一旦编辑代码，全新上下文不变量就没了。验证本身不在本技能里做——批量验证全部委派给 `harness-stack:fdd-validate`。

## Before the loop (once)

```bash
fdd contract-coverage     # MUST report 'coverage OK'
fdd list-features         # eyeball ordering
git status                    # working tree clean
```

## Per-feature loop

### 1. Next feature
```bash
fdd next-feature          # -> <id>\t<agent>\t<milestone>  (empty => 交给 fdd-validate 做 final)
```

> 没有第「validate this feature」步——交接决策树（step 4）就是 per-feature 闸。

### 2. Sanity check
feature 的 `preconditions` 满足了吗？（若其中一条说「schema X 存在」，确认它确实存在。）工作树干净吗？若某个 precondition 未满足，在它前面创建/重排一个基础性 feature，或者若它已无意义就 `fdd set-status <id> cancelled`。

### 3. Dispatch the implementer
```bash
fdd set-status <id> in_progress
```
然后用 `references/implementer-brief.md` 的 brief 发 `Task(subagent_type="implementer", …)`。填入 feature 的各字段、**Boundaries** 块（来自 `plan.md` 的 Infrastructure）、以及文件范围。implementer 只读 brief——**不要**把 plan 或 contract 内联进去。brief 要求 implementer **自验**（逐条跑 feature 的 verification steps、抓真实输出），并以写一份带 `verificationEvidence` 的 handoff JSON、执行 `fdd write-handoff <id> <path>` 收尾。

### 4. Handle the handoff —— per-feature 闸
```bash
fdd handoff <id>
```
跑 `references/handoff-handling.md` 里的决策树。它会路由 `returnToController` / `failure` / `partial` / `success`，追踪 `discoveredIssues` / `whatWasLeftUndone`，并传播 `criticalContext`。**这就是 per-feature 闸**：一个 feature 只有在 `success` 经核验（commit 在、树干净、每个 `verificationStep` 都有真实证据——否则降级 `partial`）后才算完成。任何 `failure`/`partial`/`returnToController` → 按决策树回 implementer 或修根因；不另派验证器。

### 5. Complete
```bash
fdd set-status <id> completed     # moves it to the bottom
```
更新 `plan.md` 的 Progress（追加一行 handoff-log）。回到 step 1。

## Milestone & final gates

当一个 milestone 里每个实现型 feature 都 `completed`/`cancelled` 且尚未封存（`fdd is-sealed <m>` → `no`）时，调用 **`harness-stack:fdd-validate`，scope = milestone**——它对里程碑累计 diff 跑完整流水线（静态验证：硬门禁 + 逐 feature scrutiny + 治理反馈、触敏感面时并行 security-auditor；代码审查；运行时探测里程碑断言子集），全过后应用治理反馈并 `fdd seal-milestone`。当循环跑空、所有 milestone 已封存时，调用 **`harness-stack:fdd-validate`，scope = final**——跨 milestone scrutiny + coverage gate + `fdd gate`。完整流程见该技能。

milestone gate 失败时，validator 会指明问题 feature 与证据——按那些发现回 implementer 修（在 features 顶部建修复 feature），修完对该 milestone 重跑 fdd-validate。

## Round budget

**每个 feature 3 轮。** 3 轮 implementer 之后交接仍非 `success`、或仍 `BLOCKED` → 停下并上交给人。问题出在 plan、contract、或 feature 范围上；再加轮次只会稀释信号。绝不在相同条件下重新派发一个 `BLOCKED` feature——换上下文、换模型，或拆了它。（milestone gate 暴露的问题同样回 implementer，不在 controller 手里修。）

## Commit discipline

implementer 为每个 feature 创建自己的原子 commit（conventional-commit 格式）。**controller** 只 commit 自己的 artifact/Library 更新（plan.md、contract、docs/ Library）——而且 plan 目录已 gitignore，所以 controller 的「commit」大多只是耐久的 docs/ 更新。若一个 implementer 返回 `success` 却留下一棵未提交的脏树，停下：当作 `partial` 处理，并修正 implementer brief。

## Handling mid-flow user requests

当用户在流程中途要求一处改动时：

1. **暂停**——不要立刻拆解。
2. **澄清 + 调查**——`AskUserQuestion` + 只读 `investigator`（若涉及新技术再加在线调研）。迭代到清晰为止。
3. **提出**你打算如何容纳它（新 feature / 改动范围 / 新 milestone）。取得接受。
4. **在任何 implementer 恢复前传播到共享状态：** `plan.md`（范围/策略/边界）、`docs/` Library（耐久约定），以及——对变化了的可测试行为——`validation-contract.md`。**把 contract 的编辑委派给一个 subagent**；不要在流程中途手改 contract。语义：新断言 → 增加 + `fdd init-state`（播种为 `pending`）；移除 → 从 contract 删除、重跑 `init-state`（从 state 里去掉它）；改动到先前证据不再能证明它 → 它的断言在重新探测时复位为 `pending`。
5. **重新覆盖**——更新 `features.json` 让每条断言都被认领；`fdd contract-coverage` OK。
6. **恢复**循环。

范围收缩（「我们不再需要那个了」）：`fdd set-status <id> cancelled`（不要删除——保留历史），从 contract 移除该断言、重跑 `init-state`、丢掉成孤儿的 `fulfills`。断言没有「cancelled」状态；被丢弃的需求是直接移除的。

## When to return to the user

在以下情形交还控制权：需要人来动手（批准一笔购买、向第三方认证）；某个决策需要人来判断（安全、重大架构、商业取舍）；某个外部依赖不可恢复（别为你修不了的基础设施创建重试 feature）；一处发现的含糊从上下文无法解决；或工作远超商定的范围。说明阻塞点以及继续所需的东西。
