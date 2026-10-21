---
name: document
description: Maintain durable project knowledge when confirmed behavior, architecture boundaries, terminology, decisions, or operations change, or turn verified investigation results into reusable knowledge.
---

# document

Update the smallest knowledge set related to the current facts or decisions. Input can be a conversation, code change, task, PR, or named document. No proposal is required; do not scan unrelated modules.

## 1. Locate the knowledge

Read project instructions, documentation entry points, and relevant documents, then verify the code, tests, and decisions involved. Find the primary maintenance location for each topic. Follow existing directories and document language. Read [references/placement.md](references/placement.md) when conventions are absent or placement is unclear. If no durable knowledge changed, explain why and finish without creating files.

## 2. Resolve claims

Distinguish:

- **Contracts**: approved behavior, invariants, and external constraints. Deviating code may be defective; do not change the contract to fit the implementation without a decision.
- **Implementation descriptions**: current structure and mechanisms. Verify against current code; code presence does not prove a user entry point works.
- **Decisions**: choices made, reasons, and trade-offs. Keep pending choices in the task or proposal.
- **Verification evidence**: actual results for a particular version and environment. Preserve scope and provenance; merge, deployment, and passing tests are not interchangeable.

Preserve existing rules when conflicts remain unresolved. Report them and continue independent content. Cite external sources and applicable versions. Do not present an old investigation as a current fact without verification.

## 3. Update in place

Update current knowledge at its authoritative location. Remove duplication or obsolete statements caused by this change. Organize by domain so readers need not replay delivery records chronologically. Keep only useful entry-point paths and verify them before citing.

New content must support later changes or operations: behavior contracts, cross-module relationships, non-obvious constraints, or lessons that are difficult to rediscover. Keep simple configuration lookups, per-file change lists, and ordinary debugging history in the original task. Do not create an article for a conclusion adequately expressed by a local comment or regression test.

Before recording a decision, check related ADRs. State context, choice, reason, trade-offs, and reconsideration conditions, with an explicit `Proposed`, `Accepted`, or `Superseded` status. When an approved decision replaces an earlier one, create a new record, link both directions, and preserve the old context. Record-worthiness depends on whether missing rationale could cause harmful changes, not only on reversal cost.

Link new knowledge files from an existing topic index or documentation entry point. Add a minimal conditional pointer to project instructions only if they lack a route to the documentation. Do not copy the body into `AGENTS.md`. Create only needed files, not empty directory trees or template collections.

## 4. Verify and report

Reread changes and check paths, links, terminology, and status. Safely validate relevant changed commands or procedures. State limits when validation has external effects or cannot be performed. Update only status and links in historical records; do not rewrite them as today's facts.

Report updated knowledge, evidence sources, unresolved conflicts, and unverified items. No changes needed is a valid result. Do not write a summary document merely to produce an artifact, or independently publish, close tasks, or deploy.
