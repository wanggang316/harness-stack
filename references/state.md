# State

harness-stack 是有状态的。配置按项目存放在仓库之外，位置和推导规则只由 [setup-tracker](../skills/workflow/setup-tracker/SKILL.md#where-the-configuration-lives) 定义；其他 skill 只说"按 setup-tracker 的规则找到配置"，不写路径。

只有 `skills/workflow/` 下的工作流层 skill 读取配置、操作 tracker；`skills/engineering/` 下的 skill 不读配置。分层理由见 [ADR 0001](../docs/decisions/0001-ticket-workflow-layer.md)。

| 文件 | 写入方 | 读取方 |
|---|---|---|
| `issue-tracker.md` | `setup-tracker` | `to-spec`、`to-tickets`、`grill-spec-tickets`、`shepherd-tickets` |
| `workflow.md` | `setup-tracker` | 同上 |

新增文件时在这张表里登记，并在 setup-tracker 里说明它的位置。

## 约定

- **不写进项目**：skill 不在项目仓库里写配置或状态文件。
- **缺失时提示 setup**：需要配置的 skill 在配置缺失时告诉用户运行 `/setup-tracker`；不需要工单的工作照常进行。
- **一个文件一个写入方**：每个文件只由一个 skill 写入，其他 skill 只读。
- **人可直接编辑**：用 markdown 记录，用户可以手改；skill 读到什么就按什么做。
