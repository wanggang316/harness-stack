---
name: skill-create
description: 创建新的 harness-stack skill。在向框架新增 skill、扩展 lifecycle 覆盖范围，或构建自定义 skill 时使用。
---

# skill-create：创建新 skill

## Overview

创建新 harness-stack skill 的引导式工作流。生成包含所有必需小节的 SKILL.md，创建对应的 slash command，并校验结果。

## When to Use

**Use when**：
- 向 harness-stack 新增一个 skill
- 创建项目专属的自定义 skill
- 把 lifecycle 覆盖扩展到新领域

**Don't use when**：
- 修改一个已有的 skill（直接编辑 SKILL.md）
- 只需要一个一次性脚本（不是可复用的 skill）

## Skill vs Command（先定这个）

在动手前先判断你要造的是 **skill** 还是 **command**——别混。

- **Skill**（`skills/<name>/SKILL.md` + `references/`）= 一套**工作流 / 心法**：有多步流程、判断、反模式，深度内容放 `references/`。例如 `git`、`fdd`、`design`。
- **Command**（`commands/<name>.md`）= 一次**轻量、一次性操作**：低上下文、可直接当 slash 入口跑，不需要一整套方法论。例如 `commit`、`git-sync`、`pr-watch`。

经验法则：要写 `references/` 的就是 skill；一屏内能讲完、本质是「跑个操作」的就是 command。一个 skill 常常**配一两个 command 作为日常入口**（如 `git` 技能 + `/commit`、`/git-sync`）。

## Process

### Step 1: Gather Information

向用户询问：
1. **Name**：这个 skill 该叫什么？（裸名，不带前缀——以 `harness-stack:{name}` 寻址）
2. **Phase**：属于哪个 lifecycle 阶段？（define/plan/build/verify/review/ship/meta）
3. **Purpose**：这个 skill 做什么？（1-2 句话）
4. **Trigger**：什么时候应当使用这个 skill？

### Step 2: Determine Location

所有 skill 都直接放在 `skills/` 下；目录名即裸 skill 名（不带前缀）。`harness-stack` 这个 plugin 命名空间使其可以 `harness-stack:{name}` 的形式寻址：

```
skills/{name}/SKILL.md
```

### Step 3: Generate SKILL.md

创建 `skills/{name}/SKILL.md`：

```markdown
---
name: {name}
description: {purpose}. Use when {trigger}.
---

# {name}: {Title}

## Overview
{purpose}

## When to Use
**Use when**:
- {trigger conditions}

**Don't use when**:
- {exclusion conditions}

## Process
### Step 1: {first step}
{details}

### Step 2: {second step}
{details}

## Common Rationalizations
| Rationalization | Reality |
|---|---|
| "{excuse 1}" | {rebuttal 1} |
| "{excuse 2}" | {rebuttal 2} |

## Red Flags
- {violation 1}
- {violation 2}

## Verification
- [ ] {exit criterion 1}
- [ ] {exit criterion 2}
```

### Step 4: Create Slash Command

创建 `commands/{name}.md`：

```markdown
Load and execute the harness-stack:{name} skill.

Read the skill definition at skills/{name}/SKILL.md and follow its Process section step by step.

Context: {brief context about when this runs}
```

### Step 5: Update AGENTS.md

在 AGENTS.md 的对应小节里加入这个新 skill。
确认 AGENTS.md 仍保持在 150 行以内。

### Step 6: Validate

检查：
- SKILL.md 含所有必需小节
- YAML frontmatter 合法
- slash command 已存在
- AGENTS.md 已更新且在 150 行以内

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「我先随手写个不带全部小节的 SKILL.md。」 | 不完整的 skill 会被忽略。每个小节都有其用途。 |
| 「这个 skill 用不着 Common Rationalizations。」 | 每个 skill 都有 agent 用来跳过它的借口。再想深一点。 |
| 「我不需要 slash command。」 | command 是用户发现并调用 skill 的途径。永远要创建一个。 |
| 「AGENTS.md 我以后再更新。」 | 不在 AGENTS.md 里，对 agent 而言它就不存在。现在就更新。 |

## Red Flags

- SKILL.md 缺少必需小节
- 没有 Common Rationalizations 表格
- 没有创建 slash command
- AGENTS.md 未更新
- skill 名带了多余的 `hs-`/`harness-stack:` 前缀（目录名必须是裸 skill 名）

## Verification

- [ ] SKILL.md 已创建，含全部 6 个必需小节
- [ ] YAML frontmatter 含 name 与 description
- [ ] description 以动词开头并包含「Use when」
- [ ] Common Rationalizations 至少有 2 条
- [ ] slash command 已创建在 commands/ 下
- [ ] AGENTS.md 已更新（且仍在 150 行以内）
- [ ] 所有校验通过
