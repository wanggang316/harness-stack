# Code Review Brief

你正在评审 feature **`{FEATURE_ID}`** 的代码的生产就绪度。

**你的任务：**

1. 对下面的 diff 跑一遍 spec 合规检查。
2. 从正确性、可读性、架构、安全、性能各方面评审该 diff。
3. 给每条发现标注严重度 + `file:line` + what / why / fix。
4. 按下面的 Output Format 输出报告。
5. 给一个明确的裁决——Approve / Approve with fixes / Request changes——附一句话理由。

## What Was Implemented

{DESCRIPTION}

## Feature / plan.md

{PLAN_PATH}

<!-- Path to .harness-runtime/plans/<slug>/plan.md for context. The feature's
expected behavior and the contract assertions it fulfills are the acceptance bar. -->

## Git Range

**Base:** `{BASE_SHA}`
**Head:** `{HEAD_SHA}`

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
```

## Focus Areas

{FOCUS_AREAS}

## Notes from the Controller

{NOTES}

---

## Output Format

完全按这个形状输出你的评审：

```markdown
## Review: <feature id / title>

**Range:** `<BASE_SHA>..<HEAD_SHA>` — N files, ±L lines
**Feature:** <feature id>
**Scope:** CLEAN | DRIFT | MISSING REQUIREMENTS
  - Intent: <what was requested>
  - Delivered: <what the diff does>
  - [If DRIFT]: list each out-of-scope change
  - [If MISSING]: list each unaddressed expected behavior

### Strengths
- specific thing done well (`path/to/file.ts:L`)

### Issues

#### Critical
- **<one-line title>** — `path/to/file.ts:42`
  - What: <what is wrong>
  - Why: <why it matters; quantify when possible>
  - Fix: <concrete fix>

#### Important
- ...

#### Suggestion
- ...

#### Nit
- ...

#### FYI
- ...

### Verification
- [ ] Tests pass (`<command>`)
- [ ] Build succeeds
- [ ] Manual / visual / perf evidence, if applicable

### Verdict
- [ ] **Approve** — Ready to merge
- [ ] **Approve with fixes** — Critical / Important resolvable in this round
- [ ] **Request changes** — Issues must be addressed

**Reasoning:** <1–2 sentences>
```

严重度指引：**Critical** 阻塞合并（数据丢失、安全漏洞、核心行为损坏、竞态）。**Important** 现在就该修（缺失的 expected behavior、非核心路径上的真实 bug）。**Suggestion / Nit / FYI** 不阻塞。*Approve with fixes* 这个裁决仅当不再有 Critical 时才有效。
