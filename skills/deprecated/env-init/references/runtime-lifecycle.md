# Runtime Lifecycle Management

## Overview

runtime lifecycle 确保每个 worktree 的进程都能被启动、追踪、停止和清理，而不留下孤儿。该 lifecycle 是一个含四种状态的状态机：

```
uninitialized → initialized → started → stopped
                     ↑                      │
                     └──────────────────────┘
                        (can restart)
```

状态被追踪在 `.worktree-runtime/state.json` 中。

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

## scripts/worktree-start.sh

全新 worktree 的统一引导入口。按 `.worktreeinclude` 从 main worktree 复制被 gitignore 的文件，然后委托给 `env-init`。幂等——手动调用或从 git hook 触发都安全。

```sh
#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
INCLUDE_FILE="$ROOT_DIR/.worktreeinclude"

# --- Locate main worktree (source for file copies) ---
MAIN_DIR=$(git -C "$ROOT_DIR" worktree list --porcelain | awk '/^worktree / {print $2; exit}')

# --- Copy files from .worktreeinclude (skip for main worktree itself) ---
if [ -f "$INCLUDE_FILE" ] && [ "$MAIN_DIR" != "$ROOT_DIR" ]; then
  printf 'Copying worktree-local files from %s\n' "$MAIN_DIR"
  while IFS= read -r pattern || [ -n "$pattern" ]; do
    # Skip blank lines and comments
    case "$pattern" in ''|'#'*) continue ;; esac

    # Expand pattern in MAIN_DIR; intentionally unquoted for shell globbing
    # shellcheck disable=SC2086
    (cd "$MAIN_DIR" && ls -d $pattern 2>/dev/null || true) | while IFS= read -r match; do
      [ -z "$match" ] && continue
      src="$MAIN_DIR/$match"
      dst="$ROOT_DIR/$match"
      [ -e "$src" ] || continue
      [ -e "$dst" ] && continue  # don't overwrite existing files in the new worktree

      # Only copy files that are actually gitignored in the main worktree;
      # tracked files are checked out by git itself and must not be duplicated.
      if (cd "$MAIN_DIR" && git check-ignore -q "$match"); then
        mkdir -p "$(dirname "$dst")"
        cp -Rp "$src" "$dst"
        printf '  copied: %s\n' "$match"
      fi
    done
  done < "$INCLUDE_FILE"
fi

# --- Delegate to env-init ---
if [ -x "$ROOT_DIR/scripts/env-init" ]; then
  exec "$ROOT_DIR/scripts/env-init"
fi
```

---

## .githooks/post-checkout

一个薄封装，在全新 worktree 创建时运行 `worktree-start.sh`。Git 的 `post-checkout` 在 `git checkout <branch>` 和 `git worktree add` 时都会触发；哨兵检查（`.worktree-runtime/state.json`）使其在后续切分支时保持 no-op。

```sh
#!/bin/sh
# post-checkout: prev_head new_head flag (1 = branch checkout)
set -eu

# Only fire on branch checkout, not file-level checkout
[ "${3:-0}" = "1" ] || exit 0

ROOT_DIR=$(git rev-parse --show-toplevel)

# Skip the main worktree (avoid copying files onto themselves)
GIT_DIR=$(git rev-parse --absolute-git-dir)
GIT_COMMON=$(git rev-parse --git-common-dir)
[ "$GIT_DIR" = "$GIT_COMMON" ] && exit 0

# Sentinel: skip if this worktree has already been initialized
[ -f "$ROOT_DIR/.worktree-runtime/state.json" ] && exit 0

# Bootstrap a fresh worktree
if [ -x "$ROOT_DIR/scripts/worktree-start.sh" ]; then
  "$ROOT_DIR/scripts/worktree-start.sh"
fi
```

每个 clone 激活一次（Git 把 `core.hooksPath` 存在本地配置里，不纳入版本管理）：

```sh
git config core.hooksPath .githooks
```

---

## .worktreeinclude

提交在 repo 根目录。使用 `.gitignore` 语法；只有在 main worktree 中既匹配某个 pattern **又**被 gitignore 的文件才会被复制。让 secrets 和本地配置在多个 worktree 间可复现，且不重复被追踪的文件。

```text
# Local env files (gitignored, but needed per worktree)
.env
.env.local
.env.*.local

# Per-package env in monorepos
apps/*/.env
apps/*/.env.local

# Local credentials / certs
config/secrets.json
certs/local.pem
```

---

## scripts/env-init

通过把每个 worktree 专属的 port 值注入项目已有的 `.env` 文件来初始化环境。幂等——可多次运行而无副作用。

**关键行为**：不会创建新的 `.env.template`。它发现项目中每个已有的 `.env.example`，在缺失时把它复制成 `.env`，然后用 worktree 专属值覆盖与 port 相关的变量。无关变量（secrets、feature flag）被保留。

