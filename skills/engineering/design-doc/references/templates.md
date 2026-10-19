# Templates

## 001-action.md

```markdown
# NNN — <Title>: Action Log

## Timeline
| Date | Change | Ref |
| --- | --- | --- |

## Outcome & current state (as of YYYY-MM-DD)
What exists in code now; key files and types with repo-relative paths.

## Deviations from plan
Where reality diverged from 000-plan.md, or "None known."

## Open questions
Unverified claims and oddities worth revisiting, or "None."
```

## Amendment（002 起）

```markdown
# NNN.00M — <Topic>

## Context
Why this follow-up happened.

## Change
What was done.

## Refs
PR #x
```

一个 plan 分多个 PR 交付时，每个切片在自己的 PR 里加一份 amendment（从 `002` 开始）；`001-action.md` 在最后一个切片合并时写一次，汇总所有切片。

---

Plan and action-log structure adapted from the `write-ai-doc` skill in [onevcat/Prowl](https://github.com/onevcat/Prowl).
