---
name: pr
description: 打开一个 pull request 并把它推进到干净合并。当 commit 已干净、代码可供 review 时使用——open（检测 base、同步推送、撰写结构化 PR body、gh 创建）然后 land（盯 CI、处理 review 反馈、解决冲突，全绿时 squash-merge）。在 PR 合并或真正受阻之前不要交还控制权。不涉及 commit、code review 与发布事务。
---

# Pull Request

你是作者。分支已提交、工作可供 review。本技能走完一个 PR 的两段人生：**open** 把分支变成结构化的 pull request，**land** 把它盯到干净合并。本文件是索引；操作细节在 `references/`。

**核心原则：** PR 是一次 review 请求，不是工作的倾倒——title、body、diff 各自独立成章，reviewer 不读你的会话也应能理解这次改动。开了之后，agent 的职责是**坚持到底**：只要还有可处理的工作（待修的 CI 失败、待回的 comment、待解的冲突），就不交还控制权；仅当 PR 已合并、或某事真正卡住并需要人类决策时才停。

## When to Use

- 分支有干净的原子 commit，本地全套检查（测试、lint、类型检查）已通过。
- 改动已可供 review：没有调试打印、没有半成品切片、没有无关编辑。
- 你有一个目标 base branch（通常是 `main`），且目标是「把它合掉」。

## When NOT to Use

- 还不可 review 的在制品——继续迭代。
- 混入无关改动的 diff——先拆到各自的分支。
- 带 `WIP`、`fixup!` 或 `Phase N` 式 commit message 的分支——先理清历史。
- 只想对一个已打开的 PR 做一次性检查、不进持续循环——改用 `/harness-stack:pr-watch`。

## References

按顺序进行：先 open，再 land。

| 阶段 | 参考 | 做什么 |
|---|---|---|
| Open | [references/open.md](references/open.md) | 检测 base、同步并推送、撰写 title/body、`gh` 创建 PR |
| Land | [references/land.md](references/land.md) | 盯 CI / review / head 漂移，处理反馈与冲突，全绿时 squash-merge |
