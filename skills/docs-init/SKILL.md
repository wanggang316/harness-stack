---
name: docs-init
description: 对项目的文档结构与基础文档做一次性初始化。从 assets/ 的模板生成 docs/ 目录树、AGENTS.md、CLAUDE.md、README.md 以及基础文档。
---

# docs-init：文档脚手架

## Overview

一次性初始化：从 `assets/` 的模板生成标准文档 **Library** 布局与基础文档，并确保项目忽略 `.harness-runtime/` 这棵树（逐 plan 的 FDD 状态存放于此）。运行后，项目就具备了 `docs/` Library 树、占位模板以及基础文档（golden-rules）。属于其他领域的内容（architecture、design docs、changelog）由各自归属的技能创建；逐 plan 的状态（plan、contract、feature）永远不放在 `docs/` 里——它们存放在被 gitignore 的 `.harness-runtime/`。

## When to Use

- 项目没有 `docs/` 目录、没有 AGENTS.md，或者只有一个空壳 README
- 项目正在为 agent-first 开发做 bootstrap
- 文档布局不完整，需要补上标准骨架

**不用于重复运行。** 本技能负责初始化，不负责重新生成。若结构已存在，技能会报告当前现状并退出，不做任何改动。各文档后续的日常维护，发生在归属该文档的技能里。

## Scope

**本技能创建或填充（当缺失时）：**

| Target | Source in assets/ |
|---|---|
| `AGENTS.md` | `assets/AGENTS.md` |
| `CLAUDE.md` | symlink → `AGENTS.md` |
| `README.md` | `assets/README.md`（仅当不存在 README 时） |
| `docs/README.md` | `assets/docs/README.md` |
| `docs/golden-rules.md` | `assets/docs/golden-rules.md` |
| `docs/design-docs/{README,_template}.md` | `assets/docs/design-docs/` |
| `docs/references/README.md` | `assets/docs/references/README.md` |
| `docs/generated/README.md` | `assets/docs/generated/README.md` |
| `.gitignore` 条目 `.harness-runtime/` | 缺失时追加（见 Step 4b） |

**本技能不创建：**

- `docs/architecture.md` —— architecture 内容在别处定义
- `docs/design-docs/<doc>.md` —— 单个 design doc 在别处撰写
- `docs/user-test-patterns.md` —— 由 `harness-stack:fdd-validation-contract` 首次运行时 bootstrap
- `.harness-runtime/` 内容 —— 逐 plan 的状态由 `harness-stack:fdd` 与 `fdd` CLI 创建；它被 gitignore，不在脚手架范围内
- `CHANGELOG.md` —— changelog 在别处维护

## Process

### Step 1：盘点项目

读项目根目录，报告已有哪些内容。对 scope 表里的每个 target，记录三种状态之一：**缺失**、**已存在**、或**已存在但为空 / 仅占位**。

同时收集：
- 项目名称（从 `package.json`、`Cargo.toml`、`pyproject.toml`、`go.mod`，或目录名取得）
- build / test / lint / install 命令（从同样的来源取得，或检视已有脚本）
- 已有的 README 或 AGENTS.md 是否带有值得保留的内容

### Step 2：逐 target 决策

对 scope 表里的每个 target，按此判断：

| Current state | Action |
|---|---|
| 缺失 | 从 `assets/` 模板创建，替换占位符 |
| 已存在但为空 / 仅占位 | 提议覆盖；等待确认 |
| 已存在且有真实内容 | 不动；报告已保留 |

绝不覆盖带有真实内容的文件。若用户要求「初始化」一个已经有实质文档的项目，报告现状并建议做有针对性的编辑，而非整体重写。

### Step 3：替换占位符

`assets/` 里的模板用到这些占位符：

| Placeholder | Source |
|---|---|
| `{{PROJECT_NAME}}` | 检测到的项目名称 |
| `{{BUILD_COMMAND}}` | 检测到的 build 命令，未知时用 `<build command>` |
| `{{TEST_COMMAND}}` | 检测到的 test 命令，未知时用 `<test command>` |
| `{{LINT_COMMAND}}` | 检测到的 lint 命令，未知时用 `<lint command>` |
| `{{INSTALL_COMMAND}}` | 检测到的 install 命令，未知时用 `<install command>` |

若某条命令无法可靠检测，保留方括号占位符，并在验证报告中点明，让用户自行补上。

### Step 4：写入文件

把每个模板拷到目标路径并施加上面的替换。对 `CLAUDE.md`，创建一个指向 `AGENTS.md` 的 symlink。在不支持 symlink 的平台或文件系统上，退化为一行文件：`See [AGENTS.md](AGENTS.md).`

### Step 4b：忽略 runtime 树

确保项目的 `.gitignore` 含有 `.harness-runtime/`。这里是 fdd 存放逐 plan 状态（plan、contract、feature、handoff）的地方；它绝不能被提交。幂等：若该行已存在，什么都不做；若 `.gitignore` 缺失，创建它并写入该条目；否则在一行简短注释下追加。不要触碰任何其他 `.gitignore` 条目。

### Step 5：遇冲突时给建议

当某种情况阻碍了干净的初始化，停下来，把具体情形连同一小串可选项一并呈现。不要默默替用户做决定。典型情况：

| Situation | Suggestion |
|---|---|
| 已有 AGENTS.md 超过 150 行 | 报告行数；建议在替换前把细节移进 `docs/` |
| 已有 README.md 含真实内容 | 不覆盖；建议用户审定后做有针对性的编辑 |
| `docs/` 存在但布局非标准 | 列出偏离的目录；询问是规整还是保持原样 |
| 无法检测项目名称 | 列出已查过的来源；向用户索要名称 |
| 文件系统不支持 symlink | 退化为 CLAUDE.md 桩文件，并标注此退化 |
| architecture / product / design 内容已部分散落各处 | 报告位置；内容不动，并标注后续应由哪个归属技能来整合 |

### Step 6：验证并报告

写入后，打印一张表，覆盖 scope 表里的每个 target，状态取以下之一：**created**、**preserved**、**skipped (conflict)**、或 **needs attention**。把任何未解决的占位符一并列出，供用户填写。确认 `CLAUDE.md` 能解析到 `AGENTS.md`。

## Verification

- [ ] `AGENTS.md` 存在，且不超过 150 行
- [ ] `CLAUDE.md` 能解析到 `AGENTS.md`（symlink 或桩文件）
- [ ] `README.md` 存在（原已存在，或从模板创建）
- [ ] `docs/README.md` 与 `docs/golden-rules.md` 存在
- [ ] `docs/design-docs/` 含有 `README.md` 与 `_template.md`
- [ ] `docs/references/README.md` 与 `docs/generated/README.md` 存在
- [ ] `.gitignore` 含有 `.harness-runtime/`
- [ ] 每个占位符要么被替换，要么在报告中点明
- [ ] 没有任何带原有真实内容的文件被覆盖
