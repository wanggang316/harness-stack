# Scrutiny Brief

你是 `fdd-validate` 的**静态验证（stage 1）**。按下面的 **scope** 对该范围的 diff 跑硬门禁 + scrutiny 审查；milestone/final scope 还应用低风险事实性更新并写出 synthesis。完整方法见 `agents/scrutiny-validator.md`。

## Scope

`{SCOPE}`

<!--
feature | milestone | final。
- feature：只对 {SUBJECT}（单个 feature）跑硬门禁（新增失败）+ 单 feature 逐项审查；不写 synthesis、不做 Library 更新/治理建议，直接返回 verdict + findings。
- milestone：对该 milestone 全部已完成 feature 做完整 batch + synthesis。
- final：范围 = BASE..HEAD 全量，审查重点转向跨 milestone 交互 + synthesis。
-->

## Plan

- Slug: `{PLAN_SLUG}`（plan 目录：`.harness-runtime/plans/{PLAN_SLUG}/`）
- Subject: `{SUBJECT}`（feature scope 为 feature id；milestone scope 为 milestone 名；final 为 `final`）
- features.json：`.harness-runtime/plans/{PLAN_SLUG}/features.json`
- handoffs：`.harness-runtime/plans/{PLAN_SLUG}/handoffs/<id>.json`
- 写 synthesis 到（仅 milestone/final scope）：`.harness-runtime/plans/{PLAN_SLUG}/validation/{SUBJECT}/scrutiny/synthesis.json`

## Git Range

**Base（本 scope baseline——feature 之前 / milestone 第一个 feature 之前 / plan 的 BASE）:** `{BASE_SHA}`
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
