---
name: grill-with-docs
description: Interview the user in depth about requirements or design, clarify decision dependencies, and record confirmed domain terms and important decisions as the discussion proceeds.
disable-model-invocation: true
metadata:
  credits:
    skill: grill-with-docs
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md"
---

# grill-with-docs

Reach a shared understanding through interview rounds while maintaining the glossary and ADRs. Keep assumptions and open questions in the conversation. Do not create a spec, design file, or ticket by default, or change product code.

## Read the context

Read the code, documentation entry points, glossary, and active ADRs relevant to the discussion. Use the existing knowledge directories and document language. Reuse confirmed decisions; identify conflicting evidence. Distinguish confirmed decisions, facts to verify, and choices to make. Investigate facts yourself; the user owns product trade-offs and preferences.

Before the first write, confirm that you are in a dedicated worktree on a non-main branch. Otherwise, create or switch to a worktree under the project's rules. If you cannot switch safely, continue the discussion, retain the pending content, and report it without writing to main.

## Work the decision tree in rounds

Map the requirements or design as a tree of dependent decisions. In each round, ask only questions whose prerequisites are settled. A question that depends on another unresolved answer in the current round belongs to a later round.

- Ask the independently answerable questions together. Number them and give a recommended answer, reason, and main trade-off so the user can confirm or correct each one.
- Prioritize choices that change scope, concept boundaries, observable behavior, failure semantics, or important design decisions. Test answers against concrete counterexamples and boundary cases.
- When a term is ambiguous, compare it with existing definitions and propose a precise name. Do not let the same word silently change meaning.
- Recompute the tree after the user answers. No answer does not mean acceptance. A fact under investigation blocks only the questions that depend on it; other questions can proceed.

## Record confirmed knowledge as it emerges

Write confirmed terms and durable decisions during each round, rather than waiting for the interview to end. Record only content the user has confirmed. Use the formats in `domain-modeling` when available; otherwise, use these rules:

- **Glossary**: use the existing file, or `docs/glossary.md` if there is no convention. Define each project-specific concept and its boundaries in one or two sentences. List aliases to avoid when useful. Exclude implementation plans.
- **ADR**: record a decision when missing context could lead a future reader to make a harmful change or repeat an expensive investigation. Use the existing directory and numbering, or `docs/decisions/NNN-<slug>.md` with a number one greater than the current maximum.
- **Decision content**: state the context, choice, reason, trade-offs, and conditions for reconsideration. Mark it `Status: Accepted`. Acceptance does not mean implementation or deployment. When a new decision replaces an ADR, create a new record, link both directions, and mark the old record `Superseded by <link>`. Preserve its original context.
- **Discovery**: link new knowledge files from the existing documentation index. If none exists, add an entry to the README or a minimal `docs/index.md`. Do not generate empty documentation scaffolding.

Confirmed future behavior must not replace descriptions of the current implementation. If code conflicts with an approved contract, preserve the distinction and raise the issue; do not rewrite the contract to remove the discrepancy. Write no files when there is no new durable knowledge. If the user requests no file writes, list the pending content in the response only.

## Close the interview

When no branches remain open, summarize the goal, key decisions, scope boundaries, and updated documents. Confirm the shared understanding; do not ask again if the user has already confirmed the same summary. If the user ends early, list the remaining questions without claiming convergence.

Check terminology, statuses, and links in the changed documents. Commit them on the discussion branch. With the user's agreement, push it and open a pull request that contains only these documents, so work planned from this discussion starts from a default branch that already has them. Return the documents, the branch or pull request, and unresolved items. This skill ends with the interview and knowledge records; it does not automatically start implementation, publish an issue, or invoke another workflow.
