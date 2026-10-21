---
name: skill-create
description: Write or revise harness-stack skills with guidance on instruction wording, context pointers, information structure, and behavioral validation.
metadata:
  credits:
    skill: writing-for-agents
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-for-agents/SKILL.md"
---

# skill-create

Write guidance that helps an executing agent make sound decisions across different inputs. This skill is a repository-local writing reference and is not distributed with the plugin.

## Start with responsibility and decisions

State the job, accepted inputs, and what counts as completion. Build the body around information that changes execution choices: conditions, actions, evidence, boundaries, and exceptions.

Use direct verbs. Explain why non-obvious rules exist and when they apply. Reasons help an agent transfer judgment to new situations instead of matching text mechanically. For example, "Derive expected values from the spec or an independent worked example, because copying the implementation algorithm can reproduce the same error" guides execution better than "Tests must be correct."

Prefer the target behavior. Pair necessary prohibitions with the safe action, such as staging only task-owned paths or hunks while preserving user changes. Avoid accumulating warnings about hypothetical shortcuts. For recurring failures, first consider whether types, tests, or tools can prevent them.

## Write context pointers that trigger reliably

A reference must identify the material and when to read it. A name alone or "see more" does not help the agent decide whether the material is needed now.

- Weak pointer: "See TDD."
- Explicit pointer: "When adding or fixing behavior, read `harness-stack:tdd` and use its test seams and red-green loop."

A description is also a pointer. Lead with the core capability, then list distinct trigger branches. Remove synonymous triggers for the same branch. Use the project's actual terms, symbols, and filenames. Keep one name per concept rather than inventing abbreviations that need explanation.

For autonomous use or calls from other skills, use model invocation and omit `disable-model-invocation`. For user-only invocation, set it to `true` and use a one-sentence purpose in the description. Invocation affects discoverability. Check host capabilities rather than assuming a hidden entry point remains callable by the model.

## Organize by when information is needed

Steps describe action order; reference material supports decisions. Not every skill needs a workflow. Keep universally required information in the entry point. Move branch-specific details into reference files with explicit reading conditions at the relevant branch.

Keep a concept's definition, rules, and exceptions together. Scattering them can expose a rule without its exception, while moving required material too far away can cause it to be missed. Improve pointers and grouping before deciding to inline material.

Let execution needs determine length. Long documents dilute attention and increase maintenance cost; overly short ones can omit decision criteria. Check whether each paragraph helps the current path make a decision. Retain shared rules, disclose branch-specific details on demand, and remove repetition or facts available through direct lookup. Use clear sentences with one judgment each.

Split into separate skills only when task boundaries, usage timing, or invocation differ meaningfully. Splitting also adds discovery and selection cost. A normal file reference does not clear context; separate files do not isolate later steps by themselves.

## Give checkable completion criteria

Use actual artifacts or observations to distinguish complete from incomplete. For example, "Each changed public entry point has a corresponding test result; state why any check could not run" is more precise than "Test thoroughly."

Completion criteria must cover the promised task and allow not-applicable, failed, and unknown results. A successful command proves only what it checks. No output, no execution, or an uncertain conclusion is not a pass.

Place criteria beside the relevant action or in a shared closing section, whichever is clearer.

## Reuse specialist skills

A skill owns its complete responsibility and may call other skills within it. For example, `implement` uses `harness-stack:tdd` for behavior changes without transferring ownership of the whole implementation task.

At each reference, state the trigger, what to read or execute, and how the result returns to the current task. Maintain one authoritative version of a shared method rather than copying a full tutorial into each caller. Reference only active, discoverable skills or valid files.

Self-contained means explicit goals, context, and completion criteria; it does not prohibit collaboration. Define missing-dependency behavior. Continue with a brief local method when it can meet the same standard. Otherwise, report the missing capability and affected step. An unavailable tool or skill has not been executed.

Distinguish method reuse from authorization for additional tasks. Invoking a testing method does not authorize pushing, publishing, or closing issues. Reuse existing conversation or host authorization without asking again.

## Prune and maintain

Keep each rule in one authoritative location. Let the agent inspect facts available directly from configuration, directories, or `--help`. Retain hard-to-discover conventions, reasons, and pitfalls.

Check each sentence: would deleting it change an execution decision? Resolve uncertainty by comparing actual tasks rather than debating wording. Delete obsolete or ineffective sentences in full instead of trimming words while preserving duplicate meaning. Use examples to explain easily misunderstood choices, not basic syntax the model already knows.

Write skill instructions, descriptions, references, and examples in clear English. Keep code, commands, and identifiers concise. Record adaptations in frontmatter `metadata.credits` with `skill`, `author`, and the original `url`; use a list for multiple sources and add `organisation` when applicable.

## Validate guidance through behavior

Choose natural tasks that expose important trade-offs. Observe what the agent reads, does, how it handles obstacles, and what it produces. Keep external actions within existing authorization and use isolated temporary directories to protect real projects.

When changing existing behavior, follow [Blind comparison of old and new versions](references/blind-comparison.md) using the same request for both versions. Fresh-context subagents may run each version with identical inputs and environments, without being told the expected answer. Judge actual actions and artifacts, not claims of compliance. Examples establish behavior only in those scenarios, not general improvement.

For systematic evaluation design, larger samples, or trigger optimization, use Anthropic's [skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) when appropriate.
