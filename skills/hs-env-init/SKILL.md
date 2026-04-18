---
name: hs-env-init
description: Initialize per-worktree isolated runtime environments for parallel development. Use when creating a new worktree, when dev servers conflict on ports or databases, or when setting up a project for multi-worktree parallel development.
---

# hs-env-init: Worktree Isolated Environment

## Overview

Generates isolated runtime environments for each git worktree, enabling multiple worktrees to run simultaneously without port, database, or process conflicts.

**Non-invasive by design**: Works with the project's existing `.env` / `.env.example` files. Detects port variables, injects per-worktree values -- does not impose a new config schema.

Inspired by OpenAI's **per-worktree booting** pattern: each worktree owns its application instances, logs, and state; everything is torn down cleanly when the worktree is removed.

## When to Use

**Use when**:
- Creating a new worktree that needs to run dev servers
- Port conflicts occur between parallel worktrees
- Setting up a project for multi-worktree development for the first time

**Don't use when**:
- Single-worktree projects that never run in parallel
- Pure library projects with no runtime services
- CI environments (inherently isolated per job)

## Guiding Principles

1. **Respect the project's existing config** -- use `.env` / `.env.example` where present; do not introduce new schemas
2. **Monorepo awareness** -- each package may have its own `.env.example`; handle them independently but with shared port offset
3. **Source-code changes are user decisions** -- if ports are hardcoded, suggest refactoring; do not force it
4. **Minimal footprint** -- add only `scripts/env-*` and `.worktree-runtime/`; everything else reuses existing conventions

## Process

### Step 1: Discover Existing Env Files

Find all env-related files in the project:

```bash
# Root level
ls .env .env.example .env.local 2>/dev/null

# Monorepo: per-package
find . -name ".env.example" -not -path "./node_modules/*" -not -path "./.git/*"
find . -name ".env" -not -path "./node_modules/*" -not -path "./.git/*"
```

Build an inventory of env files to be managed:

| Path | Type | Notes |
|------|------|-------|
| `./.env.example` | Committed template | Source of truth at root |
| `./apps/web/.env.example` | Package template | Next.js app |
| `./apps/api/.env.example` | Package template | API server |

### Step 2: Analyze Port Variables

For each env file, identify port-related variables:

```bash
grep -E '^(PORT|[A-Z_]+_PORT|[A-Z_]+PORT)=' .env.example
```

Categorize each variable:

| Category | Example | Action |
|----------|---------|--------|
| **Already parameterized** | `PORT=${PORT:-3000}` in env, `process.env.PORT` in code | Inject value, no refactor |
| **Fixed default in env** | `PORT=3000` in env, `process.env.PORT` in code | Override in generated `.env` |
| **Hardcoded in source** | `3000` appears in source; not in env | Surface to user, suggest refactor |

**Also check for port-bearing URLs**:
- `DATABASE_URL=postgresql://localhost:5432/...`
- `REDIS_URL=redis://localhost:6379`
- `API_URL=http://localhost:4000`

These need port substitution too.

### Step 3: Surface Hardcoded Ports (if any)

If Step 2 found hardcoded ports in source code, **STOP and ask the user**:

> The following ports are hardcoded in source code and cannot be isolated without refactoring:
>
> - `apps/web/next.config.js:23` -- hardcoded port `3000`
> - `apps/api/src/server.ts:15` -- hardcoded port `4000`
>
> **Option A**: Refactor to read from env var (`process.env.PORT`). Recommended -- enables worktree isolation.
>
> **Option B**: Skip these services in env-init. Only worktree-isolate the services with env-driven ports.
>
> **Option C**: Cancel -- I'll refactor manually first.
>
> Which option?

Record the decision; do not silently refactor production code.

### Step 4: User Decision -- Database Strategy

Present database isolation options and let the user choose. Read `references/database-strategy.md` for full comparison.

> **Database isolation strategy for this project:**
>
> **Option A: Multi-database** -- Same DB server, per-worktree database name.
> **Option B: Embedded database** -- Per-worktree SQLite/DuckDB file.
>
> Which fits this project?

Record the choice in `.worktree-runtime/state.json`.

### Step 5: Generate Runtime Scripts

Create five scripts under `scripts/`:

| Script | Responsibility |
|--------|----------------|
| `scripts/worktree-start.sh` | **Entry point for new worktrees**. Copies gitignored files from the main worktree per `.worktreeinclude`, then invokes `env-init`. Idempotent -- safe to call manually or from a git hook. |
| `scripts/env-init` | Derive worktree ID, compute port offset, **write computed ports into existing `.env` files** (copying from `.env.example` if `.env` is missing), create/provision database |
| `scripts/env-start` | Start all services, record PIDs in `.worktree-runtime/pids/`, route logs to `.worktree-runtime/logs/` |
| `scripts/env-stop` | SIGTERM -> wait -> SIGKILL, verify exit, clean PID files |
| `scripts/env-teardown` | `env-stop` + drop database + remove containers + clean `.worktree-runtime/` |

