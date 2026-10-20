---
name: code-review
description: 使用独立 subagent 从 Standards 和 Spec 两轴评审分支、PR、指定提交或未提交改动，分开展示 findings 和证据。
metadata:
  credits:
    skill: code-review
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/code-review/SKILL.md"
---

# code-review

为一组明确的改动组织独立的双轴评审，交付各轴可定位、可验证的 findings 和结论。评审期间保持被评审文件不变；修复、发布评论和合并属于另外的授权范围。

## 固定评审对象

先确认工作目录、分支、基点、提交范围和工作区状态。用户指定的范围优先；PR 使用其实际 base/head，分支评审使用与目标分支的 merge-base。明确的两端提交比较使用两端 diff，不把它改成 merge-base 比较。将分支名解析为 SHA，避免评审中移动的引用改变对象。

评审进行中的实现时，包含约定范围内的 staged、unstaged 和 untracked 文件。已跟踪文件可用 `git diff <base-sha>` 查看最终工作区相对基点的净变化，再结合 `git diff --cached`、`git diff` 和 `git ls-files --others --exclude-standard` 核对组成。新文件单独读取；区分用户原有改动，范围不明就确认归属，不自动纳入或清理。

记录 base/head、文件清单及未提交部分的内容快照或哈希。异步评审时暂停这些文件的写入，或提供隔离快照；结束前核对身份，发生变化就注明覆盖失效并补审，不能把旧报告套到新代码上。

若引用无效、基点无法确定或约定范围内没有改动，报告实际情况并请求必要的范围信息。空 diff 不产生批准结论。

## 建立评审依据

从用户要求、任务正文、PR 描述和相关当前知识确定预期行为；读取受影响目录的项目指令、规范、有效决定和测试。没有独立 spec 文件时可使用已确认的任务描述。缺少需求依据不阻止检查可证实的代码问题，但需求符合度须标为未验证。

分别回答两类问题：改动是否完成约定行为；实现是否正确且符合项目约束。项目规范优先于个人偏好。结构、命名和抽象建议需解释实际维护成本或错误风险，不能单凭函数长度、参数数量或抽象层数判定缺陷。

## 派发独立的双轴评审

创建两个全新上下文的只读 subagent，分别负责 **Standards** 和 **Spec**；有并发能力时同时派发。每个 reviewer 只接收共同的改动快照、必要依据和本轴职责，不继承作者的会话，也不读取另一轴的推理或报告。分开检查使规范符合度与需求符合度各自得到明确结论。

使用 `harness-stack:code-reviewer`，或宿主提供的通用 subagent，并给出 [Reviewer 指导](references/reviewer-guide.md) 的可访问绝对路径。brief 包含：

- 工作目录、固定的 base/head、diff 命令、提交列表、约定的未提交文件和快照身份。
- 本轴名称及关注点；两个 reviewer 都读取 Reviewer 指导中的共同方法和报告要求。
- Standards 的项目规范、有效决定及其位置；Spec 的完整需求依据或已确认任务描述。
- 实际验证记录、已知限制，以及复审时的原 findings 和处理理由。

材料不能通过路径共享时传入必要内容。reviewer 只评审自己的轴并返回结果，不调用本 Skill 继续派发。

没有需求依据时，只派发 Standards，将 Spec 标为 `Incomplete: no spec available`，说明需要补充什么。宿主只能串行执行时仍使用两个独立上下文；不能创建 subagent 时报告双轴独立评审未完成，自检不充当独立报告。

## 分开展示结果

等待两个轴返回，核对报告覆盖范围、证据和快照身份。遗漏范围或版本变化需要补审；某个 reviewer 失败时保留已返回轴的结果，并将失败轴标为 `Incomplete`。

分别以 `## Standards` 和 `## Spec` 展示报告，可清理措辞，但保留各自 findings、严重度、证据和结论。跨轴指向同一根因时可互相引用，两个轴的记录都保留；不合并成一张排序列表，也不用一个轴的通过抵消另一个轴的问题。

结尾分别说明每轴的 findings 数、最严重问题及覆盖限制，不再给一个取代两轴的总批准。`No blocking findings` 是评审结果，不代表测试、合并、部署或线上验收完成。用户要求发布到 PR 时才发布，并核对目标 PR 与评审版本一致。
