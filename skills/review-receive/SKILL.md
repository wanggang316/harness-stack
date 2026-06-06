---
name: review-receive
description: 以技术上的严谨而非表演式附和来处理 code review 反馈。当你（作者）收到来自 reviewer、人类或你自己早前 self-review 的 review findings 时使用。尤其当某条 finding 看起来含糊或技术上可疑时使用。
---

# Receive Code Review

## Overview

code review 需要的是技术评估，而非情绪表演。实现前先核实。假定前先发问。技术正确优先于社交舒适。

reviewer 的一条 finding 是对某一时刻 codebase 的一个论断。它可能对、部分对，或在本上下文里是错的。你的工作是评估每一条论断，而不是表演附和。

## When to Use

- reviewer（人类，或来自 `harness-stack:review-request` 的 subagent）返回 findings 之后，立即使用。
- 人类队友在 PR 上留下 comment 时。
- 某个工具（linter、安全扫描器、CI）标出你需要分诊的问题时。
- 第二天早上重读自己的改动、发现问题时——对自己也用同一套纪律。

## The Response Pattern

```
1. READ    — 先吸收整份报告再反应。不要逐条即时回应。
2. RESTATE — 用自己的话复述每条要求，或发问。
3. VERIFY  — 对照当前 codebase 核实该论断。
4. DECIDE  — 接受、附理由 push back，或请求澄清。
5. APPLY   — 一次实现一条；每条之后都测试。
```

各条目常常相互关联。一知半解会产出错误的局部实现，下一轮还得回头撤掉。

## No Performative Agreement

禁用回应——它们不提供任何信息，还掩盖了真正的技术决策：

- "You're absolutely right!"
- "Great catch!"
- "Excellent feedback!"
- "Thanks for catching that!"
- "Let me implement that now"——在核实之前。

首选回应——说清修复，或 push back：

- `Fixed — added null guard at task.ts:42.`
- `Fixed in tasks.ts:88-95; regression test in tasks.test.ts:120.`
- `Checked — endpoint unused, removing rather than "implementing properly" (YAGNI).`
- `Disagree — tests at auth.test.ts:55-72 cover this path; the current guard is intentional. Happy to add a comment.`

行动会说话。一份绿色的 diff 才是信号；客套是噪音。

## Verify Before Implementing

接受一条 finding 之前，检查：

1. 它**对这个 codebase** 是否技术上正确（而非对 reviewer 脑中那个通用 codebase 的设想）？
2. 修它会不会破坏现有功能或测试？
3. 当前实现之所以如此，是否有原因——历史遗留、兼容性、明确的先前决策？
4. reviewer 是否掌握完整上下文，还是基于对 diff 的片面阅读？

任一检查不过，就附技术理由 push back。引用代码（`file:line`）、测试或先前决策——不是观点。

## When to Push Back

- 建议会破坏现有功能。
- reviewer 缺乏完整上下文（没看到 spec / plan）。
- 违反 YAGNI（提议 codebase 实际并不使用的 feature）。
- 对这个技术栈、平台或目标版本而言技术上不正确。
- reviewer 无从知晓的历史遗留 / 兼容性原因。
- 与先前的架构决策冲突。

### How to push back

- 用技术推理，而非防御姿态。
- 引用具体处：`file:line`、测试名、commit SHA、design doc。
- 若涉及架构，升级给人类——别独自裁定。
- 若你无法轻易核实，就说出来：`Can't verify without <X>. Investigate, ask, or proceed?`

## YAGNI Check

当 reviewer 要你把某个未被使用的东西「implement properly」时：

```bash
grep -rn "functionName\|/endpoint/path" src/
```

- 若未使用：提议删除，而非扩充。
- 若已使用：好好实现。

当 codebase 并不需要时，别为了让 reviewer 满意而加 feature。

## Handle Unclear Feedback

若有任何条目不清楚：

> `Understand items 1, 2, 3, 6. Need clarification on 4 and 5 before implementing.`

停下。先什么都别实现。就不清楚的条目请求澄清。

## Implementation Order

