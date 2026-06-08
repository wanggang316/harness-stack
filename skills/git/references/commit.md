# Commit Reference

规范 commit 的完整规则。

## Conventional Format

```
<type>: <short imperative description>

<optional body — explain why, not what>
```

**Types：** `feat`、`fix`、`refactor`、`perf`、`test`、`docs`、`style`、`chore`。

**Subject：**

- ≤ 72 个字符
- 祈使语气（`Add validation`，不是 `Added` / `Adding`）
- 结尾不加句号
- 自洽——在 `git log --oneline` 里不看 body 也能讲得通

**Body（当意图无法从 diff 一眼看出时）：**

- 在 72 字符处换行
- 说清为什么、做了哪些决定、有哪些取舍
- 在相关处链接 bug 编号、benchmark 结果、design doc
- 承认已知的不足

## Examples

```
# Good — explains intent
feat: add email validation to registration endpoint

Prevents invalid email formats from reaching the database.
Uses Zod schema at the route handler level, consistent with
existing validation patterns in auth.ts.

# Bad — describes what the diff already shows
update auth.ts
```

## Anti-Patterns

| 别这样 | 为什么 |
|---|---|
| `fix bug`、`update X`、`misc` | 离开写下它的那一刻就活不下去。 |
| `Phase 1`、`WIP`、`Slice 2` | planning 引用会腐烂；描述改动本身。见下文。 |
| `Moving code from A to B` | diff 已经显示了这次搬移；解释为什么搬。 |
| `Add convenience functions` | 含糊——把这个「便利」具体说出来。 |

## Don't Reference Ephemeral Planning Artifacts

planning 编号——`Phase 1`、`Slice 2`、`Q3-Q5`、`D-12`、`Task #007`、「per the plan」、「见上面的 design doc」——只在一次对话或一份进行中的 planning 文档范围内有意义（plan slug 存在 gitignore 掉的运行时状态里）。对下个季度读 `git log` 的人来说它们什么都不是，而且它们指向的产物可能已被改名、搬走、或根本没合进来。

用自洽的措辞描述这次 commit *做了什么*：

```
# Bad
feat: complete Slice 3 of task creation
fix: address review item D-12
chore: finish Q2 cleanup checklist

# Good
feat: validate task creation input at the route handler
fix: reject empty task titles before persisting
chore: remove unused legacy session helpers
```

subject 和 body 都适用。如果某个追踪 ID 是持久且有用的（一个会比分支活得久的 bug tracker 工单、一个留在仓库里的 RFC 编号），提一下没问题——但绝不能拿它当整条描述。

## Describe the Change, Not the Discussion

body 解释的是**交付的改动**，不是产生它的那场讨论。略去：

- 考虑过又被否掉的备选方案（「我们也看过 X，但是……」）
- 选项对比（「方案 A vs 方案 B」）
- 该放进 design doc 或 PR 描述里的对话式推理
- 谁提了什么、早先草稿做过什么的复盘

留下能帮未来读者读懂 diff 的内容：改动做了什么、为什么*这样*做、任何在代码里看不出来的约束或不变量。若存在更长的理由，它属于 PR 描述（PR 会链接到 commit），不属于 commit 消息。

```
# Bad
fix: validate emails

We considered three approaches: regex in the handler, Zod schema, and a
third-party library. Regex was rejected for edge cases; the third-party
library adds 100KB. Zod is consistent with auth.ts. Going with Zod.

# Good
fix: validate registration emails with the existing Zod schema

Matches the validation pattern used by auth.ts, keeping schema
definitions in one place.
```

「Good」示例仍然给了一个理由——这跟复盘讨论不是一回事。陈述理由，别叙述那场推敲。

## No Attribution Lines

绝不追加 `Co-Authored-By:` trailer、`Generated with ...` 横幅、或任何模型 / 工具标识。作者归属在 git 的 `Author` / `Committer` 字段里；body 描述的是改动，不是工具。若工具注入了这类行，把它们删掉。

## Atomic — Splitting Strategies

若工作区 diff 混入了不相关的关注点，提交前先拆。

| 策略 | 怎么做 | 何时用 |
|---|---|---|
| **Stack** | 提交一个小改动，下一个基于它 | 顺序依赖 |
| **By file group** | 给需要不同审阅者的分组分别提交 | 横切关注点 |
| **Horizontal** | 共享代码 / stub 先行，消费方在后 | 分层架构 |
| **Vertical** | 把 feature 切成更小的全栈切片 | feature 工作 |

实际拆分：

```bash
git restore --staged .
git add src/lib/validation.ts
git commit -m "refactor: extract validation utility"

git add src/routes/tasks.ts
git commit -m "feat: validate task creation input"
```

## Size Thresholds

| Diff 规模 | 处理 |
|---|---|
| ≤ ~100 行 | 好。一坐下就能审完。 |
| ~100–300 行 | 单个带测试的逻辑改动可以接受。 |
| ~300–800 行 | 在 body 里给出理由；若跨越多个关注点就拆。 |
| > ~1000 行 | 太大了。拆开。 |

例外：完整删除、自动化 codemod、lockfile 更新——这些情况下审阅者核对的是意图，不是逐行。把这些情况明确点出来。

## Pre-Commit Hygiene

```bash
# Inspect what's about to commit
git diff --staged

# Secret scan
git diff --staged | grep -iE "password|secret|api_key|token|BEGIN [A-Z]+ PRIVATE KEY"

# Project gates
npx tsc --noEmit
npm run lint
npm test
```

在项目支持的地方用 `husky` + `lint-staged` 自动化。

## Stray File Sanity Check

`git add` 之后、commit 之前，扫一遍新纳入跟踪的文件，查意外混入：

- 构建产物（`dist/`、`.next/`、`build/`）
- 日志（`*.log`、`npm-debug.log`）
- 编辑器残留（`.DS_Store`、`*.swp`、`Thumbs.db`）
- 环境文件（`.env`、`.env.local`）
- 仓库平时不跟踪的大二进制文件

若某个看起来是意外混入，`git restore --staged <path>`，并在合适处把该模式加进 `.gitignore`。

## Message Formatting

对内容不简单的 body，用 here-doc 写消息并以 `-F` 提交，而不是用带字面 `\n` 的 `-m`：

```bash
git commit -F - <<'EOF'
feat: add email validation to registration endpoint

Prevents invalid email formats from reaching the database.
EOF
```

`git commit -m "...\n..."` 在许多 shell 里会产出一条单行消息。别用它。

## Failure Handling

- pre-commit hook 失败 → 修掉底层问题，再创建一个**新的** commit。绝不用 `--amend` 来掩盖 hook 失败。
- 别用 `--no-verify` 绕过 hook，除非用户明确要求。
- 敏感文件已经被提交 → 别用 `--force` 把它抹掉。停下来问；无论如何可能都需要轮换密钥。

## Verification

- [ ] 单个逻辑改动
- [ ] conventional type、祈使 subject、≤ 72 字符
- [ ] body 解释了为什么（当内容不简单时）
- [ ] subject 和 body 里都没有 planning / task / milestone 编号
- [ ] body 描述的是改动，不是产生它的讨论
- [ ] staged diff 里没有密钥
- [ ] 没有署名 trailer
- [ ] 没有误入的产物被 stage
