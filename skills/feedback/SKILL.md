---
name: feedback
description: 复盘一次 harness-stack 使用，把值得上报的摩擦、缺陷或建议提成 GitHub Issue 反馈给上游。在完成一项任务、用完某个 skill 后有意见或改进想法，或想为框架本身留下改进线索时使用。
---

# feedback：复盘并反馈

## Overview

harness-stack 靠 Self-Bootstrapping 改进自身——但只有当真实使用中的摩擦被记录下来、回流到上游，框架才会变好。本 skill 引导你在一段使用收尾后做一次结构化复盘，把其中值得上报的部分提成一条高质量 GitHub Issue，反馈给 harness-stack 仓库。它不替你制造反馈：没有值得上报的就如实收尾。

## When to Use

**Use when**：
- 刚用 harness-stack 跑完一项任务、一个 milestone，或用完某个 `harness-stack:*` skill，想回顾体验
- 在使用中撞到摩擦：某步骤含糊、文档与行为不符、某个 skill 走了弯路、缺少你需要的能力
- 你对某个 skill / command / 文档有具体的改进或新增建议

**Don't use when**：
- 是当前项目自身的 bug / 需求 → 提到当前项目仓库，而不是 harness-stack（见 Step 4 的仓库判定）
- 只是想用某个 skill 干活 → 直接调那个 skill
- 没有可上报的东西 → 不要为了交差硬造 Issue

## Process

### Step 1: Reflect（结构化复盘）

回到刚结束的这段使用，逐项自问，只记下有实质内容的条目：

- **用了什么**：哪些 `harness-stack:*` skill / command / agent 参与了？
- **哪里有摩擦**：哪一步卡住、返工、或让你犹豫？为什么？
- **哪里不符预期**：skill 的实际行为与它 SKILL.md 的说明 / 你的预期 是否有出入？
- **缺了什么**：你需要、但框架没有提供的能力、文档、或检查？
- **哪里顺**：哪个设计明显帮上忙、值得保留或推广？（正向信号同样值得记录）

把复盘结论用三五行讲清楚，作为下一步分诊的素材。

### Step 2: Triage（分诊：值不值得上报）

对每条复盘结论，判断类型与价值。只有 **可执行、对他人也成立** 的才进入下一步：

| 类型 | label | 判据 |
|---|---|---|
| **bug** | `bug` | 行为与 SKILL.md / 文档承诺不符，可复现 |
| **friction** | `dx` | 流程能跑通，但绕、慢、易错、反直觉 |
| **enhancement** | `enhancement` | 框架缺某能力 / 某 skill 该覆盖却没覆盖 |
| **docs** | `documentation` | 文档缺失、过时、或有歧义 |

排除项：仅本次会话相关的偶发、你自己的误用（除非误用暴露了文档歧义）、无法对他人复现的主观偏好。**没有任何一条够格 → 在此停下并如实告知用户**，不要硬凑。

### Step 3: De-dup（查重）

提之前先搜上游已有 Issue，避免重复：

```bash
gh issue list  --repo <target> --search "<关键词>" --state all --limit 10
gh search issues --repo <target> "<关键词>"
```

命中已有 Issue：在其下补充新证据 / +1，而不是另开一条；把链接给用户。无命中再继续。

### Step 4: Draft（起草 Issue）

**先定目标仓库 `<target>`——恒为 harness-stack 上游，绝不是当前项目。** 这是最容易错的一步：

- 权威值是 **`wanggang316/harness-stack`**。以安装的插件 `.claude-plugin/plugin.json` 的 `repository` 字段为准解析（它随插件分发，仓库改名也会同步）：
  ```bash
  # 从已安装插件的 plugin.json 解析，缺失则回退到上游常量
  target="$(gh repo view wanggang316/harness-stack --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo wanggang316/harness-stack)"
  ```
- **绝不**用当前工作目录的 `git remote origin`——本 skill 多在「安装了本插件的其它项目」里运行，那个 origin 指向用户自己的项目，会把反馈提错地方。
- 这是 **公开开源** 仓库：任何持 GitHub 账号的人都能开 Issue，**无需对仓库有写权限**，外部贡献者用 `gh issue create` 或网页同样可提交。

