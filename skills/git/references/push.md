# Push Reference

更底层的 push 语义。高层的 push + open PR 见 [harness-stack:pr](../../pr/SKILL.md)；本文件讲 `git push` 本身——force 的几种变体、rejection 的分类、auth 与 sync 的区分。

## Initial Push

```bash
git push -u origin HEAD
```

`-u` 设定 upstream，好让之后的 `git push` / `git pull` 知道去哪。每个分支做一次。

## Subsequent Pushes

```bash
git push
```

若被拒，先分类再反应。

| 症状 | 原因 | 处理 |
|---|---|---|
| `non-fast-forward` | upstream 正常向前推进了 | 先同步（[sync.md](sync.md) 或 [pull.md](pull.md)），然后再 push。 |
| 有意 rebase 之后的 `non-fast-forward` | history 被重写了 | `git push --force-with-lease` |
| `403` / `permission denied` | token scope / 认证 | 把错误暴露出来。**不要**改写 remote URL 或切换协议。 |
| `protected branch` | 仓库策略 | 暴露出来。不要绕过。 |
| `Repository not found` | remote 错了 / 无访问权限 | 暴露出来。 |

## Force-Push Discipline

- **绝不**用裸 `git push --force`。它会无条件覆盖队友的 commit。
- **`--force-with-lease`** 是唯一可接受的 force 变体。若 remote 在上次 fetch 之后动过，它会拒绝 push——防住「force-push 盖掉队友」这个走火点。
- 只有在 history 被**有意重写**时（rebase 之后、`git commit --amend` 之后）才用 force。不是当作通用的「让它过去」工具。
- 未经明确授权，不要向共享分支（`main`、`develop`、release branch）force-push。

## Auth vs Sync — Don't Confuse Them

`permission denied` **不是** sync 问题。AI 常见的偷懒路径是：

> Push 失败 → 也许我该把 remote 改成另一个协议 → 也许我该用带 token 的 URL 重新 clone ……

打住。认证错误意味着凭证、token scope 或仓库策略不对。把确切的错误暴露出来。改写 `origin` 来糊弄认证，正是密钥最终落进 `.git/config`、以及坏掉的 push 配置四处扩散的根源。

## When the Remote Branch Already Advanced

若 `git fetch` 显示远端 feature branch 动过了（CI 自动 commit、另一个 agent），而本地也有新 commit：

1. **首先**：把远端 feature branch 拉进本地（fast-forward 或 merge——见 [pull.md](pull.md) 第 3 步）。
2. **然后**：必要时 rebase 或 merge `origin/main`。
3. **最后**：push。

不先吸收远端 feature branch 就 push，会以 non-fast-forward 被拒——而越过它强行 `--force-with-lease` 会抹掉那条 CI 自动 commit（或另一个 agent 的工作）。

## Verification

- [ ] push 成功，且没用裸 `--force`
- [ ] 没有为绕开认证而改写 remote URL
- [ ] 若用了 `--force-with-lease`，那次 history 重写是有意为之
