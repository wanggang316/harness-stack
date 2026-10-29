---
name: triage
description: Decide whether a new ticket is valid, ready to implement, a duplicate, or missing information; classify its type; and return a verdict with evidence. Use for a new or updated issue, bug report, or feature request before anyone works on it.
---

# triage

Judge one ticket before anyone works on it: is it valid, is it new, can an implementer start from it without asking, and what kind of work is it. Return a verdict with evidence. This skill reads the ticket, the repository, and other tickets; it never edits the ticket, the code, or the tracker.

## The caller's contract

A caller (a person, another skill, or an automation) may specify two things. Follow what it specifies, and use the default otherwise:

| What | Default |
| --- | --- |
| How to read the ticket and search other tickets | Whatever the user names, or the tools available for the tracker the ticket lives on |
| How to deliver the result | The final message in the conversation |

## 1. Read the ticket

Read the title, the full description, every comment, its labels, and the tickets it links to or is blocked by. Later comments can answer questions the description left open or change the request; the latest agreed version is what you judge. When the ticket cannot be read, stop and report that; do not judge from the title.

Note the ticket's language. Questions and reasons are written in it.

## 2. Check it against the repository

Work from the default branch of the repository the ticket belongs to.

- **Bug**: find the code path it describes. Check that the behavior is still there: it may already be fixed, or describe code that no longer exists. Reproduce it when that is cheap (an existing test, a single command); otherwise say what you read.
- **Change or feature**: find where it would go. Check that it does not already exist and does not contradict an active decision (an ADR, a documented out-of-scope list, an explicit non-goal).
- **Documents it relies on**: glossary entries, ADRs, and design notes the ticket refers to must be on the default branch. A link to an unmerged pull request or a local path means they are not.

Record each finding with where it came from (a file and symbol, a command and its output, a document).

## 3. Look for duplicates

Search open and closed tickets of the same repository for the same outcome, by the key terms of the title and the symptom or behavior. A ticket is a duplicate when another ticket asks for the same result, not merely the same area. Note the earlier ticket and whether it is open, done, or declined. A closed ticket that declined the same request is evidence for `wontfix` as well as `duplicate`.

## 4. Decide

Take the first verdict that applies:

| Verdict | When |
| --- | --- |
| `duplicate` | Another ticket asks for the same result |
| `invalid` | It is not a request for this repository: spam, a support question about another product, a bug that does not exist on the default branch, or a request already fully delivered |
| `wontfix` | It asks for something an active decision rules out. Cite the decision. Without one, the verdict is not `wontfix` |
| `needs-info` | An implementer would have to ask before starting: the expected behavior, the reproduction, the scope, or the acceptance criteria are missing or contradictory, and neither the code nor the documents settle them |
| `backlog` | It is valid and clear but not ready: it is a spec with sub-tickets to do first; it is too large for one change and should be split; or it relies on documents or a decision not yet on the default branch |
| `ready` | It is valid, new, and an implementer can start from it without asking |

Being blocked by other open tickets does not stop a ticket from being `ready`; the blockers decide when work starts, not whether the ticket is clear.

When the evidence is weak either way, prefer `needs-info` over closing: a question costs the author one reply, a wrongly closed ticket loses the request.

## 5. Classify

Give the ticket one type, unless the verdict is `invalid`:

| Type | When |
| --- | --- |
| `bug` | Existing behavior is wrong |
| `enhancement` | New behavior, or a change to behavior that works as designed |
| `documentation` | Only documents change |
| `question` | It asks how something works rather than for a change |

Add `help wanted` when the ticket is valid but needs a person's judgment or access the implementer will not have: a product decision, credentials, hardware, a third party.

## 6. Return the result

Return, in the ticket's language:

- **Verdict**: one of the six.
- **Labels**: the type, `help wanted` when it applies, and `duplicate`, `invalid`, or `wontfix` when that is the verdict.
- **Reasons**: the findings from steps 2–4 that decide the verdict, each with its source.
- **Questions**: for `needs-info`, each thing the author must answer, numbered, specific enough to answer in a sentence.
- **Duplicate of**: for `duplicate`, the earlier ticket.
- **Waiting on**: for `backlog`, what has to happen before the ticket is ready.

Deliver it the way the caller specified, otherwise as the final message in the conversation.
