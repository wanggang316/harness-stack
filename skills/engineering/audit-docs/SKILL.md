---
name: audit-docs
description: Audit and maintain project knowledge within a defined scope for accuracy, discoverability, duplication, and lasting value.
disable-model-invocation: true
---

# audit-docs

Audit and repair documentation by default. Stay read-only when the user requests a report only. Change documentation and necessary navigation, not product code, tests, or development workflow instructions.

## 1. Bound the audit

Read project instructions and documentation entry points. Identify the requested module, directory, or topic. Without an explicit scope, start at the documentation entry point and its directly linked current knowledge, and state actual coverage. Report missing paths rather than expanding to the whole repository.

Distinguish current knowledge, decision records, and process history first. Historical context that differs from today's state is not inherently wrong. Check its identity, status, supersession links, and traceability.

## 2. Check evidence and value

For each current knowledge document, inspect relevant code entry points, contracts, configuration, tests, and decisions. Use primary sources for external facts and record the applicable version. Check:

- Whether current descriptions are accurate, including claims about implementation, deployment, or verification that has not occurred.
- Whether contracts conflict with implementation. Report a potential product defect or pending decision rather than changing the contract directly.
- Whether the same knowledge has multiple maintenance locations and whether active ADRs are identifiable.
- Whether a new reader can find relevant topics from the project entry point without replaying delivery history.
- Whether deleting a passage would still let readers recover the same understanding at low cost. Cross-module explanations, constraints, and decision rationale retain independent value.

Attach evidence to each finding. Without evidence, classify a claim as unverified, not wrong; do not delete it on that basis.

## 3. Apply bounded repairs

Assign each document `Keep`, `Update`, `Consolidate`, `Retire`, or `Unresolved`:

- `Keep`: still accurate, useful, and discoverable.
- `Update`: correct facts, status, or links where evidence supports it.
- `Consolidate`: retain valid content in the existing authoritative location, replace duplicates with links, and repair affected entry points.
- `Retire`: remove obsolete or fully replaced descriptions from current knowledge navigation; preserve necessary history or replacement pointers.
- `Unresolved`: evidence is insufficient or a product decision is required. Preserve the existing rule and report the issue.

Delete a whole document only when cleanup is authorized and it has no unique knowledge or historical value. Otherwise, preserve a replacement pointer and recommend deletion. Retain original context in ADRs and delivery records. Follow the project's directories instead of using an audit to reorganize everything.

## 4. Verify and report

Reread changed knowledge and entry points. Check relative links, paths, terminology, and supersession relationships. Safely validate relevant operating commands. Link checks do not prove runtime behavior.

Report each document's disposition, key evidence, actual changes, and unverified items. In read-only mode, label all repairs as recommendations. List unresolved conflicts that need user decisions and content outside the audit scope. Create no new document when there are no findings.
