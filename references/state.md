# State

新版本的 harness-stack 是有状态的。配置与状态按项目存放在 `~/.harness-stack/<project>/`，不写进项目仓库。

## 布局

```text
~/.harness-stack/
└── <project>/
    ├── issue-tracker.md    # Ticket 平台（github / gitlab / linear）与目标
    ├── state-machine.md    # 规范状态到 tracker 上名字的映射
    ├── evidence/           # implement 采集的截图、录屏，按任务或分支分目录
    └── notes/              # implement 任务图模式里调研子 agent 的笔记
```

| 文件 | 写入方 | 读取方 |
|---|---|---|
| `issue-tracker.md` | `setup-harness-stack` | 通过 [tickets.md](../skills/engineering/setup-harness-stack/references/tickets.md) 操作 ticket 的 skill（`implement-ticket`、`code-review-ticket`、`to-tickets`、`to-spec`） |
| `state-machine.md` | `setup-harness-stack` | 同上 |
| `evidence/` | `implement` | `implement`、`code-review` 及其调用方 |
| `notes/` | `implement`（任务图模式） | `implement` 的子 agent |

新增文件时在这张表里登记。旧版本的 `triage-labels.md` 已不再读取，`setup-harness-stack` 会提示删除。

## `<project>` 的取值

由 `origin` remote 得出：取 host 之后的仓库路径，去掉末尾 `.git`，把 `/` 换成 `.`。例如 `github.com/wanggang316/harness-stack` → `wanggang316.harness-stack`，`gitlab.com/group/sub/app` → `group.sub.app`。Linear 项目同样以代码仓库的 `origin` 为键。

同一仓库的多个 clone、worktree 共用一份状态。没有 `origin` 时没有项目状态。

## 约定

- **不写进项目**：skill 不在项目仓库里写配置或状态文件。
- **缺失时照常运行**：读状态的 skill 在目录或文件不存在时按默认行为运行（从 `origin` 推断平台、使用规范状态名），不要求先跑 setup。
- **一个文件一个写入方**：每个文件只由一个 skill 写入，其他 skill 只读。
- **人可直接编辑**：用 markdown 记录，用户可以手改；skill 读到什么就按什么做。
