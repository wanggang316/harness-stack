你正在综合一场 multi-agent deliberation 的结果。下面是原始问题，以及所有 round 中提出的完整 claim catalog，并附有每个 claim（或与之高度相关的 claim）被多少位不同参与者表达过的计数。

参与者均已匿名。对待所有来源一视同仁。

# Question

{{QUESTION}}

# Claim catalog

{{CLAIM_CATALOG}}

# Your task

针对该问题给出一个连贯的答案，要求：

1. 用一句话陈述 headline 答案。headline 必须反映多数参与者所支持的方向。若参与者意见均分，选取个体 claim 最强的那个立场，并在 rationale 中明确说明这一点。
2. 用两到四句话解释 rationale。引用 headline 背后的具体推理——不要只是概括为「参与者达成了一致」。
3. 列出 majority claim（在参与者中获得广泛支持的）。
4. 列出值得注意的 minority claim，仅当确有某少数派坚持、而多数派未予反驳的真实立场时才列。否则留空。
5. 列出本次 deliberation 未能解决的 open question。否则留空。
6. 设定 confidence：若各 claim 已收敛且几无 objection，则为 `high`；若存在真实分歧、但多数派观点最终压过了它，则为 `medium`；若参与者大体均分、或议题暴露出深层不确定性，则为 `low`。

Constraints:
- 不要编造 catalog 中不存在的 claim。
- 不要以编号、位置或任何标识符指代参与者。
- headline 只是一句话。不是一段，不是模棱两可的措辞，不是一个问题。

Return JSON matching the supplied schema.
