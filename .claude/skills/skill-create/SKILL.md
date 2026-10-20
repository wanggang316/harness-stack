---
name: skill-create
description: 在 harness-stack 仓库里新增、拆分或调整 skill 时使用——决定调用方式、落位与注册、按约定写作、并实测插件能加载它。只管 harness-stack 自身约定，不教通用的 skill 写作方法。
---

# skill-create：维护 harness-stack 的 skill

本 skill 是 harness-stack 仓库的**维护工具**，放在 `.claude/skills/`，不随插件分发。它只记录这个仓库特有、从环境里查不到的约定。通用写作方法另有出处，可用时直接引用，不在这里重复：

- 写作方法（context pointer、信息层级、completion criterion、剪枝）→ `mattpocock-skills:writing-for-agents`
- 需要跑 eval、对比基线、优化 description 触发率 → Anthropic 的 [`skill-creator`](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)

## Step 1: 判断要不要新建

为纠正 agent 的失败而加规则时，同一个失败至少出现两次再加；一次会话的经历不足以成为规则。用户明确要求的 skill 不受此限。

按顺序问，第一个「是」就停下：

1. 能用结构强制？按可靠程度选：架构或数据结构让错误无法发生 > 类型、lint、CI 检查（报错里写明修法）> 测试 > 脚本。→ 做成检查，不写成 skill 文字。只有需要判断、无法结构化的规则才继续往下。
2. 已有 skill 覆盖这个职责？→ 改那个 skill；只有部分场景需要的内容，加到它的 `references/` 并在 SKILL.md 里加一条指针。
3. 都不是 → 新建 skill。

## Step 2: 选调用方式

每个 skill 必须显式选择：

| 方式 | frontmatter | 选它的条件 | description 写法 |
|---|---|---|---|
| model-invoked | 省略 `disable-model-invocation` | agent 需要自主触发它，或别的 skill 要调它 | 面向模型：先写它是什么，再列**互不重复**的触发分支；不概括流程步骤 |
| user-invoked | `disable-model-invocation: true` | 只由人手动发起（例如 `to-github-issues`：一次性对外发布） | 面向人：一行说明它做什么 |

model-invoked 的 description 常驻每个会话的上下文，是插件对所有使用项目的永久开销。拿不准时选 user-invoked。

## Step 3: 落位与命名

- **目录**：`skills/<category>/<name>/`。现有分类：

  | category | 放什么 |
  |---|---|
  | `engineering` | 写代码、评审、交付的流程（tdd、review-*、pr-open、pr-land、changelog、to-github-issues、setup-harness-stack、domain-modeling、grill-with-docs、to-spec、document、audit-docs） |
  | `productivity` | 跨任务的工作方式（git、debate、decide） |
  | `ui` | UI / 设计系统 |

  `skills/feedback/` 直接放在 `skills/` 下，靠默认扫描加载。新 skill 一律放进分类目录。
- **注册**：插件默认只扫描 `skills/<name>/SKILL.md` 一层。每个分类目录必须出现在 `.claude-plugin/plugin.json` 的 `skills` 数组里，否则其下的 skill 不会加载。新增分类 = 同时改这个数组。
- **命名**：`name` 等于目录名，小写连字符，裸名——不带 `hs-` / `harness-stack:` 前缀，分类不进名字。最终以 `harness-stack:<name>` 寻址，所以全插件内必须唯一。
- **不要放进** `skills/deprecated/`：那里是已退役的 skill，不加载、不被引用。

## Step 4: 写 SKILL.md

**仓库约定**

- 正文用中文；代码、命令、标识符、frontmatter 的 key 用英文。与同分类的兄弟 skill 保持同一语气和格式。
- 引用或改编他人的 skill 时，将来源署名写入 frontmatter 的 `metadata.credits`，不在正文末尾追加 `Adapted from`。`credits` 包含 `skill`（原 skill 名）、`author`、`url`（原始 SKILL.md 链接，加引号），来源属于组织时再加 `organisation`。示例：

  ```yaml
  metadata:
    credits:
      skill: to-spec
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md"
  ```
