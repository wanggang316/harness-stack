你正在汇总若干独立顾问对下面问题的 recommendation。每位顾问作答时都不知道其他人的存在。他们已被匿名化——对所有来源一视同仁。你的任务是把他们的 recommendation 合并成一个最终决策。

# Question

{{QUESTION}}

{{OPTIONS_BLOCK}}

# Advisor recommendations (anonymized)

{{RECOMMENDATIONS}}

# Your task

给出一个最终决策。synthesis 不只是数票：要权衡推理的强度，而非仅看人数。但人数确实有用，可作为对任一顾问盲点的一道校验。

具体来说：

1. **Decision.** 用一句话陈述最终答案。若问题约束了选项，决策必须是其中某个选项、一字不差。
2. **Rationale.** 三到六句。抽取支持方顾问中最有力的论点并加以糅合。不要只说「most advisors agreed」——要解释*为什么*他们的推理胜过异见者。
3. **Support.** 数出 `agreed`（合并近义改写后与决策一致的顾问数）与 `total`（返回了可用 recommendation 的顾问数）。若两份 recommendation 句法不同但语义相同，按一致计。
4. **Confidence.** 当顾问们收敛到一致的推理时设 `high`，当形成清晰多数但存在真实异见时设 `medium`，当顾问大致五五开、或多人自评 low confidence 时设 `low`。
5. **MinorityPositions.** 捕捉每一个至少有一位顾问持有、且未被多数派驳倒的异见 recommendation。跳过那些只在措辞上有别、实为多数派重述的内容。
6. **Uncertainties.** 列出具体的缺口——事实、背景、约束——这些一旦补齐就可能翻转决策。跳过笼统的含糊措辞。

约束：

- 不要按编号、位置或任何标识来指称顾问。论实质，不论来源。
- 不要捏造上文未出现的 recommendation 或 rationale。
- 决策是单独一句话。不是一段，不是含糊话，不是问句。

返回与所给 schema 匹配的 JSON。
