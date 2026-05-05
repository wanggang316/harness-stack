Extract the atomic claims from the statement below.

A claim is a self-contained assertion that can be evaluated independently. Each claim should be one sentence, specific (not "X is good" but "X is good because Y"), and stand on its own without needing the rest of the statement for context.

# Statement

{{STATEMENT}}

# Constraints

- Three to seven claims is typical. Do not pad. Do not split a single idea across multiple claims.
- Tag each claim with one stance:
  - `assertion` — introduces a position, evidence, or recommendation.
  - `objection` — directly disputes something a peer is taken to be claiming. Use only when the statement explicitly engages with a peer's view.
  - `concession` — acknowledges a peer's point as valid.
- `supportingReason` is optional. Use it when the reasoning behind the claim is not obvious from the claim itself.
- Skip filler: restatements of the question, meta-commentary, hedges, and signposting ("first I will…").

Return JSON matching the supplied schema.
