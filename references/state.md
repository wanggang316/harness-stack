# State

新版本的 harness-stack 是有状态的。配置与状态按项目存放在 `~/.harness-stack/<project>/`，不写进项目仓库。

## 布局

```text
~/.harness-stack/
└── <project>/
    ├── issue-tracker.md    # Issue 发布到哪个 GitHub 仓库
    └── triage-labels.md    # triage 角色到 label 的映射
```

| 文件 | 写入方 | 读取方 |
|---|---|---|
| `issue-tracker.md` | `setup-harness-stack` | `to-spec`, `to-github-issues` |
| `triage-labels.md` | `setup-harness-stack` | `to-spec`, `to-github-issues` |

新增文件时在这张表里登记。

## `<project>` 的取值

由 `origin` remote 指向的 GitHub 仓库得出：`<owner>.<repo>`，例如 `wanggang316.harness-stack`。GitHub 的 owner 不含 `.`，所以第一个 `.` 之前就是 owner。

同一仓库的多个 clone、worktree 共用一份状态。没有 GitHub `origin` 时没有项目状态。

## 约定

- **不写进项目**：skill 不在项目仓库里写配置或状态文件。
- **缺失时照常运行**：读状态的 skill 在目录或文件不存在时按默认行为运行，不要求先跑 setup。
- **一个文件一个写入方**：每个文件只由一个 skill 写入，其他 skill 只读。
- **人可直接编辑**：用 markdown 记录，用户可以手改；skill 读到什么就按什么做。
