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

## File Scope

{FILE_SCOPE}

你可以在此范围内 Read / Write / Edit。碰到范围之外的文件，意味着报告 `BLOCKED`（或 `returnToController:true`），而不是悄悄扩张。

## Working Directory

`{WORKDIR}`——除非本 brief 另有说明，否则不要在 `main` / `master` 上干活。

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

1. 产出标准的 implementer 报告（见 `agents/implementer.md` §"Report format"：已执行命令表、原子 commit 块、已覆盖的断言、procedures 清单）。
2. **另外**写一份 handoff JSON 并登记它：

   ```json
   {
     "feature": "{FEATURE_ID}",
     "successState": "success | partial | failure",
     "summary": "2-4 sentences: what was built and how it was verified",
     "commits": ["<sha>"],
     "filesChanged": ["path/one", "path/two"],
     "verificationEvidence": ["<step verbatim> -> <actual result>", "..."],
     "discoveredIssues": [{"summary": "...", "severity": "blocker|bug|tech-debt|nit", "detail": "..."}],
     "whatWasLeftUndone": ["scoped work you did not finish (e.g. skipped manual QA)"],
     "criticalContext": ["fact the next worker/validator MUST know that isn't in code"],
     "returnToController": false
   }
   ```

   把它写到一个文件，然后运行 `fdd write-handoff {FEATURE_ID} <path>`。每个 verification step 必须对应一条 `verificationEvidence` 条目——若有一条你没能跑，写 `failure: <reason>`。仅当你撞上自己解决不了的东西（缺少 precondition、边界冲突、spec 含糊）时才设 `returnToController:true`。
3. 向 controller 返回一段 2-3 句的 summary。