```sh
#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
RUNTIME_DIR="$ROOT_DIR/.worktree-runtime"

# --- Step 1: Derive worktree identity ---
GIT_DIR=$(git -C "$ROOT_DIR" rev-parse --absolute-git-dir 2>/dev/null || echo "")
GIT_COMMON=$(git -C "$ROOT_DIR" rev-parse --git-common-dir 2>/dev/null || echo "")
if [ "$GIT_DIR" = "$GIT_COMMON" ] || [ -z "$GIT_DIR" ]; then
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

# --- Step 4: Helpers ---
set_env_var() {
  env_file="$1"; var="$2"; value="$3"
  tmp=$(mktemp)
  awk -v n="$var" -v v="$value" '
    BEGIN { FS=OFS="="; found=0 }
    $1 == n { $0 = n "=" v; found=1 }
    { print }
    END { if (!found) print n "=" v }
  ' "$env_file" > "$tmp" && mv "$tmp" "$env_file"
}

port_in_use() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  else
    (exec 3<>/dev/tcp/localhost/"$1") 2>/dev/null && { exec 3<&-; return 0; }
    return 1
  fi
}

next_free_port() {
  p=$1; max=$((p + 100))
  while [ "$p" -le "$max" ] && port_in_use "$p"; do p=$((p + 1)); done
  printf '%s' "$p"
}

# --- Step 5: Process each .env.example in the project ---
# For monorepos, find all .env.example files; for single-package, just the root.
find "$ROOT_DIR" -name ".env.example" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/.worktree-runtime/*" | while read -r example; do
  
  dir=$(dirname "$example")
  env_file="$dir/.env"

  # Copy template if .env missing (preserves existing .env secrets otherwise)
  [ -f "$env_file" ] || cp "$example" "$env_file"

  # For each port variable in .env.example, inject computed value into .env
  grep -E '^[A-Z_]*PORT=[0-9]+' "$example" 2>/dev/null | while IFS='=' read -r var base; do
    new_port=$((base + PORT_OFFSET))
    port_in_use "$new_port" && new_port=$(next_free_port "$new_port")
    set_env_var "$env_file" "$var" "$new_port"
    printf '  %s: %s → %s (%s)\n' "$env_file" "$var" "$new_port" "$base" >&2
  done

  # URL variables with embedded ports are project-specific; handle via a 
  # custom SERVICE_URL_VARS list in env-init, or use sed substitution.
done

# --- Step 6: Install dependencies ---
if [ -f "$ROOT_DIR/package.json" ]; then
  if command -v pnpm >/dev/null 2>&1; then
    (cd "$ROOT_DIR" && pnpm install)
  elif command -v npm >/dev/null 2>&1; then
    (cd "$ROOT_DIR" && npm install)
  fi
fi

# --- Step 7: Create database (project-specific) ---
# See database-strategy.md for implementation

# --- Step 8: Write state.json ---
cat > "$RUNTIME_DIR/state.json" <<STATEEOF
{
  "worktree_id": "$WORKTREE_ID",
  "port_offset": $PORT_OFFSET,
  "state": "initialized",
  "initialized_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
STATEEOF

printf 'Environment initialized: worktree=%s offset=%d\n' "$WORKTREE_ID" "$PORT_OFFSET"
```

上面的脚本是一个基线。对于含跨服务 URL 引用的 monorepo 项目（例如 web package 中 `API_URL=http://localhost:4000` 指向 API package），扩展 URL 替换那一段以查找对等服务的 port 映射。算法见 `port-strategy.md`。

---

## scripts/env-start

启动所有服务，并带 PID 追踪与日志导向。

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

优雅关停，并防止僵尸进程。

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

完整清理——移除本 worktree 环境的所有痕迹。

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

每个服务写入自己在 `.worktree-runtime/logs/` 下的日志文件：

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

对于长期运行的 worktree，日志可能变得很大。teardown 脚本会移除它们。对于活跃的 worktree，可考虑：

```sh
# Truncate logs without stopping services
: > .worktree-runtime/logs/web.log
```

---

## Zombie Prevention Checklist

1. **启动守卫**：启动前，检查 PID 文件是否存在且进程是否存活。存活则跳过。已死则清理过期 PID 文件再继续。

2. **PID 校验**：写入 PID 文件后，确认进程确实在运行（`kill -0 $pid`）。若进程立即退出，报告错误。

3. **停止超时**：SIGTERM 并带一个可配置的超时（默认 10s）。升级为 SIGKILL。kill 后用 `kill -0` 确认。

4. **孤儿扫描**：`env-start` 可选地扫描那些绑定到本 worktree port 却与记录的 PID 不匹配的进程——它们是上次崩溃会话留下的孤儿。

5. **崩溃恢复**：若 `state.json` 显示为 "started" 但没有任何 PID 文件对应存活进程，把状态重置为 "initialized" 并允许重启。

6. **进程组**：对于会派生子进程的服务，用 `kill -- -$pid`（进程组 kill）以确保子进程也被终止。需要用 `setsid` 或 `set -m` 启动。
