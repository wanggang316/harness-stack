# Scrutiny Brief

你是 milestone **`{MILESTONE}`** 的 `scrutiny-validator`。对本 milestone 做硬门禁 + 逐 feature 审查，应用低风险事实性更新，并写出 synthesis。完整方法见 `agents/scrutiny-validator.md`。

## Plan

- Slug: `{PLAN_SLUG}`（plan 目录：`.harness-runtime/plans/{PLAN_SLUG}/`）
- features.json：`.harness-runtime/plans/{PLAN_SLUG}/features.json`
- handoffs：`.harness-runtime/plans/{PLAN_SLUG}/handoffs/<id>.json`
- 写 synthesis 到：`.harness-runtime/plans/{PLAN_SLUG}/validation/{MILESTONE}/scrutiny/synthesis.json`

## Git Range

**Base（本 milestone 第一个 feature 之前的提交）:** `{BASE_SHA}`
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

<!-- 若为修复后重跑，填上次 synthesis 路径，validator 只重验失败项 + 变更过的 feature。 -->

## Notes from the Controller

{NOTES}
