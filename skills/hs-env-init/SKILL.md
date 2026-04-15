---
name: hs-env-init
description: Initialize per-worktree isolated runtime environments for parallel development. Use when creating a new worktree, when dev servers conflict on ports or databases, or when setting up a project for multi-worktree parallel development.
---

# hs-env-init: Worktree Isolated Environment

## Overview

Generates isolated runtime environments for each git worktree, enabling multiple worktrees to run simultaneously on one machine without port, database, or process conflicts.

Inspired by OpenAI's **per-worktree booting** pattern: each worktree owns its application instances, logs, and state; everything is torn down cleanly when the worktree is removed.

## When to Use

**Use when**:
- Creating a new worktree that needs to run dev servers
- Port conflicts occur between parallel worktrees
- Setting up a project for multi-worktree development for the first time
- A new developer needs multiple branches running simultaneously

**Don't use when**:
- Single-worktree projects that never run in parallel
- Pure library projects with no runtime services
- CI environments (inherently isolated per job)

## Process

### Step 1: Detect Project Structure

Scan the project to understand its service topology:

```
Project Root
    │
    ├── package.json / pnpm-workspace.yaml → Monorepo?
    │     ├── Yes → Scan each package for services and ports
    │     └── No  → Single-package: collect service ports
    │
    ├── docker-compose.yml → Containerized services?
    ├── .env / .env.example → Existing env patterns?
    └── Procfile / turbo.json → Process definitions?
```

**Collect a service inventory**:

| Service | Default Port | Source |
|---------|-------------|--------|
| Web | 3000 | package.json "dev" script |
| API | 4000 | apps/api/package.json |
| Worker | 5000 | apps/worker/package.json |
| Database | 5432 | docker-compose.yml |
| Redis | 6379 | docker-compose.yml |

Present the inventory to the user for confirmation before proceeding.

### Step 2: User Decision -- Database Strategy

**STOP. Present both options and let the user choose.**

Read `references/database-strategy.md` for full comparison, then present:

> **Database isolation strategy for this project:**
>
> **Option A: Multi-database** -- Same DB server, per-worktree database name (`app_main`, `app_feature_x`).
> Best for: projects that use Postgres/MySQL in production.
>
> **Option B: Embedded database** -- Per-worktree SQLite/DuckDB file inside `.worktree-runtime/`.
> Best for: projects where DB-specific features are not required in development.
>
> Which option fits this project?

Record the choice in `state.json` for future reference.

### Step 3: Generate .env.template

Create `.env.template` at the project root (committed to git). This is the single source of truth for environment variables.

**Key principle**: All ports are expressions of `PORT_OFFSET`, all database names include `WORKTREE_ID`. No hardcoded values.

For **monorepo** projects, the root `.env.template` defines all ports centrally:

```sh
# --- Worktree Identity (auto-generated, do not edit) ---
WORKTREE_ID=${WORKTREE_ID:-main}
PORT_OFFSET=${PORT_OFFSET:-0}

# --- Service Ports (base + offset) ---
WEB_PORT=$((3000 + PORT_OFFSET))
API_PORT=$((4000 + PORT_OFFSET))
WORKER_PORT=$((5000 + PORT_OFFSET))
DB_PORT=$((5432 + PORT_OFFSET))
REDIS_PORT=$((6379 + PORT_OFFSET))

# --- Cross-Service References (use variables, never hardcode) ---
API_URL=http://localhost:${API_PORT}
DATABASE_URL=postgresql://localhost:${DB_PORT}/app_${WORKTREE_ID}
REDIS_URL=redis://localhost:${REDIS_PORT}/0

# --- Secrets (copied from source worktree, not templated) ---
# ANTHROPIC_API_KEY=
# STRIPE_SECRET_KEY=
```

Each monorepo package reads from the root `.env` or receives its portion via the dev script.

Read `references/port-strategy.md` for offset algorithm details and monorepo patterns.

### Step 4: Generate Runtime Scripts

Create four scripts under `scripts/`:

| Script | Purpose |
|--------|---------|
| `scripts/env-init` | Initialize: derive worktree ID, compute port offset, generate `.env`, install dependencies, create database |
| `scripts/env-start` | Start all services, record PIDs, route logs to `.worktree-runtime/logs/` |
| `scripts/env-stop` | Graceful shutdown: SIGTERM -> wait -> SIGKILL, verify process exit, clean PID files |
| `scripts/env-teardown` | Full cleanup: stop + drop database + remove containers + clean `.worktree-runtime/` |

All scripts are POSIX sh for portability. Make them executable (`chmod +x`).

Read `references/runtime-lifecycle.md` for script templates and the process lifecycle state machine.

### Step 5: Create Runtime Directory

Set up `.worktree-runtime/` (gitignored) as the runtime state root:

```
.worktree-runtime/
  worktree.id          # Plain text: worktree identifier
  ports.json           # Actual allocated ports: {"web": 3270, "api": 4270, ...}
  state.json           # Environment state and user decisions
  pids/
    web.pid            # PID files for each service
    api.pid
    worker.pid
  logs/
    web.log            # Per-service log files
    api.log
    worker.log
```

Update `.gitignore` to include:
```
.worktree-runtime/
.worktree-id
.env
.env.local
.env.*.local
```

### Step 6: Verify

```bash
# Environment generated
cat .worktree-runtime/worktree.id && cat .worktree-runtime/ports.json

# Start, verify PIDs and logs, then stop cleanly
./scripts/env-start
ls .worktree-runtime/pids/ .worktree-runtime/logs/
./scripts/env-stop
ls .worktree-runtime/pids/   # Should be empty after stop
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just change the port manually when there's a conflict" | You'll forget. The next agent won't know your ports. Automate it once in `.env.template`. |
| "We only ever run one worktree at a time" | Until you don't. env-init costs 5 minutes; debugging a port conflict costs 30. |
| "Docker already isolates everything" | Docker isolates containers, not host-mapped ports. Two compose stacks with `ports: 3000:3000` still conflict on the host. |
| "I'll share the database across worktrees" | Until branch A's migration drops a column that branch B depends on. Per-worktree databases are cheap insurance. |
| "Tracking PIDs is overkill" | Without PIDs you can't stop cleanly. Orphaned dev servers eat memory and hold ports. PIDs make the lifecycle closeable. |

## Red Flags

- Hardcoded port numbers in source code (not reading from env variables)
- `.env` committed to git
- No `.env.template` in a project with multiple services
- Dev servers started without PID tracking
- No `env-stop` script -- services only killed by closing terminal
- Docker Compose without `COMPOSE_PROJECT_NAME` variable
- Database URL without worktree-specific database name
- Logs written to shared locations instead of `.worktree-runtime/logs/`

## Verification

- [ ] `.env.template` exists and is committed to git
- [ ] `.env` and `.worktree-runtime/` are in `.gitignore`
- [ ] `scripts/env-init` exists and is executable
- [ ] `scripts/env-start` exists and records PIDs to `.worktree-runtime/pids/`
- [ ] `scripts/env-stop` exists and reads PIDs for graceful shutdown
- [ ] `scripts/env-teardown` exists for full cleanup
- [ ] `.worktree-runtime/` contains ports.json and state.json
- [ ] All services start on unique ports (no conflicts with sibling worktrees)
- [ ] `env-stop` leaves no orphaned processes