按模板起草（标题用类型前缀，正文锚定可复现的事实；与仓库 `.github/ISSUE_TEMPLATE/` 的 Issue Form 同构）：

```markdown
Title: [bug|friction|enhancement|docs] <一句话现象>

## Context
- Skill / command：harness-stack:<name>（或具体文档路径）
- Version：<plugin.json version，如 0.1.0>
- Environment：<OS / 关键工具版本，仅在相关时填>

## What happened
<客观经过；bug 给可复现步骤>

## Expected
<你期望的行为，及其依据——SKILL.md 哪句、哪条 golden rule>

## Impact
<它如何拖慢 / 误导使用；影响范围>

## Suggestion（可选）
<你设想的修法或方向，点到为止>
```

### Step 5: Confirm（提交前确认）

提 Issue 是**对外、公开**的动作。把起草好的标题、目标仓库、正文整体呈现给用户，**取得明确同意后再创建**。用户可能想改措辞、合并多条、或暂不提交——以用户决定为准。

### Step 6: File & report

按提交者的环境选路径——两条都落到同一套 `.github/ISSUE_TEMPLATE` 结构与 label，不会因人而异：

**A. 有 `gh` 且已登录**（`gh auth status` 通过）。经 `--body-file` 配合 here-doc 提交（**不要**在 `--body` 里塞 `\n`，见全局 git 约定）：

```bash
gh issue create --repo wanggang316/harness-stack \
  --title "[friction] fdd-planning 的 contract 段缺少 X 的示例" \
  --label dx \
  --body-file - <<'EOF'
## Context
...
EOF
```

或 `gh issue create --repo wanggang316/harness-stack --web` 打开浏览器，用 GitHub 的 Issue Form 选模板填写。

**B. 无 `gh` 或未登录**（外部用户常见）。不要替对方硬提，给一个可直接点击的预填入口，让他们在浏览器里提交：

- 模板选择页：`https://github.com/wanggang316/harness-stack/issues/new/choose`
- 把起草好的标题与正文一并交给用户粘贴。

创建成功后，把返回的 Issue URL 交给用户；若用户在 Step 5 选择不提交，则把草稿原样留给他，不强行创建。

## Common Rationalizations

| 借口 | 现实 |
|---|---|
| 「任务做完了，复盘可省。」 | 框架的改进只来自真实使用的回流。不记录，摩擦就永远在。 |
| 「这点小摩擦不值得提。」 | 反复出现的小摩擦正是 Issue 最该捕捉的；类型选 friction 即可。 |
| 「直接提到当前仓库就行。」 | 当前 origin 通常是用户自己的项目，不是 harness-stack。务必按 Step 4 解析上游仓库。 |
| 「我直接帮用户把 Issue 提了，省一步确认。」 | 提 Issue 是公开动作，且可能重复或措辞欠妥。先确认（Step 5），不可跳过。 |
| 「没找到问题，那就编一条凑数。」 | 噪声 Issue 比没有更糟。无可上报就如实收尾。 |

## Red Flags

- 跳过复盘，直接开提
- 没查重就新开 Issue
- 把 Issue 提到了当前工作项目而非 harness-stack 上游
- 未经用户确认就 `gh issue create`
- 正文没有可复现事实，只有主观情绪
- 为了「有产出」而制造低价值 Issue

## Verification

- [ ] 已做结构化复盘，沉淀出至少几行结论
- [ ] 每条上报项都完成分诊并选定 label
- [ ] 已对目标仓库查重
- [ ] 目标仓库确认为上游 `wanggang316/harness-stack`（非当前项目 origin）
- [ ] Issue 草稿含 Context / What happened / Expected，与 `.github/ISSUE_TEMPLATE` 同构
- [ ] 已按提交者环境选定路径（gh / 网页预填链接）
- [ ] 提交前已取得用户确认
- [ ] 提交后已把 Issue URL 交给用户（或按用户意愿留下草稿）