- 结构跟着内容走，没有强制小节。流程型 skill 用编号步骤；分流型 skill（如 `changelog`）的 SKILL.md 只是一张路由表，细节放 `references/`。
- 只有部分分支用到的内容放进本 skill 的 `references/`，在 SKILL.md 里写明何时读它。确定性、会被反复重写的逻辑放 `scripts/`，写完就跑一遍。
- **原子性**：一个 skill 只负责一段单一、完整的职责。不写「之后交给 X」「先经 Y」；前提不满足时停下告诉用户。流程编排只写在 `AGENTS.md`。
- **自足**：去掉所有外部引用后 skill 仍能正常运行。必需的步骤（同步分支、推送、处理被拒）直接写进本 skill，一两句话或一条命令即可；引用其他 skill 只作可选的增强，用 `harness-stack:<name>`，且只引用仍在加载的 skill。本 skill 自己的 `references/`、`scripts/` 不算外部引用。
- 需要按项目保存配置或状态时，放在 `~/.harness-stack/<project>/`，不写进项目；新文件在 `references/state.md` 登记写入方与读取方。读状态的 skill 在状态缺失时按默认行为运行。
- 会产生对外副作用的步骤（发 Issue、推送、发布）在执行前取得用户明确同意，并写清停止条件。
- 不在其他任务进行中顺手改 skill：skill 改动单独提交、单独 PR，便于评审和评估。
- 「Common Rationalizations」「Red Flags」只在你**观察到**过 agent 真实绕开某一步时才写，并且写成目标行为，而不是只罗列禁令。没有观察到的失败模式，就不加这两节。
- 读者是执行 skill 的 agent，不是提需求的人。用命令句写它要做什么、写到哪里、何时停下；只有缺了理由会被误读的规则才补一句为什么。设计原则放进 `references/` 或 `AGENTS.md`，不要把需求方的原话或口号搬进 skill。
- 需要判断、无法结构化的规则放在显眼位置，并给一个失败示例。
- 写代码库里真实的符号、文件、命令名，不用同义词或描述代替；同一事物全文只用一个名字。
- 同一个事实只说一次：在第一次需要它的地方写清楚，之后用简称指代，不重复强调。
- 长度参照 mattpocock 的 skill：流程型 skill 的 SKILL.md 以 100 行以内为目标。超过时，先找出在教模型它本来就会做的事的句子。
- 每句话都过一遍：删掉它，agent 的行为会变吗？不会就删。从 `package.json`、`--help`、目录结构一查就有的事实不要抄进来。

## Step 5: 登记

- `AGENTS.md` 的 Quick Navigation：在对应阶段加一行 `/harness-stack:<name> - <一句话>`。
- `references/getting-started.md` 的 Lifecycle Skills 表：加一行，链接用相对路径 `../skills/<category>/<name>/SKILL.md`。
- 新增或删除 skill 时，同步修改仓库里所有引用它的地方（见 Step 6 的扫描）。

## Step 6: 验证加载与引用

在仓库根目录执行，全部通过才算完成：

```bash
# 1. Manifest is valid
claude plugin validate .

# 2. The skill actually loads. Run from a scratch dir so project files do not interfere.
#    A user-invoked skill is hidden from the model, so probe a temp copy with the flag stripped.
probe="$(mktemp -d)"
cp -R .claude-plugin skills commands agents "$probe"/
find "$probe/skills" -name SKILL.md -exec sed -i '' '/^disable-model-invocation: true$/d' {} +
(cd "$(mktemp -d)" && claude --plugin-dir "$probe" --model haiku \
  -p "List every skill name in your available-skills list that starts with 'harness-stack:'. Output only the names." </dev/null)
rm -rf "$probe"

# 3. No stale references to moved, renamed, or retired skills
grep -rnE "harness-stack:<old-or-new-name>|skills/<old-path>" -I . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=deprecated
```

第 2 步的输出必须包含 `harness-stack:<name>`。`sed -i ''` 是 macOS 写法；Linux 上用 `sed -i`。

**复杂或有对外副作用的 skill**：再做一次前向测试。派一个全新上下文的 subagent，只给它一个真实的用户请求和这个 skill 的路径，不给预期答案或你怀疑的问题；让它在仓库外的临时目录里工作，对外副作用一律停在确认步骤之前。只根据观察到的行为修改 skill。

**改变已有 skill 的行为时**：按 [references/blind-comparison.md](references/blind-comparison.md) 做新旧版本盲测对比。

## Verification

- [ ] Step 1 的决定有理由：不能用结构强制，也没有和已有 skill 重叠
- [ ] 调用方式已显式选择；model-invoked 的 description 只含互不重复的触发分支
- [ ] 目录在 `skills/<category>/<name>/`，`name` 等于目录名，所在分类在 `plugin.json` 的 `skills` 数组里
- [ ] `references/` 中的每个文件都在 SKILL.md 中有指针
- [ ] 原子且自足：不预设前后衔接的 skill；删掉所有指向其他 skill 的引用后，流程仍能走完
- [ ] `AGENTS.md` 与 `references/getting-started.md` 已登记
- [ ] 改变已有 skill 行为时，盲测对比显示新版更好
- [ ] `claude plugin validate .` 通过，加载探测的输出里有 `harness-stack:<name>`，引用扫描没有命中
