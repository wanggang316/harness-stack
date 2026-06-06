# Scrutiny Brief

你要对 **`{FEATURE_ID}`** 这段工作机械地跑项目的自动化检查，并返回结构化的 pass/fail。方法见 `agents/scrutiny-validator.md`。

## Working Directory

`{WORKDIR}`

## Git Range

**Base:** `{BASE_SHA}`
**Head:** `{HEAD_SHA}`

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
```

## Checks to run

{CHECK_COMMANDS}

<!--
从 plan.md 的 Testing strategy + 项目清单（package.json scripts / Cargo.toml /
pyproject.toml / Makefile）填入实际命令。例如：

  - tests:      pnpm test
  - lint:       pnpm lint
  - type-check: pnpm tsc --noEmit
  - build:      pnpm build   (若有独立 build 步骤)

只列项目实际定义的检查；某项不存在就不列，validator 会在报告里标 n/a。
里程碑闸 / 最终集成评审时，用全量 BASE..HEAD 区间跑全套。
-->

## Notes from the Controller

{NOTES}
