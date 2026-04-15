# Runtime Lifecycle Management

## Overview

The runtime lifecycle ensures every worktree's processes can be started, tracked, stopped, and cleaned up without leaving orphans. The lifecycle is a state machine with four states:

```
uninitialized → initialized → started → stopped
                     ↑                      │
                     └──────────────────────┘
                        (can restart)
```

State is tracked in `.worktree-runtime/state.json`.

## Directory Structure

```
.worktree-runtime/
  worktree.id          # Plain text worktree identifier
  ports.json           # Allocated port mapping
  state.json           # Current lifecycle state + decisions
  pids/
    {service}.pid      # One PID file per service
  logs/
    {service}.log      # One log file per service
  data/                # Embedded database files (if Option B)
```

## state.json Schema

```json
{
  "worktree_id": "env-init",
  "state": "started",
  "db_strategy": "multi-db",
  "initialized_at": "2026-04-15T10:30:00Z",
  "started_at": "2026-04-15T10:31:00Z",
  "services": ["web", "api", "worker", "db", "redis"]
}
```

---

## scripts/env-init

Initializes the environment. Idempotent -- safe to run multiple times.

```sh
#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
RUNTIME_DIR="$ROOT_DIR/.worktree-runtime"

# --- Step 1: Derive worktree identity ---
GIT_COMMON=$(git -C "$ROOT_DIR" rev-parse --git-common-dir 2>/dev/null || echo ".git")
if [ "$GIT_COMMON" = ".git" ]; then
  WORKTREE_ID="main"
else
  WORKTREE_ID=$(basename "$ROOT_DIR")
fi

# --- Step 2: Compute port offset ---
if [ "$WORKTREE_ID" = "main" ]; then
  PORT_OFFSET=0
else
  HASH=$(printf '%s' "$WORKTREE_ID" | cksum | cut -d' ' -f1)
  PORT_OFFSET=$(( (HASH % 900 + 1) * 10 ))
fi

# --- Step 3: Create runtime directory ---
mkdir -p "$RUNTIME_DIR/pids" "$RUNTIME_DIR/logs" "$RUNTIME_DIR/data"
printf '%s\n' "$WORKTREE_ID" > "$RUNTIME_DIR/worktree.id"

# --- Step 4: Generate .env from template ---
if [ -f "$ROOT_DIR/.env.template" ]; then
  export WORKTREE_ID PORT_OFFSET
  # Resolve template variables and write .env
  envsubst < "$ROOT_DIR/.env.template" > "$ROOT_DIR/.env"
fi

# --- Step 5: Write ports.json ---
# (Project-specific: compute actual ports and write JSON)

# --- Step 6: Install dependencies ---
if [ -f "$ROOT_DIR/package.json" ]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install --dir "$ROOT_DIR"
  elif command -v npm >/dev/null 2>&1; then
    npm install --prefix "$ROOT_DIR"
  fi
fi

# --- Step 7: Create database (project-specific) ---
# See database-strategy.md for implementation

# --- Step 8: Update state ---
cat > "$RUNTIME_DIR/state.json" <<STATEEOF
{
  "worktree_id": "$WORKTREE_ID",
  "state": "initialized",
  "initialized_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
STATEEOF

printf 'Environment initialized: worktree=%s offset=%d\n' "$WORKTREE_ID" "$PORT_OFFSET"
```

---

## scripts/env-start

Starts all services with PID tracking and log routing.

```sh
#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
RUNTIME_DIR="$ROOT_DIR/.worktree-runtime"
PIDS_DIR="$RUNTIME_DIR/pids"
LOGS_DIR="$RUNTIME_DIR/logs"

# --- Guard: check initialized ---
if [ ! -f "$RUNTIME_DIR/state.json" ]; then
  echo "Error: environment not initialized. Run scripts/env-init first." >&2
  exit 1
fi

# --- Guard: check for stale PIDs ---
check_and_clean_stale_pid() {
  service="$1"
  pid_file="$PIDS_DIR/${service}.pid"
  if [ -f "$pid_file" ]; then
    old_pid=$(cat "$pid_file")
    if kill -0 "$old_pid" 2>/dev/null; then
      printf 'Service %s already running (PID %s). Skipping.\n' "$service" "$old_pid"
      return 1
    else
      # Stale PID file, clean it up
      rm -f "$pid_file"
    fi
  fi
  return 0
}

# --- Start a service ---
start_service() {
  service="$1"
  command="$2"
  
  if ! check_and_clean_stale_pid "$service"; then
    return 0
  fi

  printf 'Starting %s...\n' "$service"
  
  # Start in background, redirect output to log file
  $command >> "$LOGS_DIR/${service}.log" 2>&1 &
  pid=$!
  
  # Record PID
  printf '%s\n' "$pid" > "$PIDS_DIR/${service}.pid"
  printf 'Started %s (PID %s), log: %s\n' "$service" "$pid" "$LOGS_DIR/${service}.log"
}

# --- Project-specific service definitions ---
# Adapt these to your project. Examples:

# Load environment
set -a
[ -f "$ROOT_DIR/.env" ] && . "$ROOT_DIR/.env"
set +a

# start_service "db" "docker compose -f $ROOT_DIR/docker-compose.yml up db"
# start_service "redis" "docker compose -f $ROOT_DIR/docker-compose.yml up redis"
# start_service "api" "node $ROOT_DIR/apps/api/dist/index.js"
# start_service "web" "npx next dev -p $WEB_PORT"

# --- Update state ---
# Update state.json to "started"
```

