# Scrutiny Brief

你是 `fdd-validate` 的**静态验证（stage 1）**。按下面的 **scope** 对该范围的 diff 跑独立工具硬门禁 + 交接证据完整性检查，写出 synthesis；语义审查交给 code-reviewer。完整方法见 `agents/scrutiny-validator.md`。

## Scope

`{SCOPE}`

<!--
milestone | final。
- milestone：对该 milestone 全部已完成 feature 做完整 batch + synthesis。
- final：范围 = BASE..HEAD 全量，检查范围覆盖所有 milestone + synthesis。
-->

## Plan

- Slug: `{PLAN_SLUG}`（plan 目录：`.harness-runtime/plans/{PLAN_SLUG}/`）
- Subject: `{SUBJECT}`（milestone scope 为 milestone 名；final 为 `final`）
- fdd CLI: `{FDD_CMD}`（`fdd <subcommand>` 均以此调用；不在 PATH 上）
- features.json：`.harness-runtime/plans/{PLAN_SLUG}/features.json`
- handoffs：`.harness-runtime/plans/{PLAN_SLUG}/handoffs/<id>.json`
- 写 synthesis 到：`.harness-runtime/plans/{PLAN_SLUG}/validation/{SUBJECT}/scrutiny/synthesis.json`

## Git Range

**Base（本 scope baseline——milestone 第一个 feature 之前 / plan 的 BASE）:** `{BASE_SHA}`
**Head:** `{HEAD_SHA}`

```bash
git log --oneline {BASE_SHA}..{HEAD_SHA}
```

## Checks to run (hard gate)

{CHECK_COMMANDS}

<!--
从 plan.md 的 Testing strategy + 项目清单填入实际命令，例如：
  - test:       pnpm test
  - type-check: pnpm tsc --noEmit
  - lint:       pnpm lint
  - build:      pnpm build   (若有)
只列项目实际定义的；某项不存在就让 validator 标 n/a。基线 = {BASE_SHA}，只为新增失败负责。
-->

## Rerun (optional)

{PRIOR_SYNTHESIS}

<!-- 若为修复后重跑，填上次 synthesis 路径，controller 指明失败项、受影响检查及旧证据仍适用的理由；影响不明则扩大检查。 -->

## Notes from the Controller

{NOTES}

## 输入身份与资源

{INPUT_EVIDENCE_AND_RESOURCES}

<!-- 填写契约版本、未提交 patch 身份、依赖/配置/环境记录、可靠 baseline 证据（或隔离 worktree 方案）、构建并发上限、worker 生命周期记录与输出路径。遵循 skills/fdd-execution/references/worker-lifecycle.md。 -->
