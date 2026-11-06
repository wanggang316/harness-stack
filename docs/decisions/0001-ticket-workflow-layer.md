# 工单工作流分层与需求负责人

Status: Accepted

工单相关的 skill 原先混在 `skills/engineering/` 里：`to-spec`、`to-tickets` 既写内容又操作 tracker，配置位置由 `setup-harness-stack` 定义，新工单的状态、assignee 和 label 由 agent-workflow 的 triage workflow 补齐，人工关口（评审后放行、卡住的工单）没有 skill 负责。现在把工单工作拆成两层：

- **内容层**（`skills/engineering/`）：`write-spec`、`write-tickets` 综合上下文，按约定格式编写 spec 或工单并返回给使用者。它们不负责发布，不感知文档、tracker 等去处，也不知道工作流层的存在。
- **工作流层**（`skills/workflow/`）：有状态，读取仓库外的项目配置并按工作流操作 tracker。`setup-tracker` 写配置；`to-spec`、`to-tickets` 在信息不足时先用 `grill-with-docs` 访谈，再调用内容层，最后带状态、assignee 和 label 发布；`grill-spec-tickets` 把访谈、spec、拆票串成一次运行；`shepherd-tickets` 作为需求负责人跟进工单。工作流层可以编排内容层，这是 Golden Rule 1 的明确例外，反方向不允许。

随之确定：

- **状态词表由 harness-stack 定义**：`backlog → todo → in-progress → in-review → reviewed → merging → done`，任何 run 需要人时进入 `blocked`。tracker 上的名字在 GitHub、GitLab、Linear 上统一用 Title Case（`In Progress`、`Blocked`），与 Linear 原生状态和 agent-workflow 模板一致，并和小写的类型 label（`bug`、`enhancement`）在视觉上区分开；skill 文本里的状态 id 仍用小写连字符。`setup-tracker` 把语义状态映射到 tracker 上的实际名字记在 `workflow.md`，对已有的同义 label 让用户选择重命名或沿用，对缺失的选择新建或映射，对退役的状态 label 选择保留、迁移后删除或删除；agent-workflow 的 rule set 按这份约定使用状态名，不再自带 `setup-project`。
- **去掉 triage**：发布工单时一次写好状态、assignee 和默认 label，不再有 triage 评论。`to-tickets` 的工单发布为 `todo`（被阻塞的工单由 implement 等待阻塞解除）；`to-spec` 按 spec 能否直接执行，发布为 `todo` 或 `backlog`。`Needs Info` 不再有来源，从词表删除。
- **backlog 只表示“已发布但现在不应开工”**：等待拆票的 spec、等待非工单外部条件的工作、有意延后的工作。受管工单缺状态是异常，不等于 backlog，所以 backlog 保留为显式状态。
- **只有工作流层移动状态**：`to-*` 设置初始状态；`shepherd-tickets` 在人工关口（`backlog`、`reviewed`、`blocked`）代替人放行、反馈或交给用户，并修正受管工单的 assignee 和 label。核心 skill（`implement`、`code-review`）仍然不碰 tracker。
- **`shepherd-tickets` 的范围是当前上下文管理的工单**：由用户手动调用，工单 ID 写进调用参数，其他工单不碰。周期执行用 Agent 内置的 loop 或定时（建议 10 分钟一次），skill 本身只定义单轮巡检。直接合并只在验收证据完整、CI 通过、评审 clean、Merge Danger 为双向门时进行，其他情况反馈或交给用户。

代价：harness-stack 和 agent-workflow 通过状态名约定耦合，任何一方改名都要同步另一方。`shepherd-tickets` 依赖会话存活，不适合 7×24 无人值守；需要时再引入外部调度。若以后出现多种内容产出共享同一工作流，或状态词表需要按项目自定义，重新评估这份决定。