---

## scripts/env-stop

Graceful shutdown with zombie prevention.

```sh
#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
RUNTIME_DIR="$ROOT_DIR/.worktree-runtime"
PIDS_DIR="$RUNTIME_DIR/pids"

TIMEOUT=10  # Seconds to wait before SIGKILL

# --- Stop a service ---
stop_service() {
  service="$1"
  pid_file="$PIDS_DIR/${service}.pid"
  
  if [ ! -f "$pid_file" ]; then
    return 0
  fi
  
  pid=$(cat "$pid_file")
  
  # Check if process is actually running
  if ! kill -0 "$pid" 2>/dev/null; then
    printf '%s (PID %s) already stopped. Cleaning PID file.\n' "$service" "$pid"
    rm -f "$pid_file"
    return 0
  fi
  
  # Step 1: SIGTERM (graceful)
  printf 'Stopping %s (PID %s)...\n' "$service" "$pid"
  kill "$pid" 2>/dev/null || true
  
  # Step 2: Wait for exit
  elapsed=0
  while kill -0 "$pid" 2>/dev/null && [ "$elapsed" -lt "$TIMEOUT" ]; do
    sleep 1
    elapsed=$((elapsed + 1))
  done
  
  # Step 3: SIGKILL if still alive
  if kill -0 "$pid" 2>/dev/null; then
    printf '%s did not stop after %ds. Sending SIGKILL.\n' "$service" "$TIMEOUT"
    kill -9 "$pid" 2>/dev/null || true
    sleep 1
  fi
  
  # Step 4: Verify death
  if kill -0 "$pid" 2>/dev/null; then
    printf 'WARNING: %s (PID %s) could not be killed.\n' "$service" "$pid" >&2
  else
    printf '%s stopped.\n' "$service"
  fi
  
  # Step 5: Clean PID file
  rm -f "$pid_file"
}

# --- Stop all services in reverse order ---
# Stop in reverse dependency order: web → worker → api → redis → db

for pid_file in "$PIDS_DIR"/*.pid; do
  [ -f "$pid_file" ] || continue
  service=$(basename "$pid_file" .pid)
  stop_service "$service"
done

# --- Update state ---
# Update state.json to "stopped"

printf 'All services stopped.\n'
```

---

## scripts/env-teardown

Full cleanup -- removes all traces of this worktree's environment.

```sh
#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
RUNTIME_DIR="$ROOT_DIR/.worktree-runtime"

# Step 1: Stop all services
if [ -x "$ROOT_DIR/scripts/env-stop" ]; then
  "$ROOT_DIR/scripts/env-stop"
fi

# Step 2: Drop database (if multi-db strategy)
if [ -f "$RUNTIME_DIR/state.json" ]; then
  WORKTREE_ID=$(cat "$RUNTIME_DIR/worktree.id" 2>/dev/null || echo "unknown")
  DB_NAME="app_$(echo "$WORKTREE_ID" | tr '-' '_')"
  
  # Postgres
  dropdb "$DB_NAME" 2>/dev/null || true
  
  # MySQL
  # mysql -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;" 2>/dev/null || true
fi

# Step 3: Remove Docker containers (if applicable)
if [ -f "$ROOT_DIR/docker-compose.yml" ]; then
  COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-app-$WORKTREE_ID}" \
    docker compose -f "$ROOT_DIR/docker-compose.yml" down -v 2>/dev/null || true
fi

# Step 4: Clean runtime directory
rm -rf "$RUNTIME_DIR"

# Step 5: Clean generated .env
rm -f "$ROOT_DIR/.env" "$ROOT_DIR/.env.local"

printf 'Environment torn down for worktree: %s\n' "$WORKTREE_ID"
```

---

## Log Management

### Per-Service Logs

Each service writes to its own log file under `.worktree-runtime/logs/`:

```
.worktree-runtime/logs/
  web.log
  api.log
  worker.log
  db.log
```

### Viewing Logs

```sh
# Follow one service
tail -f .worktree-runtime/logs/api.log

# Follow all services (merged, with prefix)
tail -f .worktree-runtime/logs/*.log

# With service name prefix (requires multitail or similar)
# Or use a simple script:
for f in .worktree-runtime/logs/*.log; do
  service=$(basename "$f" .log)
  tail -f "$f" | sed "s/^/[$service] /" &
done
wait
```

### Log Rotation

For long-running worktrees, logs can grow large. The teardown script removes them. For active worktrees, consider:

```sh
# Truncate logs without stopping services
: > .worktree-runtime/logs/web.log
```

---

## Zombie Prevention Checklist

1. **Start guard**: Before starting, check if a PID file exists and the process is alive. If alive, skip. If dead, clean the stale PID file and proceed.

2. **PID validation**: After writing a PID file, verify the process is actually running (`kill -0 $pid`). If the process exited immediately, report the error.

3. **Stop timeout**: SIGTERM with a configurable timeout (default 10s). Escalate to SIGKILL. Verify with `kill -0` after kill.

4. **Orphan scan**: `env-start` can optionally scan for processes bound to this worktree's ports that don't match recorded PIDs -- these are orphans from a crashed session.

5. **Crash recovery**: If `state.json` says "started" but no PID files have live processes, reset state to "initialized" and allow re-start.

6. **Process groups**: For services that spawn child processes, use `kill -- -$pid` (process group kill) to ensure children are also terminated. Requires starting with `setsid` or `set -m`.