1. 先澄清不清楚的条目。
2. 阻塞性问题（破坏构建、安全、数据丢失）。
3. 简单修复（typo、imports、重命名）。
4. 复杂修复（重构、逻辑改动）。
5. 逐条单独测试每个修复——未验证不批量。

## If You Pushed Back and Were Wrong

就事论事地说出来，然后继续。不长篇道歉，不辩解自己当初为何 push back。

> `You were right — checked x.ts:120 and the call does return nullable. Fixing now.`

## GitHub Thread Replies

回复 inline PR comment 时，在该 comment 线程里回复：

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies -f body='<reply>'
```

而非作为顶层 PR comment。线程内回复能把上下文留在该条 finding 旁。

## Examples

**表演式附和——反面案例**

> Reviewer: Remove the legacy LRU cache; it duplicates the new one in `cache.ts`.
>
> Author: You're absolutely right! Removing now...

既没核实论断，也没说清 diff 会长什么样。纯噪音。

**技术核实——正确**

> Reviewer: Remove the legacy LRU cache; it duplicates the new one in `cache.ts`.
>
> Author: Checked — `cache.ts:42` is per-request; `legacy-cache.ts:11` is process-wide and used by `worker.ts:88` and `scheduler.ts:24`. Not a duplicate. Want them consolidated, or keep both?

引用代码、点明分歧、提出一个精确的问题。

**YAGNI push back——正确**

> Reviewer: Implement proper metrics — persist to DB, support date filters, add CSV export.
>
> Author: Grepped `src/` — nothing calls `/metrics`. Proposing deletion (YAGNI). Reopen if there's usage I missed.

「好好实现」之前先 grep。代码未被使用时，删除就是有效的修复。

**含糊反馈——正确**

> reviewer 抛来六条 finding。作者理解 1、2、3、6，但不懂 4 和 5。
>
> Author: Understand 1, 2, 3, 6. Need clarification on 4 (which timeout?) and 5 (which call site?) before implementing — they look related.

不做局部实现。索要缺失的那块，并精确点明含糊之处。

**push back 了、但错了——正确**

> 早前一轮里，作者不同意某条 finding。
>
> Author: You were right — checked `tasks.ts:120` and the call does return nullable. Adding the guard.

就事论事地说明。不道歉、不辩解、不过度解释。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「reviewer 资深 / 视角新鲜，他们肯定对。」 | reviewer 看到的是 diff，不是完整 codebase。对照当前代码核实每条论断。 |
| 「说一句『great catch』是礼貌。」 | 表演式附和掩盖了你究竟有没有理解或核实。说清修复才是礼貌的形式。 |
| 「我把所有修复攒一起，最后测一次。」 | 不逐条验证就批量，会让一个坏掉的修复藏在绿色测试背后。一个修复，一次测试。 |
| 「第 4 条我没完全懂，但我先试点什么。」 | 一知半解会产出错误的局部修复，下一轮还得回头撤掉。先问。 |
| 「push back 感觉像对抗。」 | 技术正确 > 社交舒适。引用 `file:line`，然后继续。 |
| 「实现起来好像比核实快。」 | 错误的修复比正确的多耗几轮。核实才是捷径。 |
| 「reviewer 要我好好实现它。」 | 若代码未被使用，删除才是正确的修复（YAGNI）。别为了满足 reviewer 而扩充。 |

## Red Flags

- 以 "You're absolutely right!"（或任何感谢语）开头的回复。
- 修完 finding 不在每次修复后跑测试。
- 接受一个 YAGNI「好好实现」却不查代码是否被使用。
- push back 却不引用 `file:line` 或测试证据。
- 因「我觉得没关系」而忽视 Critical / Important finding。
- 只默默实现你看懂的条目，把不清楚的撇在一边。

## Verification

宣告本轮完成之前：

- [ ] 每条 Critical finding 已解决，或已附理由明确推翻。
- [ ] 每条 Important finding 已解决，或有可追踪的延后记录。
- [ ] 每个修复均单独测试过；无回归。
- [ ] 每条回复都引用了 `file:line` 或测试证据；没有不带引用的「fixed」。
- [ ] 若你 push back 后败下阵来，更正已就事论事地说明。
