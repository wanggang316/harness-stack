# Sync Reference (rebase + push)

让 feature branch 与其 upstream 保持同步并把结果发布出去的完整规则。

这是 **rebase 路线**——保持线性 history。当项目策略强制要求 merge commit、分支与他人共享、或重写 history 会造成麻烦时，改用 [pull.md](pull.md)。

## Pre-Flight

1. **工作区干净。** 若 `git status` 显示有未提交改动，停下——先 commit（见 [commit.md](commit.md)）或 stash。不要自动 stash，不要丢弃。
2. **upstream 存在。** 若 `git rev-parse --abbrev-ref --symbolic-full-name @{u}` 报错，说明分支没有 upstream——同步前先用 `git push -u origin <branch>` 设好。
3. **有事可做吗？** `git rev-list --left-right --count HEAD...@{u}`。若输出是 `0\t0`，已经同步——退出。

## Rebase

```bash
git pull --rebase
```

- 干净成功 → push。
- 有 conflict → 解决，然后 `git rebase --continue`。

### Conflict Resolution

```bash
git status                                  # list conflicted files
git diff --name-only --diff-filter=U        # machine-readable list
```

对每个冲突文件：

1. 打开文件。定位 `<<<<<<<` / `=======` / `>>>>>>>` 标记。
2. 读两侧。陈述意图：每一侧想达成什么？是否一侧是另一侧的超集？它们正交吗？
3. 改成**期望的结果**，而不是「选一边」。保留不变量和用户可见行为，除非 conflict 有意要改它们。
4. `git add <file>`。

当仅凭 diff 看不清意图时，扩大上下文——两条分支的近期 commit 消息、调用方、测试。若仍不清楚，停下来，附上这些 hunk 向用户发问。

所有 conflict 解决后：

```bash
git rebase --continue
```

若 rebase 跨多个 commit，下一个 commit 上可能再次出现 conflict——重复处理。

要中止：`git rebase --abort`。

### Anti-Shortcuts

- **不要**用 `git rebase --skip`——会悄悄丢掉一个 commit。
- **不要**不解决意图就删掉 conflict 标记——会留下能编译却已损坏的代码。
- **不要**整体 `git checkout --ours` / `--theirs`，除非确定某一侧完全取代另一侧。

## Push

```bash
git push
```

干净 rebase 之后，push 应当 fast-forward。若它以 non-fast-forward 被拒：

- 你在 rebase 期间 upstream 又动了，**或**
- 另一个 agent 正在同一分支上竞争。

**停。** 不要自动 `--force` 或 `--force-with-lease`。把 rejection 暴露出来，再审慎决定：

- 若这个 rejection 来自你自己有意的重写（remote 仍是 rebase 前的形态，这在预料之中），`--force-with-lease` 就是对的工具。
- 若是别人推了工作，先 fetch 再重新 rebase。

## Sync Failure vs Permission Failure

不是每个 push rejection 都是 sync 问题。先分类再反应。

| 症状 | 原因 | 处理 |
|---|---|---|
| `non-fast-forward` | upstream 向前推进了 | 重新 rebase。 |
| `403` / `permission denied` / `must allow workflow scope` | 认证 / token scope | 暴露给用户。**不要**改写 remote URL 或切换协议。 |
| `protected branch` 规则 | 分支策略 | 暴露出来。不要绕过。 |
| `Repository not found` | remote 错了 / 无访问权限 | 暴露出来。 |

对认证 / 权限 / 策略类失败，默认是**停下，把确切的错误告诉用户**，而不是「试个变通」。改写 `origin` 来糊弄认证，正是坏掉的 push 配置四处扩散的根源。

## Verification

- [ ] 同步前工作区干净
- [ ] rebase 期间没用 `--skip`
- [ ] 没有残留 conflict 标记（`git diff --check`）
- [ ] push 成功且没用 `--force`（或是有意用了 `--force-with-lease`）
