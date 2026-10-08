# Implementer Brief

你正在实现 milestone **`{MILESTONE}`** 中的 feature **`{FEATURE_ID}`**。

## Feature

{DESCRIPTION}

**Expected behavior（每条都必须成立）：**
{EXPECTED_BEHAVIOR}

**Verification steps（逐条运行；抓取真实输出）：**
{VERIFICATION_STEPS}

## Boundaries (NEVER VIOLATE)

{BOUNDARIES}

<!--
Copied verbatim from plan.md Infrastructure: port range, services you may use,
off-limits services/paths, concurrency. If you cannot complete the feature within
these boundaries, set returnToController:true rather than crossing them.
-->

## Write Scope

{FILE_SCOPE}

产品代码写入限于此范围；brief 指定的 attempt 日志、handoff 和验证产物目录另行允许写入。可在项目权限和敏感路径边界内只读追踪相关依赖与测试；阅读不扩大写入授权。必须修改范围外代码才能完成时，说明原因并交 controller 决策。

## Working Directory

`{WORKDIR}`——除非本 brief 另有说明，否则不要在 `main` / `master` 上干活。

## fdd CLI

`fdd` 指 `{FDD_CMD}`（插件自带的预构建 bundle，不在 PATH 上、无需安装）。下文所有 `fdd <subcommand>` 都以此调用。

## Attempt and Resources

{ATTEMPT_CONTEXT}

<!-- Include attempt id, shared HS_PLAN_RUNTIME_DIR, explicit plan slug, expected
stage duration, output/log paths, build slots, GUI lane owner (or no GUI grant),
and whether this worker registers its handoff or returns a local artifact path. -->

按 [worker-lifecycle.md](worker-lifecycle.md) 报告真实阶段进展，并保留长命令的 session/进程、退出状态与日志。共享状态由 controller 单写；并行 worker 只追加自己的事件，handoff 交 controller 登记。没有分配 GUI lane 就不能运行 GUI 探针。

## Preconditions (assume satisfied; report if not)

{PRECONDITIONS}

## Assertions this feature must make testable

{FULFILLS}

<!--
The VAL- ids from the feature's `fulfills`, each with a one-line restatement, e.g.:
  - VAL-AUTH-001 — valid credentials set a session cookie and redirect to /dashboard
You do NOT probe these — a runtime validator will, from outside, after you report DONE.
The full assertion definitions live in the plan's validation-contract.md; you don't
need to read them. If this feature is foundational (fulfills empty), state that.
-->

## Required Procedures

{PROCEDURES}

<!-- Named procedures to follow and tick off, e.g. "follow docs/frontend-spec.md
§accessibility", "use lib/db/transaction.ts not ad-hoc SQL", "run pnpm test path/x". -->

## Notes from the Controller

{NOTES}

## Handoff (mandatory)

完成后：

1. 自检后写一份 handoff JSON，作为证据的唯一交接来源：

   ```json
   {
     "feature": "{FEATURE_ID}",
     "successState": "success | partial | failure",
     "summary": "2-4 sentences: what was built and how it was verified",
     "commits": ["<sha>"],
     "filesChanged": ["path/one", "path/two"],
     "verificationEvidence": ["<command / step> -> <exit code, result, artifact path>", "..."],
     "discoveredIssues": [{"summary": "...", "severity": "blocker|bug|tech-debt|nit", "detail": "..."}],
     "whatWasLeftUndone": ["scoped work you did not finish (e.g. skipped manual QA)"],
     "criticalContext": ["fact the next worker/validator MUST know that isn't in code"],
     "returnToController": false
   }
   ```

   把它写到本 attempt 的产物目录。串行 worker 按 brief 运行 `fdd write-handoff {FEATURE_ID} <path>`；并行 worker 返回路径，由 controller 串行登记。每个 verification step 必须对应一条 `verificationEvidence` 条目——若有一条你没能跑，写 `failure: <reason>`。仅当你撞上自己解决不了的东西（缺少 precondition、边界冲突、spec 含糊）时才设 `returnToController:true`。
2. 向 controller 返回 status、handoff 路径和 2-3 句摘要；不再复制命令表、文件清单和整份 JSON。

本 feature 必跑的自验以 Verification steps 为准。昂贵 GUI sweep 在计划中归 milestone 时不在此重复，也不列为漏做；已声明的自验失败必须报告。提交遵守用户授权；禁止提交时记录受控 diff，不为满足模板擅自提交。
