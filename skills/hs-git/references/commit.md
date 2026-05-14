# Commit Reference

Operational depth for creating one well-formed commit. The slash command `/hs-commit` is the haiku-driven entry point that follows these rules; this file is the longer-form reference.

## Conventional Format

```
<type>: <short imperative description>

<optional body — explain why, not what>
```

**Types:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `chore`.

**Subject:**

- ≤ 72 characters
- Imperative mood (`Add validation`, not `Added` / `Adding`)
- No trailing period
- Standalone — should make sense in `git log --oneline` without the body

**Body (when intent isn't obvious from the diff):**

- Wrap at 72 characters
- State the why, decisions, trade-offs
- Link bug numbers, benchmark results, design docs where relevant
- Acknowledge known shortcomings

## Examples

```
# Good — explains intent
feat: add email validation to registration endpoint

Prevents invalid email formats from reaching the database.
Uses Zod schema at the route handler level, consistent with
existing validation patterns in auth.ts.

# Bad — describes what the diff already shows
update auth.ts
```

## Anti-Patterns

| Don't | Why |
|---|---|
| `fix bug`, `update X`, `misc` | Doesn't survive outside the moment it was written. |
| `Phase 1`, `WIP`, `Slice 2` | Planning references rot; describe the change itself. |
| `Moving code from A to B` | The diff already shows the move; explain why it moved. |
| `Add convenience functions` | Vague — name the convenience. |

## No Attribution Lines

Never append `Co-Authored-By:` trailers, `Generated with ...` banners, or any model/tool identifier. Authorship is in git's `Author` / `Committer` fields; the body describes the change, not the tool. Strip such lines if tooling injects them.

## Atomic — Splitting Strategies

If the working diff mixes unrelated concerns, split before committing.

| Strategy | How | When |
|---|---|---|
| **Stack** | Submit a small change, base the next on it | Sequential dependencies |
| **By file group** | Separate commits for groups needing different reviewers | Cross-cutting concerns |
| **Horizontal** | Shared code / stubs first, consumers after | Layered architecture |
| **Vertical** | Smaller full-stack slices of the feature | Feature work |

Practical split:

```bash
git restore --staged .
git add src/lib/validation.ts
git commit -m "refactor: extract validation utility"

git add src/routes/tasks.ts
git commit -m "feat: validate task creation input"
```

## Size Thresholds

| Diff size | Action |
|---|---|
| ≤ ~100 lines | Good. Reviewable in one sitting. |
| ~100–300 lines | Acceptable for one logical change with tests. |
| ~300–800 lines | Justify in the body; split if it spans concerns. |
| > ~1000 lines | Too large. Split. |

Exceptions: complete deletions, automated codemods, lockfile updates — where the reviewer verifies intent rather than every line. Call these out explicitly.

## Pre-Commit Hygiene

```bash
# Inspect what's about to commit
git diff --staged

# Secret scan
git diff --staged | grep -iE "password|secret|api_key|token|BEGIN [A-Z]+ PRIVATE KEY"

# Project gates
npx tsc --noEmit
npm run lint
npm test
```

Automate via `husky` + `lint-staged` where the project supports it.

## Stray File Sanity Check

After `git add`, before committing, scan newly tracked files for accidents:

- Build artifacts (`dist/`, `.next/`, `build/`)
- Logs (`*.log`, `npm-debug.log`)
- Editor crud (`.DS_Store`, `*.swp`, `Thumbs.db`)
- Env files (`.env`, `.env.local`)
- Large binaries the repo doesn't normally track

If something looks accidental, `git restore --staged <path>` and (where appropriate) add the pattern to `.gitignore`.

## Message Formatting

For non-trivial bodies, write the message via here-doc and commit with `-F`, not `-m` with literal `\n`:

```bash
git commit -F - <<'EOF'
feat: add email validation to registration endpoint

Prevents invalid email formats from reaching the database.
EOF
```

`git commit -m "...\n..."` produces a single-line message in many shells. Avoid it.

## Failure Handling

- Pre-commit hook failed → fix the underlying issue and create a **new** commit. Never `--amend` to hide a hook failure.
- Don't `--no-verify` to bypass hooks unless the user explicitly asks.
- Sensitive file already committed → don't `--force` it away. Stop and ask; secret rotation may be needed regardless.

## Verification

- [ ] One logical change
- [ ] Conventional type, imperative subject, ≤ 72 chars
- [ ] Body explains why (when non-trivial)
- [ ] No secrets in staged diff
- [ ] No attribution trailers
- [ ] No stray artifacts staged