**Key behavior of `env-init`**: it does NOT replace `.env.example`. It copies the existing `.env.example` to `.env` (if `.env` is missing), then overwrites only the port-related variables and database URL with worktree-specific values. If `.env` already exists, it patches in place, preserving unrelated variables (especially secrets).

**Key behavior of `worktree-start.sh`**: it locates the main worktree via `git worktree list --porcelain`, reads `.worktreeinclude`, and copies matching gitignored files (e.g. `.env.local`, certificates) into the current worktree without overwriting existing files. It then delegates to `env-init`. This is the single entry point for bootstrapping a fresh worktree.

All scripts are POSIX sh. Make them executable (`chmod +x`).

Read `references/runtime-lifecycle.md` for script templates and the port injection algorithm.

### Step 6: Generate `.worktreeinclude` and Git Hook

Set up two files that let fresh worktrees bootstrap automatically.

**`.worktreeinclude`** (repo root, committed): lists gitignored files that must be copied into new worktrees. Uses `.gitignore` syntax. Only files that match a pattern **and** are gitignored get copied, so tracked files are never duplicated.

Seed it from the project's existing `.gitignore` entries that typically carry local config (`.env`, `.env.local`, credentials, certificates). Present the generated list to the user for review.

```text .worktreeinclude
.env
.env.local
config/secrets.json
```

**`.githooks/post-checkout`** (repo root, committed, executable): thin wrapper that invokes `scripts/worktree-start.sh` on fresh worktree creation. Git's `post-checkout` hook fires on both `git checkout <branch>` and `git worktree add`; the wrapper uses `.worktree-runtime/state.json` as a sentinel so it only runs on a fresh worktree and is a no-op on subsequent branch switches.

**Tell the user** to run this once per clone to activate the hook (Git stores `core.hooksPath` in local config, which is not versioned):

```bash
git config core.hooksPath .githooks
```

If the user's worktree creation tool bypasses git hooks, they can still invoke `./scripts/worktree-start.sh` manually after creating the worktree.

Read `references/runtime-lifecycle.md` for the hook and `worktree-start.sh` templates.

### Step 7: Create Runtime Directory

Set up `.worktree-runtime/` (gitignored) for runtime state:

```
.worktree-runtime/
  worktree.id          # Worktree identifier
  ports.json           # Actual allocated ports per service
  state.json           # Lifecycle state + user decisions
  pids/                # PID files, one per service
  logs/                # Log files, one per service
  data/                # (Optional) embedded DB files
```

Append to `.gitignore` if not already present:
```
.worktree-runtime/
.env
.env.local
.env.*.local
```

### Step 8: Verify

```bash
# Activate the hook once (if not already done)
git config core.hooksPath .githooks

# Run the unified entry point (idempotent)
./scripts/worktree-start.sh

# Or run env-init directly
./scripts/env-init
# Inspect what was written
cat .env                                  # Port variables should have worktree-specific values
cat .worktree-runtime/ports.json          # Allocated ports
cat .worktree-runtime/state.json          # DB strategy and state

./scripts/env-start
ls .worktree-runtime/pids/ .worktree-runtime/logs/

./scripts/env-stop
ls .worktree-runtime/pids/   # Should be empty after stop
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just change the port manually when there's a conflict" | You'll forget. The next agent won't know your ports. Automate it once. |
| "We only ever run one worktree at a time" | Until you don't. env-init costs 5 minutes; debugging a port conflict costs 30. |
| "Docker already isolates everything" | Docker isolates containers, not host-mapped ports. Two compose stacks with `ports: 3000:3000` still conflict on the host. |
| "I'll share the database across worktrees" | Until branch A's migration drops a column that branch B depends on. Per-worktree databases are cheap insurance. |
| "Tracking PIDs is overkill" | Without PIDs you can't stop cleanly. Orphaned dev servers eat memory and hold ports. |
| "Let's just add .env.template to replace .env.example" | Don't. The project already has conventions. Work with them. |

## Red Flags

- Hardcoded port numbers in source code (not reading from env)
- `.env` committed to git
- Dev servers started without PID tracking
- No `env-stop` script -- services only killed by closing terminal
- Database URL without worktree-specific database name
- Logs written to shared locations instead of `.worktree-runtime/logs/`
- Introducing a new env schema when the project already has `.env.example`

## Verification

- [ ] All existing `.env.example` files are preserved (not replaced)
- [ ] `.env` files contain computed worktree-specific port values
- [ ] `.env` and `.worktree-runtime/` are in `.gitignore`
- [ ] `scripts/worktree-start.sh`, `env-init`, `env-start`, `env-stop`, `env-teardown` exist and are executable
- [ ] `.worktreeinclude` exists at repo root and lists gitignored files to propagate
- [ ] `.githooks/post-checkout` exists, is executable, and delegates to `scripts/worktree-start.sh`
- [ ] User was told to run `git config core.hooksPath .githooks` once per clone
- [ ] `.worktree-runtime/` contains ports.json and state.json
- [ ] All services start on unique ports (no conflicts with sibling worktrees)
- [ ] `env-stop` leaves no orphaned processes
- [ ] User was asked about hardcoded ports (if any were found)
- [ ] User chose database strategy explicitly
