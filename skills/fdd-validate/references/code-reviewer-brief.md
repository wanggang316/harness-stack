# Code Review Brief

对 **`{FEATURE_IDS_OR_SCOPE}`** 的相关累计 diff 做代码审查，覆盖各 feature 的行为、设计、测试质量与 scope/spec 合规，并检查集成交互。评审方法、severity 与 Output Format 全部见 `agents/code-reviewer.md`——本 brief 只提供输入。

## What Was Implemented

{DESCRIPTION}

## Feature / plan.md

{PLAN_PATH}

<!-- .harness-runtime/plans/<slug>/plan.md 的路径，供上下文。feature 的 expected
behavior 与它 fulfills 的 contract 断言是验收线。 -->

## Review Input

**Base:** `{BASE_SHA}`
**Head:** `{HEAD_SHA}`
**Working directory:** `{WORKDIR}`
**Uncommitted input (when applicable):** `{PATCH_AND_UNTRACKED_MANIFEST}`

<!-- When commits are not authorized, provide a snapshot of the full scoped diff
against BASE (staged + unstaged), content for scoped untracked files, and a digest
or immutable artifact reference. BASE..HEAD alone does not include this work.
Never stage or commit files merely to make them visible to the reviewer. -->

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
```

上面的 commit diff 仅覆盖已提交部分。有未提交输入时还必须审查提供的完整 patch 与未跟踪文件内容，报告覆盖的输入身份；输入不全返回 BLOCKED，不能把空 commit diff 当作无改动。

## Focus Areas

{FOCUS_AREAS}

## Notes from the Controller

{NOTES}

## 已有审查与覆盖

{PRIOR_REVIEW_EVIDENCE}

<!-- Include the contract version and scoped behavior/file coverage in the review report.
仅输入相同且未被后续变更影响的独立 early review 可复用；列出原报告 base/head、契约版本、覆盖范围和适用理由。缺证据则重新审查。milestone 始终检查集成交互，final 检查跨 milestone 影响。报告按同根因与修改范围组织 findings，区分本次缺陷与无关历史债务，不要求一条 finding 创建一个 feature。 -->

worker 生命周期遵循 `<plugin-root>/skills/fdd-execution/references/worker-lifecycle.md`。
