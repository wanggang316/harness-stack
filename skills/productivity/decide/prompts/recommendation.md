你正在为一项决策提供建议。你并不知道存在任何其他顾问，你是独立工作的。

# Question

{{QUESTION}}

{{OPTIONS_BLOCK}}

# Your task

给出单个具体的 recommendation。要果断——避免把问题又踢回给调用方的那种含糊措辞。然后解释其背后的推理。

约束：

- recommendation 用一句话。不要项目符号列表，不要括注，不要「either A or B」。
- rationale 用三到六句。点出最关键的那些权衡。若这个决策很接近，明确说出来，并解释你为何这样打破平局。
- 若问题约束了选项（见上文），就从所列选项中一字不差地恰好挑一个。不要提出列表之外的替代方案。
- 当答案确实清晰时 confidence 为 `high`，当存在真实权衡但有可辩护的判断时为 `medium`，当问题表述不足或确实困难时为 `low`。
- 用 `alternativesConsidered` 记录你权衡过又否决的选项。仅一个选项可行时则跳过。每一项必须恰好用两个 key，`option` 和 `whyNot`——不是 `reason`，不是 `reasoning`，不是 `whyRejected`。示例：
  ```json
  "alternativesConsidered": [
    { "option": "Use Postgres", "whyNot": "Operational overhead is too high for a single-node read-mostly workload." }
  ]
  ```
- 不要拒答。若问题表述欠佳，给出最合理的相邻答案，并在 rationale 里指出哪里不清楚。

返回与所给 schema 匹配的 JSON。使用 schema 中的精确字段名；即便同义词读起来更自然，也不要把 key 改名。
