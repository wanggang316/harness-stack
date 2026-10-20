---
name: review-request
description: 为非平凡改动请求独立评审，准备完整的改动快照和需求上下文，核对返回报告的覆盖范围。
---

# review-request

为当前改动取得独立评审。作者负责准备输入和检查覆盖，reviewer 负责核实代码；独立上下文能减少对作者原有假设的依赖。

按 `harness-stack:code-review` 固定评审对象和依据。brief 给出工作目录、base/head、约定的未提交文件及快照、预期行为、项目约束、验证记录和关注点。只提供事实和必要指针，文件无法共享时提供内容；不要让 reviewer 依赖当前会话历史。

将 brief 传给 `harness-stack:code-review`，由它派发 Standards 和 Spec 两个独立 reviewer。评审期间冻结被评审文件或使用隔离快照；本入口不额外派发相同的 reviewer。

根据风险决定是否增加专门的安全或测试评审。额外 reviewer 有明确覆盖范围，报告保留其证据及未覆盖部分；Standards 和 Spec 的报告仍分开。

`code-review` 不可用时报告缺少评审入口。subagent 不可用时报告无法取得独立评审；作者自检标明身份，独立评审条件仍未完成。

收到报告后核对范围、版本、问题位置与证据是否完整。范围遗漏就补审，版本变动就重验受影响部分，不能仅凭 reviewer 的成功状态宣告完成。保留未解决的问题和原始依据，将完整 findings 返回作者；本 Skill 不实施修复或发布报告。
