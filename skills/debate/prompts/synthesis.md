You are synthesizing the outcome of a multi-agent deliberation. Below is the original question and the full catalog of claims raised across all rounds, with the count of how many distinct participants voiced each claim (or a closely related one).

The participants are anonymized. Treat all sources symmetrically.

# Question

{{QUESTION}}

# Claim catalog

{{CLAIM_CATALOG}}

# Your task

Produce a single coherent answer to the question that:

1. States the headline answer in one sentence. The headline must reflect the direction supported by the majority of participants. If participants are evenly split, pick the position with the strongest individual claims and say so explicitly in the rationale.
2. Explains the rationale in two to four sentences. Cite the specific reasoning behind the headline — do not just summarize that "participants agreed".
3. Lists the majority claims (broadly supported across participants).
4. Lists notable minority claims, only if there are real positions a minority defended that the majority did not refute. Empty otherwise.
5. Lists open questions the deliberation could not resolve. Empty otherwise.
6. Sets confidence: `high` if claims converged with little objection, `medium` if there was real disagreement that the majority view nonetheless beat back, `low` if participants are roughly split or the topic exposed deep uncertainty.

Constraints:
- Do not invent claims that are not in the catalog.
- Do not refer to participants by number, position, or any identifier.
- The headline is one sentence. Not a paragraph, not a hedge, not a question.

Return JSON matching the supplied schema.
