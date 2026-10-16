# Handoff decision tree

输入：一个 implementer 返回了。读它的 handoff：

```bash
fdd handoff <feature-id>
```

每个 handoff 都必须抵达一个终态动作，循环才能继续。

## A — `returnToController: true`

implementer 撞上了它解决不了的东西，求助了。查 `criticalContext` 和那段 summary：

| 原因 | 动作 |
|---|---|
| 缺少 precondition（例如 schema 未部署） | 在它前面创建/重排一个 precondition feature |
| plan 边界无法遵守 | 交还用户——边界是用户确认过的 |
| spec 含糊（两种读法，无法抉择） | 把 `plan.md` / contract 消歧（contract 编辑委派出去）；必要时与用户再确认；用更清晰的 description 把 feature 复位为 `pending` |
| 外部服务宕机 / 凭据过期 | **交还用户**——你恢复不了外部状态 |
| 仓库处于意外状态（脏树、错误分支） | 调查；在弄懂原因之前别去「清理」 |

修好根因之后：`fdd set-status <id> pending`，然后继续。绝不把一个被退回的 feature 标记为 `completed`。

## B — `successState: failure`

1. 把失败分析委派给只读的 `harness-stack:investigator`：读 handoff（尤其是 `verificationEvidence`、`criticalContext`、`discoveredIssues`）、该 feature、以及 `plan.md`；定位根因；推荐 1-3 个修复 feature（id、description、preconditions、expectedBehavior、verificationSteps、agent、fulfills），并判断原 feature 是更新 description 后留作 `pending`、还是被替换。
2. 最常见：在 `features.json` 的**顶部**创建修复 feature 并把原 feature 复位为 `pending`。修复先跑；原 feature 之后重跑。

## C — `successState: partial`

一部分 `expectedBehavior` 过了，一部分没过。
- 最常见：把原 feature 复位为 `pending`，更新 `description` 精确说明还剩什么（把相关 `criticalContext` 折叠进去给下一个 worker）。
- 若部分结果可用、且缺口界限清楚：标 `completed`，并在同一 milestone 里（紧跟其后）为该缺口创建一个后续 feature。
- 若缺口很大：当作 `failure`（路径 B）。

## D — `successState: success`

别盲信——简短核验：
1. 与 `commits[]` 匹配的 commit 存在吗？（`git log --oneline -5`）
2. 树干净吗？若不干净，worker 忘了提交——当作 `partial`。
3. `verificationEvidence` 是否以真实结果（而非「verified」/「looks fine」）覆盖了每个 `verificationStep`？缺失的验证是技术债——见 D.2。

然后处理这几个清单：

### D.1 — `discoveredIssues`（顺带发现的缺陷；必须被追踪）

| 严重度 | 默认处理 |
|---|---|
| `blocker` | 在**顶部**新建一个 feature；原 feature 维持 `completed` |
| `tech-debt` | 若 milestone 未封存则在同一 milestone 里做后续，否则进一个 `misc-*` milestone（≤5 个 feature） |
| `nit` | 值得修就进 `misc-*`，否则带理由 dismiss |

仅在以下情形允许跳过：(1) 已被某个现有 feature 追踪（引用其 id），或 (2) 确实永远不需要修。「优先级低」/「不阻塞」/「以后再说」**不是**正当理由。

### D.2 — `whatWasLeftUndone`（范围内未做完的工作；必须被追踪）

跳过的手动 QA / 不完整的验证 = 技术债。

| 归属 | 动作 |
|---|---|
| 本 feature（例如它的 QA 被跳过了） | 复位为 `pending`，更新 `description` 覆盖该缺口 |
| 某个现有的 pending feature | 折叠进那个 feature 的 `description`（若合并后的范围仍能装进一个 session） |
| 一块新的、界限清楚的工作 | 新建 feature（顶部 / milestone 内 / `misc-*`） |
| 超出范围（罕见） | 带理由 dismiss，或上交 |

### D.3 — `criticalContext`（下一个 worker/validator 需要的事实）

- 项目/代码库事实（例如「迁移必须在应用启动前跑」）→ 相关的 `docs/` Library 文件。
- 特定于某 feature → 更新那个 feature 的 `description`。
- 值得保留的决策/理由 → `plan.md` 的 Decision Log。

### D.4 — Terminal

```bash
fdd set-status <feature-id> completed
```

继续循环。

## Dismissals — when and how

dismiss 是有意决定不对某个 handoff 项采取行动。慎用。一个有效的理由要有实质（≥ 一句话）：「已作为 feature `<id>` 追踪：……」或「永远不需要修：……」。无效的：「优先级低」「不阻塞」「以后再说」、光秃秃的「超出范围」。把这个决定记进 `plan.md` 的 Decision Log（plan 目录是工作记录；`docs/` 的 git 历史是耐久事实的审计痕迹）。

## Quick reference

```
handoff arrives
├── returnToController? ──► (A) fix root cause / escalate; feature → pending
├── failure?            ──► (B) subagent analysis → fix features at top → original → pending
├── partial?            ──► (C) usually feature → pending with updated description
└── success
    ├── verify commits + clean tree + real evidence (else → partial)
    ├── discoveredIssues: blocker→top · tech-debt→milestone/misc · nit→misc/dismiss
    ├── whatWasLeftUndone: this-feature→pending · existing→update · new→feature · oos→dismiss
    ├── criticalContext: project→docs/ Library · feature→description · decision→plan.md
    └── set-status completed → loop
```
