# Port Allocation Strategy

## Worktree Identity

Each worktree derives a unique identity from its directory name:

```sh
WORKTREE_ID=$(basename "$(git rev-parse --show-toplevel)")
```

For the main worktree (the original checkout), use `main` as the identity to keep base ports unchanged.

Detection logic:

```sh
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
GIT_COMMON=$(git -C "$ROOT_DIR" rev-parse --git-common-dir 2>/dev/null || echo "")

if [ "$GIT_COMMON" = ".git" ]; then
  # This IS the main worktree
  WORKTREE_ID="main"
else
  WORKTREE_ID=$(basename "$ROOT_DIR")
fi
```

## Offset Algorithm

Deterministic offset derived from a hash of the worktree ID:

```sh
if [ "$WORKTREE_ID" = "main" ]; then
  PORT_OFFSET=0
else
  HASH=$(printf '%s' "$WORKTREE_ID" | cksum | cut -d' ' -f1)
  PORT_OFFSET=$(( (HASH % 900 + 1) * 10 ))
fi
```

Properties:
- **Range**: 10 to 9000, step size 10
- **Deterministic**: Same worktree name always produces the same offset
- **Main worktree**: Offset 0, keeps original base ports (documentation/bookmarks work)
- **Step size 10**: Accommodates up to 10 services per project without inter-worktree collision
- **POSIX**: `cksum` is available on macOS and Linux

## Free Port Fallback

If a computed port is already in use, increment until a free port is found:

```sh
next_free_port() {
  port=$1
  while is_port_in_use "$port"; do
    port=$((port + 1))
  done
  printf '%s' "$port"
}

is_port_in_use() {
  # macOS + Linux compatible
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ss -tlnH "sport = :$1" | grep -q .
  else
    # Fallback: try to bind
    (echo >/dev/tcp/localhost/"$1") 2>/dev/null
  fi
}
```

## Monorepo Dynamic Port Association

In a monorepo, multiple packages run as separate services. The key principle: **all packages share the same `PORT_OFFSET`**, and cross-service references use variables.

### Root .env.template

The root template defines all ports centrally:

```sh
WORKTREE_ID=${WORKTREE_ID:-main}
PORT_OFFSET=${PORT_OFFSET:-0}

# Service ports
WEB_PORT=$((3000 + PORT_OFFSET))
API_PORT=$((4000 + PORT_OFFSET))
ADMIN_PORT=$((3100 + PORT_OFFSET))
WORKER_PORT=$((5000 + PORT_OFFSET))
DB_PORT=$((5432 + PORT_OFFSET))
REDIS_PORT=$((6379 + PORT_OFFSET))

# Cross-service URLs (derived from ports above)
NEXT_PUBLIC_API_URL=http://localhost:${API_PORT}
DATABASE_URL=postgresql://localhost:${DB_PORT}/app_${WORKTREE_ID}
REDIS_URL=redis://localhost:${REDIS_PORT}/0
```

### Per-Package Distribution

Two patterns for distributing ports to packages:

**Pattern A: Shared root .env** (simpler)

All packages read from the root `.env` via `dotenv` or framework config:

```js
// apps/web/next.config.js
const port = process.env.WEB_PORT || 3000;
```

**Pattern B: Per-package .env generation** (explicit)

`env-init` generates a `.env` in each package directory:

```
apps/web/.env       → PORT=3270, NEXT_PUBLIC_API_URL=http://localhost:4270
apps/api/.env       → PORT=4270, DATABASE_URL=postgresql://localhost:5702/app_env_init
packages/shared/.env → (no runtime ports needed)
```

Both patterns are valid. Pattern A is simpler; Pattern B gives each package full independence.

### Service Dependency Graph

For monorepos, `env-start` must respect startup order:

```
Database → Redis → API → Worker → Web
```

The service graph is project-specific. `env-init` should detect or ask the user about dependencies, then `env-start` starts services in order, waiting for each to be healthy before starting the next.

## Port Registration and Conflict Detection

After allocating ports, write the mapping to `.worktree-runtime/ports.json`:

```json
{
  "worktree_id": "env-init",
  "offset": 4270,
  "allocated_at": "2026-04-15T10:30:00Z",
  "ports": {
    "web": 7270,
    "api": 8270,
    "admin": 7370,
    "worker": 9270,
    "db": 9702,
    "redis": 10649
  }
}
```

To detect conflicts with sibling worktrees:

```sh
# Scan sibling worktree ports.json files
SIBLINGS_DIR=$(dirname "$ROOT_DIR")
for sibling in "$SIBLINGS_DIR"/*/; do
  ports_file="$sibling/.worktree-runtime/ports.json"
  if [ -f "$ports_file" ] && [ "$sibling" != "$ROOT_DIR/" ]; then
    # Compare ports for overlap
    # ...
  fi
done
```

## Example: Offset Table

For a project with base ports `WEB=3000, API=4000, DB=5432, REDIS=6379`:

| Worktree | Offset | WEB | API | DB | REDIS |
|----------|--------|-----|-----|----|-------|
| main | 0 | 3000 | 4000 | 5432 | 6379 |
| env-init | 4270 | 7270 | 8270 | 9702 | 10649 |
| codex | 2380 | 5380 | 6380 | 7812 | 8759 |
| ui | 6130 | 9130 | 10130 | 11562 | 12509 |

Note: If any port exceeds 65535 or is occupied, the free-port fallback engages.
