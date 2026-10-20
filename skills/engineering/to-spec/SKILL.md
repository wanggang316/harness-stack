---
name: to-spec
description: 将已讨论清楚的需求与设计整理成一份完整 spec，并发布为一张 GitHub Issue。
disable-model-invocation: true
metadata:
  adapted-from: >-
    [mattpocock/skills: to-spec](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md).
---

# to-spec

综合当前会话和代码库理解，产出可直接交给执行者的 spec。只发布一张 Issue，不拆票、不实现、不默认写设计文件；它不预设自己是父任务。

## 1. Resolve the target

仅要求草稿时跳过目标仓库、认证和标签检查，直接进入第 2 步；准备发布时才执行本节。

从 `origin` 得到项目的 `<owner>/<repo>`，读取 `~/.harness-stack/<owner>.<repo>/`：

- `issue-tracker.md` 指定发布仓库；缺失时用 `origin`，用户指定的目标优先。
- `triage-labels.md` 指定 triage 角色到 label 的映射；缺失时不加 triage label。

没有 GitHub `origin` 时跳过项目配置；用户未指定目标仓库时询问目标。确认 `gh` 已登录，并读取目标仓库已有的 label。有 `agent-todo` 映射且目标 label 存在时使用它，不猜测或自动创建 label。映射失效时报告，发布前确认是否不带该 label。

结论：目标仓库与标签已确定；权限或连接不可用时仍可完成草稿，发布步骤明确保持未完成。

## 2. Synthesize the context

已有讨论足够时直接综合，不重做需求访谈。传入文件或 Issue 引用时读完整内容；Issue 同时读评论，它是上下文来源，不自动成为父任务或编辑目标。

按需读相关代码、领域文档和有效 ADR，使用项目已有术语。区分当前行为、已确认的改变和假设。缺少会影响范围、行为或关键取舍的信息时，只询问这些缺口；未解决时交付草稿并列出阻塞，不把假设写成已确认决定或发布为待执行任务。

明确测试接口，优先已有、较高层的行为接口，以尽量少的测试边界覆盖功能。沿用已确认的测试决定；需要新增测试接口或改变测试策略时，向用户说明并取得决定。

结论：执行范围、实现决定和测试策略明确，或草稿中的阻塞事项可见。

## 3. Write the spec

正文跟随项目文档语言，无先例时用英文。使用下列七个章节；Further Notes 没有内容时省略。

<spec-template>

## Problem Statement

用户遇到的问题，从用户视角描述。

## Solution

解决问题后用户获得的能力，从用户视角描述。

## User Stories

编号列出用户故事，覆盖功能的主要行为、权限、边界与失败场景；用可观察结果表达需求，不靠重复凑数量。

1. As an <actor>, I want <feature>, so that <benefit>.

## Implementation Decisions

已确认的模块及接口变化、技术约束、架构决定、schema、API 契约与交互。记录让执行者无需重新猜测的共同约束，相关理由可链接已有 ADR。

## Testing Decisions

以可观察行为为测试依据。说明测试哪些模块或接口、关键成功与失败场景，以及代码库中可复用的测试模式。这里写验证计划，不声称尚未运行的测试已经通过。

## Out of Scope

明确本次不包含的工作，尤其是读者可能合理期待但已排除的内容。

## Further Notes

其他影响执行的信息与可访问的来源链接。

</spec-template>

避免具体文件路径与代码片段，它们容易过时。例外：原型中的状态机、schema 或类型形状比文字更精确时，只保留承载决定的片段并注明来自原型。需要引用仓库文档时用可从 GitHub Issue 访问的链接，不写机器本地路径。

结论：草稿完整表达本次交付，读者不依赖原会话也能理解，未包含占位内容。

## 4. Publish and verify

展示目标仓库、标题、正文和标签。发布需要用户明确授权；会话已明确授权向该目标发布此范围的 spec 时直接继续，不重复询问。只要求草稿或仍有关键未决事项时停在草稿。

将正文写入仓库外的临时文件，使用 `gh issue create --repo "$repo" --title "$title" --body-file "$body_file"` 发布；仅在有已确认标签时附加 `--label`。

- 只创建这一张 spec Issue，不修改或关闭来源 Issue，不建立父子或 blocked-by 关系。
- 请求超时、返回含糊或回读失败时，先查询目标仓库近期 Issue，核对作者、标题与正文；未确定是否已创建前不重试创建，避免重复。
- 取得 URL 后用 `gh issue view` 回读，核对仓库、标题、正文与标签。回读失败时区分已获得的创建结果与尚未验证的内容。

结论：返回 Issue URL 与回读结果；失败时报告已知状态和剩余阻塞，不把草稿当作已发布。
