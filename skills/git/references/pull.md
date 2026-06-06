# Pull Reference (merge-based update-branch)

把 `origin/main` merge 进当前分支的操作细节，适用于以下场景：项目策略偏好 merge commit 而非 rebase、分支与他人共享、或重写 history 会造成麻烦。

当项目保持线性 history 时改用 [sync.md](sync.md)。

## One-Time Setup

```bash
git config rerere.enabled true
git config rerere.autoupdate true
```

`rerere`（reuse recorded resolution）会记住某个 conflict 第一次是怎么解决的，并在它下次出现时重放该解法。对反复 merge `main` 的长命分支来说，这是一张免费的安全网。

## Conflict Style

全局或按仓库设一次：

```bash
git config merge.conflictstyle zdiff3
```

`zdiff3` 会在 conflict 块里显示 base + ours + theirs，并裁掉匹配的行——比默认的 2-way 风格容易看清意图得多。

## Workflow

1. 工作区干净（先 commit 或 stash）。
2. Fetch：

   ```bash
   git fetch origin
   ```

3. 先同步**远端 feature branch**——吸收 CI 或其它 agent 推上来的自动 commit：

   ```bash
   git pull --ff-only origin "$(git branch --show-current)"
   ```

4. Merge `origin/main`：

   ```bash
   git merge origin/main
   ```

5. 解决 conflict（见下文），然后 `git add <files>` + `git commit`（或 `git merge --continue`）。
6. 用项目门禁（lint、type、test）验证。

## Reading Conflicts

当某个 hunk 看不清时，降到文件级的意图 diff：

```bash
git diff :1:path/to/file :2:path/to/file   # base vs ours
git diff :1:path/to/file :3:path/to/file   # base vs theirs
```

`:1` = merge base，`:2` = ours（当前分支），`:3` = theirs（incoming）。这能把每一侧的意图单独呈现，而不是揉在一起的 hunk 视图。

### Resolution Order

1. **陈述两侧意图**——bug fix、refactor、rename、行为变更。
2. **先定下最终行为**——这段代码应该做什么？
3. **再据此打磨解法**以匹配那个决定。
4. 优先保留不变量、API contract、以及用户可见行为，除非 conflict 明确表示这是一次有意的改动。

### Generated Files

**先解源文件**，再重新生成。别手动 merge 生成产物：

```bash
# 1. Resolve handwritten source conflicts; commit them.
# 2. Re-run the generator (codegen, prisma, openapi, ...).
# 3. Stage the regenerated output.
```

### Import Conflicts

当两条分支都加了 import 且意图不清时：

1. 暂时两侧都接受（保留所有候选 import）。
2. 完成 merge。
3. 跑 lint / type check——未使用或重复的 import 会在那里干净地浮现。

### When Both Sides Are Wrong

conflict 标记不是一道单选题。有时正确的解法是两侧都没写出来的第三种。这很正常。

## When to Ask the User

默认：做出尽力而为的决定，在 merge commit 的 body 里记录理由，继续推进。

仅在以下情况发问：

- 正确性取决于无法从代码、测试或文档推断出的产品意图。
- conflict 跨越用户可见的 API、contract 或迁移，选错会破坏外部消费方。
- 两套互斥的设计技术价值相当，且没有本地信号可判。
- merge 引入数据丢失、schema 变更或不可逆的副作用，且没有明显的安全默认值。

## Verification

- [ ] 没有残留 conflict 标记（`git diff --check`）
- [ ] 生成文件是重新生成的，不是手动 merge 的
- [ ] merge 后 lint / type / test 通过
- [ ] merge commit 的 body 记下了任何不显然的解法决定
