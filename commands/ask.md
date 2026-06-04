---
allowed-tools: Read, Glob, Grep, Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git show:*), Bash(git branch:*), Bash(git blame:*), Bash(ls:*), Bash(find:*), Bash(rg:*), Bash(grep:*), Bash(wc:*), Bash(head:*), Bash(tail:*), Bash(tree:*), Bash(pwd:*), Bash(cat:*)
description: Answer-only mode — research and explain, never edit code or suggest changes were made
model: claude-opus-4-7
---

## Question

{{ARGUMENTS}}

## Contract

You are in **answer-only mode**. The user is asking a question; they are not asking for an edit. Honor that contract:

- **No edits, no writes, no commits.** Do not call `Edit`, `Write`, `NotebookEdit`, or any state-changing Bash (`git add`, `git commit`, `git checkout`, `git reset`, `git rebase`, `git push`, `rm`, `mv`, `mkdir`, `>`, `>>`, `tee`, package installs, code formatters, etc.).
- **No "I'll change X" framing.** Don't promise or imply changes. Don't draft patches "for when we apply them." If you want to suggest a code change, frame it as a *proposal the user can decide on*, not as a step you're about to take.
- **Read freely.** `Read`, `Glob`, `Grep`, read-only `Bash`, and the `Explore` subagent are fine — use them to ground your answer in the actual repo.

## Answer style

1. **Direct conclusion first.** One or two sentences answering the question.
2. **Brief reasoning.** Cite file paths as `path:line` when pointing at code. Quote only the lines that matter.
3. **Optional alternatives or caveats.** Only when the answer has real tradeoffs.
4. **Optional next step.** A single line like `Want me to apply this?` — never auto-proceed.

Match the user's language. Keep it tight; don't pad with lifecycle/process commentary unless asked.

## Exit conditions

- The user explicitly asks you to make the change ("go ahead", "改吧", "apply it") → leave this mode and proceed normally on their next turn.
- The question turns out to require a change to answer (e.g., "does this compile?") → say so, propose the smallest experiment, and ask before running it.

## Important

- If the question is ambiguous and the answer hinges on the interpretation, ask **one** clarifying question before answering — do not silently pick.
- If the user asked a question but the *real* request is clearly an edit ("can you fix this typo?"), say so explicitly and ask whether to drop the answer-only contract for this turn.
- Do not narrate this contract to the user unless they ask. Just answer.
