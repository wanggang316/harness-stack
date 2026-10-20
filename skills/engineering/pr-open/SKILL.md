---
name: pr-open
description: 把一个已提交的 feature branch 开成 pull request——检测 base、同步并推送、写出以图示和证据为核心的 PR body、用 gh 创建。在用户要求提 PR / 开 PR、或已有 PR 的 title 与 body 需要按当前 diff 重写时使用。不负责 commit、review 与合并。
metadata:
  credits:
    skill: show-me
    author: Dex Horthy
    organisation: Humanlayer
    url: "https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md"
---

# pr-open：开 PR

PR body 是写给一个没读过你会话的 reviewer 的：他要在一屏之内看懂**改了什么**（Summary）、**凭什么相信它能用**（Evidence）、**合进去有多危险**（Merge Danger）。本 skill 只负责把分支变成这样一个 PR。

用户要求开 PR，即授权推送**自己的** feature branch 并创建 PR。超出这个范围的动作（force-push 共享分支、改 base、拆分分支）先问。

## Step 1: Preflight

```bash
git status --short                                   # must be empty
git branch --show-current                            # must be a feature branch
git remote get-url origin && gh auth status          # remote and gh login must exist
gh pr list --head "$(git branch --show-current)" --state open --json number,url
```

`gh pr list` 在没有 PR 时输出 `[]` 并以 0 退出；非零退出是环境问题（网络、权限），不是「没有 PR」。

- 工作树不干净 → 停下，交给用户。
- 当前在 `main` / `master` / base 分支上 → 停下，PR 需要 feature branch。
- 没有 remote、`gh` 未登录，或 `gh pr list` 非零退出 → 停下报告，不要继续。
- 该分支已有 open 的 PR → 不重复创建；跳到 Step 4，最后用 `gh pr edit` 更新 title 与 body。
- commit subject 带 `WIP` / `fixup!`，或 commit 里有 `Co-Authored-By` / 模型署名 → 停下，先整理历史。

## Step 2: Detect base and sync

```bash
BASE=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)
git fetch origin "$BASE"
git log --oneline "HEAD..origin/$BASE" | head        # commits on base you don't have
git diff --stat "origin/$BASE...HEAD" | tail -1      # diff size
```

- 用户指定了别的目标（release 分支、`develop`）就用它；默认分支与团队实际目标看起来不一致时，问。
- base 已前进 → `git rebase "origin/$BASE"`。冲突在推送前解决；解不开就停下报告。
- 按 diff 规模决定：≤ ~800 行照常开；超过 ~800 行先向用户提议拆分（叠 PR、重构与 feature 分开）。整文件删除、lockfile、codemod 例外，在 body 里注明。

## Step 3: Push

按情况只跑一条：

```bash
BRANCH=$(git branch --show-current)

# Normal case: first push, or new commits on top of the remote branch
git push -u origin "$BRANCH"

# Only after Step 2 rebased a branch that you alone push to
git push --force-with-lease -u origin "$BRANCH"
```

推送被拒时，先分清原因：auth / 权限 / 分支保护 → 停下报告，不要绕过；远端有新提交 → 回到 Step 2 同步后再推。推送后用 `git status -sb` 确认分支与 `origin/$BRANCH` 同步。

## Step 4: Compose title and body

先读完整 diff（`git diff "origin/$BASE...HEAD"`，与 Step 2 用同一个范围）和 commit 列表，再写。仓库里有术语表（`CONTEXT.md`、`GLOSSARY.md` 之类）时用它的领域词汇。语言跟随仓库最近的 PR（`gh pr list --state merged --limit 5`），没有先例就用英文。

**Title**：conventional-commit 格式，祈使、独立成句，≤ 70 字符，例如 `feat(auth): add session refresh endpoint`。issue 编号放 body。

**Body**：

```markdown
## Summary

<one or two sentences: what changes and why, as an outcome>

<the smallest visual that makes the key point clear>

## Evidence

- **Before:** <failing test / output / screenshot>
  **After:** <passing test / output / screenshot>

## Merge Danger

**Door:** <one-way | two-way>

<only when not obvious: why>

**Blast Radius:** <one word>

<only when not obvious: who or what could break>

## Linked Issues

Closes #<n>
```

- **Summary**：一两句话说结果，再配**一个**最能说明问题的图示——伪代码、调用树、组件树、文件树、Mermaid，或这些形状的 `diff`。怎么选、各自的写法见 [references/summary-visuals.md](references/summary-visuals.md)。图示只保留回答「改了什么」所需的调用、文件、状态与边界。
- **Evidence**：只放你**实际运行**得到的东西。截图优先（改动是可视的且环境能截图时），其次是测试 / 命令输出——点名那条从失败变为通过的测试。没有可展示的证据时写明 `Not verified: <reason>`，不要编造。
  - Before 的来源，按优先级：本次会话里 TDD 时实际看到的 red 输出；否则在仓库外的临时 worktree 里，把新测试放到 base 上跑一次：

    ```bash
    wt="$(mktemp -d)/before"
    git worktree add --detach "$wt" "origin/$BASE"
    git -C "$wt" checkout "$BRANCH" -- <test-files>    # bring in only the new tests
    (cd "$wt" && <test-command>)                       # expect red
    git worktree remove --force "$wt"
    ```
- **Merge Danger**：two-way door 可以低成本回退（revert、翻 flag）；涉及数据迁移、破坏性操作、对外发布，或已被外部消费者依赖、发布后无法收回的公共 API 改动，是 one-way door。仓库内部能随 revert 一起回退的行为变化（包括返回值语义变化）仍是 two-way，但要在 Blast Radius 里写明谁会受影响。Blast Radius 用一个词概括影响面（`none`、`internal`、`consumers`、`data`、`layout`……），影响不显然时补一两句。
- **Linked Issues**：用 `Closes #n` / `Refs #n`；没有就删掉这一节。
- 不写开场白，不留占位符，不写空节。title、body 里不出现工具、模型或 agent 署名（`Co-Authored-By`、`Generated with ...`）。

## Step 5: Create or update

body 一律经 stdin 传入；`--body` 里的 `\n` 不会被展开。默认创建 ready-for-review 的 PR；仅当用户要求时加 `--draft`。

```bash
gh pr create --base "$BASE" --head "$BRANCH" --title "<title>" --body-file - <<'EOF'
<body>
EOF

# Existing PR from Step 1:
gh pr edit <number> --title "<title>" --body-file - <<'EOF'
<body>
EOF

gh pr view --json number,url,baseRefName,headRefName,isDraft
```

## Step 6: Report

把 PR 编号、URL、`base ← head`、draft / ready 状态交给用户。

## Verification

- [ ] 工作树干净，head 是 feature branch，且已与最新的 `origin/$BASE` 同步
- [ ] 没有为同一分支重复创建 PR
- [ ] title 是 ≤ 70 字符的 conventional-commit 格式
- [ ] body 含 Summary（含一个图示）/ Evidence / Merge Danger；Evidence 全部来自实际执行，或明确写了 `Not verified`
- [ ] title、body、commit 中没有工具、模型或 agent 署名
- [ ] 已把 `gh pr view` 确认过的 PR URL 交给用户
