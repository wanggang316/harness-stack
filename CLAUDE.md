# CLAUDE.md

harness-stack is an agent-first development framework implementing the
[harness methodology](https://openai.com/index/harness-engineering/). Humans
provide direction; agents execute.

> **The canonical navigation map is [AGENTS.md](AGENTS.md).** This file only
> covers Claude-Code-specific glue. Update content in `AGENTS.md`; keep this
> file thin.

## Session bootstrap

`.claude/hooks/hooks.json` runs a `SessionStart` hook that prints
[AGENTS.md](AGENTS.md) into context automatically, so the full skill/agent
map is available at the start of every session.

## Available slash commands

Wired up in `.claude/commands/`. Each one is a thin wrapper that loads the
matching skill under `skills/`:

| Command | Skill | Purpose |
|---------|-------|---------|
| `/h-init`   | `skills/meta/init`       | Initialize harness-stack in a project |
| `/h-check`  | `skills/meta/check`      | Validate structure and docs |
| `/h-score`  | `skills/meta/score`      | Generate quality scorecard |
| `/h-spec`   | `skills/01-define/spec`  | Spec-driven development |
| `/h-plan`   | `skills/02-plan/plan`    | Planning and task breakdown |
| `/h-build`  | `skills/03-build/build`  | Incremental implementation |
| `/h-review` | `skills/05-review/review`| Code review and quality |
| `/h-ship`   | `skills/06-ship/ship`    | Shipping and launch |

Additional skills exist under `skills/` (`h-requirements`, `h-architecture`,
`h-tdd`, `h-debug`, `h-security`, `h-git`, `h-skill-create`) and can be
invoked by name via the Skill tool even without a dedicated slash command.

## Subagents

When a task needs expert judgment, delegate to one of the personas in
`agents/`:

- **`h-architect`** (`agents/architect.md`) — system design, technical decisions
- **`h-code-reviewer`** (`agents/code-reviewer.md`) — PR review, quality checks
- **`h-test-engineer`** (`agents/test-engineer.md`) — test strategy, coverage

## Repo layout

```
AGENTS.md          # Canonical 100-150 line navigation map (READ FIRST)
ARCHITECTURE.md    # System design and pillars
README.md          # Public-facing intro
skills/            # 14 skills across meta + 6 lifecycle phases
agents/            # 3 specialized subagents
docs/              # Golden rules, index, reference checklists
.claude/
  commands/        # Slash-command wrappers for each skill
  hooks/hooks.json # SessionStart hook loads AGENTS.md
```

## Conventions to follow

- **`h-` prefix** — all skills and agents are prefixed to avoid collisions
  with a user's own skills when harness-stack is dropped into their repo.
- **Progressive disclosure** — `AGENTS.md` stays ~100-150 lines. Deep detail
  lives in individual `SKILL.md` files, loaded on demand.
- **Evidence-based verification** — skills demand concrete proof (test output,
  build success, metrics) before marking a step complete. Don't assert; show.
- **Anti-rationalization** — every skill has a table of common excuses for
  skipping steps, paired with rebuttals. Read them before deviating.
- **Platform-agnostic** — skills must not hardcode framework commands. Read
  config (package.json, pyproject.toml, etc.) or ask the user once.

See [docs/golden-rules.md](docs/golden-rules.md) for the full list.

## Where to start

1. Read [AGENTS.md](AGENTS.md) for the full skill/agent index.
2. For framework internals, read [ARCHITECTURE.md](ARCHITECTURE.md).
3. For a specific skill, open its `SKILL.md` under `skills/<phase>/<name>/`.
