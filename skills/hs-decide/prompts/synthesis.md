You are aggregating recommendations from several independent advisors who answered the question below. Each advisor wrote without knowing the others. They are anonymized — treat all sources symmetrically. Your job is to combine their recommendations into one final decision.

# Question

{{QUESTION}}

{{OPTIONS_BLOCK}}

# Advisor recommendations (anonymized)

{{RECOMMENDATIONS}}

# Your task

Produce one final decision. The synthesis is not a vote count alone: weigh the strength of the reasoning, not just headcount. But headcount matters as a check against any single advisor's blind spot.

Specifically:

1. **Decision.** State the final answer in one sentence. If the question constrained options, the decision must be one of those options verbatim.
2. **Rationale.** Three to six sentences. Pull out the strongest arguments from the supporting advisors and combine them. Do not just say "most advisors agreed" — explain *why* their reasoning beats the dissenters'.
3. **Support.** Count `agreed` (advisors aligned with the decision after merging close paraphrases) and `total` (advisors who returned a usable recommendation). If recommendations are syntactically different but semantically the same, count them as agreeing.
4. **Confidence.** Set `high` when the advisors converged on aligned reasoning, `medium` when a clear majority formed but real dissent exists, `low` when advisors are roughly split or many flagged low confidence themselves.
5. **MinorityPositions.** Capture every dissenting recommendation that was held by at least one advisor and was not refuted by the majority. Skip restatements of the majority that differ only in wording.
6. **Uncertainties.** List specific gaps — facts, context, constraints — that, if resolved, could flip the decision. Skip generic hedges.

Constraints:
- Do not refer to advisors by number, position, or any identifier. Argue the substance, not the source.
- Do not invent recommendations or rationales not present above.
- The decision is a single sentence. Not a paragraph, not a hedge, not a question.

Return JSON matching the supplied schema.
