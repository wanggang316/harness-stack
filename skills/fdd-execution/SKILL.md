---
name: fdd-execution
description: FDD 的 Phase 4——执行循环。串行驱动 feature 构建：next-feature → 派 implementer → handoff 决策树 → per-feature code-review → 运行时探测 → complete；在 milestone 边界与收尾把 gate 交给 harness-stack:fdd-validate。由 harness-stack:fdd 在 features.json 通过 coverage 后调用。
---

# fdd-execution：FDD 执行循环

最长的 phase。你驱动一个串行循环：一次一个 feature 过它的 per-feature 闸，在 milestone 边界与全部做完时把更重的 gate 交给 `harness-stack:fdd-validate`。

```
loop:
  f = hs-plan next-feature           # first pending; empty => done
  sanity-check preconditions
  hs-plan set-status f in_progress
  dispatch implementer  -> handoff (hs-plan handoff f)
  run handoff decision tree (references/handoff-handling.md)
  code-review gate    -> loop back to implementer until Approve / Approve-with-fixes (no Critical)
  if f.fulfills non-empty: user-test probe over f.fulfills -> loop back on FAIL
  hs-plan set-status f completed
  if milestone's impl features all completed/cancelled and not sealed:
     -> harness-stack:fdd-validate (milestone gate) -> hs-plan seal-milestone <m>
when loop empty:
  -> harness-stack:fdd-validate (final integration) -> hs-plan gate
```

**执行是串行的。** 一次一个 feature。一个 phase 内部的只读并行（并行研究、并行评审互不相关的文件）没问题；并发的 implementer 不行——它们会践踏共享状态、做出互相矛盾的决策。

**controller 绝不写代码、绝不为修一处发现而去编辑实现。** 每一处修复都回到 implementer。controller 一旦编辑代码，全新上下文不变量就没了。

## Before the loop (once)

```bash
hs-plan contract-coverage     # MUST report 'coverage OK'
hs-plan list-features         # eyeball ordering
git status                    # working tree clean
```

## Per-feature loop

### 1. Next feature
```bash
hs-plan next-feature          # -> <id>\t<agent>\t<milestone>  (empty => 交给 fdd-validate 做 final)
```

### 2. Sanity check
feature 的 `preconditions` 满足了吗？（若其中一条说「schema X 存在」，确认它确实存在。）工作树干净吗？若某个 precondition 未满足，在它前面创建/重排一个基础性 feature，或者若它已无意义就 `hs-plan set-status <id> cancelled`。

### 3. Dispatch the implementer
```bash
hs-plan set-status <id> in_progress
```
然后用 `references/implementer-brief.md` 的 brief 发 `Task(subagent_type="implementer", …)`。填入 feature 的各字段、**Boundaries** 块（来自 `plan.md` 的 Infrastructure）、以及文件范围。implementer 只读 brief——**不要**把 plan 或 contract 内联进去。brief 指示 implementer 以写一份 handoff JSON 并执行 `hs-plan write-handoff <id> <path>` 收尾。

### 4. Handle the handoff
```bash
hs-plan handoff <id>
```
跑 `references/handoff-handling.md` 里的决策树。它会路由 `returnToController` / `failure` / `partial` / `success`，追踪 `discoveredIssues` / `whatWasLeftUndone`，并传播 `criticalContext`。一个 feature 只有在 `success` 经核验后才推进到下面的各道闸。

### 5. Code-review gate
用 `references/code-reviewer-brief.md` 发 `Task(subagent_type="code-reviewer", …)`，对该 feature 的 diff 做 per-feature 静态评审（质量 + scope/spec 合规）。Approve 或 Approve-with-fixes（无 Critical）→ 继续。存在 Critical / Request changes → 重新派发 implementer；循环。（独立的硬门禁 test/lint/type-check 在 milestone 边界由 `fdd-validate` 的 scrutiny-validator 统一跑。）

### 6. Runtime probe (completing features only)
若 feature 的 `fulfills` 非空，对恰好那些 `VAL-` id 以及该 feature 的 diff 区间调用 `harness-stack:user-test`。validator 探测运行中的系统，**由 controller 回写结果**——按返回的矩阵执行 `hs-plan set-assertion <VAL-id> <status> [evidence]`。任何 FAIL → 带上失败断言的证据重新派发 implementer；循环。基础性 feature（`fulfills: []`）跳过这道闸。

### 7. Complete
```bash
hs-plan set-status <id> completed     # moves it to the bottom
```
更新 `plan.md` 的 Progress（追加一行 handoff-log）。回到 step 1。

## Milestone & final gates

当一个 milestone 里每个实现型 feature 都 `completed`/`cancelled` 且尚未封存（`hs-plan is-sealed <m>` → `no`）时，把它交给 **`harness-stack:fdd-validate`**（scrutiny-validator 硬门禁 + scrutiny、条件 security-auditor、user-test、应用治理反馈、seal）。当循环跑空、所有 milestone 已封存时，再交给 `fdd-validate` 做最终集成评审与 `hs-plan gate`。完整流程见该技能。

## Round budget

**每个 feature 3 轮。** 3 轮 implementer 之后仍 `BLOCKED`、或 code-review 仍有 Critical → 停下并上交给人。问题出在 plan、contract、或 feature 范围上；再加轮次只会稀释信号。绝不在相同条件下重新派发一个 `BLOCKED` feature——换上下文、换模型，或拆了它。

## Commit discipline

implementer 为每个 feature 创建自己的原子 commit（conventional-commit 格式）。**controller** 只 commit 自己的 artifact/Library 更新（plan.md、contract、docs/ Library）——而且 plan 目录已 gitignore，所以 controller 的「commit」大多只是耐久的 docs/ 更新。若一个 implementer 返回 `success` 却留下一棵未提交的脏树，停下：当作 `partial` 处理，并修正 implementer brief。

## Handling mid-flow user requests

当用户在流程中途要求一处改动时：

1. **暂停**——不要立刻拆解。
2. **澄清 + 调查**——`AskUserQuestion` + 只读 `investigator`（若涉及新技术再加在线调研）。迭代到清晰为止。
3. **提出**你打算如何容纳它（新 feature / 改动范围 / 新 milestone）。取得接受。
4. **在任何 implementer 恢复前传播到共享状态：** `plan.md`（范围/策略/边界）、`docs/` Library（耐久约定），以及——对变化了的可测试行为——`validation-contract.md`。**把 contract 的编辑委派给一个 subagent**；不要在流程中途手改 contract。语义：新断言 → 增加 + `hs-plan init-state`（播种为 `pending`）；移除 → 从 contract 删除、重跑 `init-state`（从 state 里去掉它）；改动到先前证据不再能证明它 → 它的断言在重新探测时复位为 `pending`。
5. **重新覆盖**——更新 `features.json` 让每条断言都被认领；`hs-plan contract-coverage` OK。
6. **恢复**循环。

范围收缩（「我们不再需要那个了」）：`hs-plan set-status <id> cancelled`（不要删除——保留历史），从 contract 移除该断言、重跑 `init-state`、丢掉成孤儿的 `fulfills`。断言没有「cancelled」状态；被丢弃的需求是直接移除的。

## When to return to the user

在以下情形交还控制权：需要人来动手（批准一笔购买、向第三方认证）；某个决策需要人来判断（安全、重大架构、商业取舍）；某个外部依赖不可恢复（别为你修不了的基础设施创建重试 feature）；一处发现的含糊从上下文无法解决；或工作远超商定的范围。说明阻塞点以及继续所需的东西。
