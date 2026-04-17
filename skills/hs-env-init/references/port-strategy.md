# Port Allocation Strategy

## Philosophy

**Non-invasive**: Respect the project's existing `.env` convention. The script computes port values for this worktree and **injects them into `.env`** (generating `.env` from `.env.example` if missing). No new config schema, no `.env.template`, no changes to source code unless the user explicitly approves.

## Worktree Identity

Each worktree derives a unique identity from its directory name:

```sh
WORKTREE_ID=$(basename "$(git rev-parse --show-toplevel)")
```

For the main worktree, use `main` as the identity to keep base ports unchanged.

Detection:

```sh
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
GIT_COMMON=$(git -C "$ROOT_DIR" rev-parse --git-common-dir 2>/dev/null || echo "")
GIT_DIR=$(git -C "$ROOT_DIR" rev-parse --absolute-git-dir 2>/dev/null || echo "")

if [ "$GIT_DIR" = "$GIT_COMMON" ]; then
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
- **Main worktree**: Offset 0, keeps original base ports (existing docs and bookmarks work)
- **Step size 10**: Accommodates up to 10 services per project without inter-worktree collision

## Port Detection Algorithm

`env-init` must detect which variables in `.env.example` represent ports:

```sh
# Extract port-related variables from .env.example
extract_port_vars() {
  env_file="$1"
  # Match: PORT=..., *_PORT=..., variables with ":port" in URLs
  grep -E '^[A-Z_]*(PORT|PORT=)' "$env_file" | cut -d'=' -f1
}

# Extract URL variables that contain port numbers
extract_url_vars() {
  env_file="$1"
  # Matches URLs with :PORT pattern
  grep -E '^[A-Z_]+=.+://.+:[0-9]+' "$env_file" | cut -d'=' -f1
}
```

For each port variable, the base port comes from the value in `.env.example`.

## Port Injection Algorithm

The `env-init` script does not generate `.env` from a new template. Instead:

```
1. If .env does not exist:
     Copy .env.example → .env
2. For each port variable detected in .env.example:
     new_value = base_value + PORT_OFFSET
     if port is occupied:
       new_value = next_free_port(new_value)
     Update or insert the variable in .env
3. For each URL variable containing a port:
     Substitute the new port value
4. Update DATABASE_URL with worktree-specific database name (if multi-db strategy)
```

Implementation sketch:

```sh
# Update or insert a variable in .env
set_env_var() {
  env_file="$1"
  var_name="$2"
  var_value="$3"

  if grep -q "^${var_name}=" "$env_file"; then
    # Replace existing line (POSIX-compatible)
    tmp=$(mktemp)
    awk -v n="$var_name" -v v="$var_value" '
      BEGIN { FS=OFS="=" }
      $1 == n { $0 = n "=" v; found=1 }
      { print }
      END { if (!found) print n "=" v }
    ' "$env_file" > "$tmp"
    mv "$tmp" "$env_file"
  else
    printf '%s=%s\n' "$var_name" "$var_value" >> "$env_file"
  fi
}

# Example usage
BASE_PORT=$(grep '^PORT=' .env.example | cut -d'=' -f2)
NEW_PORT=$((BASE_PORT + PORT_OFFSET))
if port_in_use "$NEW_PORT"; then
  NEW_PORT=$(next_free_port "$NEW_PORT")
fi
set_env_var ".env" "PORT" "$NEW_PORT"
```

## Free Port Fallback

If a computed port is already in use, increment until a free port is found:

```sh
port_in_use() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ss -tlnH "sport = :$1" 2>/dev/null | grep -q .
  else
    (exec 3<>/dev/tcp/localhost/"$1") 2>/dev/null && { exec 3<&-; return 0; }
    return 1
  fi
}

next_free_port() {
  port=$1
  max=$((port + 100))
  while [ "$port" -le "$max" ] && port_in_use "$port"; do
    port=$((port + 1))
  done
  printf '%s' "$port"
}
```

## Monorepo: Per-Package .env Files

In a monorepo, each package may have its own `.env.example`:

```
./.env.example                    ← root (shared config)
./apps/web/.env.example           ← web app
./apps/api/.env.example           ← API server
./apps/admin/.env.example         ← admin panel
```

**Key principle**: All packages share the same `PORT_OFFSET` (derived from worktree ID). Each package's `.env` is patched independently, but cross-service URLs remain consistent because the offset is the same.

Processing:

```sh
# Process each .env.example in the monorepo
find . -name ".env.example" -not -path "*/node_modules/*" -not -path "*/.git/*" | while read -r example; do
  dir=$(dirname "$example")
  env_file="$dir/.env"

  # Copy template if .env missing
  [ -f "$env_file" ] || cp "$example" "$env_file"

  # Detect port variables and inject computed values
  for var in $(extract_port_vars "$example"); do
    base_value=$(grep "^${var}=" "$example" | cut -d'=' -f2)
    new_value=$((base_value + PORT_OFFSET))
    port_in_use "$new_value" && new_value=$(next_free_port "$new_value")
    set_env_var "$env_file" "$var" "$new_value"
  done

  # Update URL variables with substituted ports
  # ... (see runtime-lifecycle.md for full implementation)
done
```

### Cross-Service URLs in Monorepo

When `apps/web/.env.example` contains `NEXT_PUBLIC_API_URL=http://localhost:4000`, and `apps/api/.env.example` contains `PORT=4000`, these must stay in sync after injection.

Strategy: when substituting a URL's port, look up the **new** value of the corresponding service's port (from the port map built during processing), not the raw offset.

Maintain a port map during processing:

```sh
# Build port map from all .env.example files first
declare_port_map   # (portable stand-in: use a temp file with lines like "api=4000:4270")

# Then substitute URLs using the map
# API_URL=http://localhost:4000 → API_URL=http://localhost:4270
```

## Port Registration and Conflict Detection

After injection, write the mapping to `.worktree-runtime/ports.json`:

```json
{
  "worktree_id": "env-init",
  "offset": 4270,
  "allocated_at": "2026-04-15T10:30:00Z",
  "ports": {
    "web": 7270,
    "api": 8270,
    "db": 9702,
    "redis": 10649
  }
}
```

`env-init` can scan sibling worktrees' `ports.json` to warn about collisions:

```sh
SIBLINGS=$(dirname "$ROOT_DIR")
for sibling in "$SIBLINGS"/*/; do
  [ "$sibling" = "$ROOT_DIR/" ] && continue
  ports_file="${sibling}.worktree-runtime/ports.json"
  [ -f "$ports_file" ] || continue
  # Cross-reference ports for overlap; warn user
done
```

## Example: Offset Table

For a project with base ports `WEB=3000, API=4000, DB=5432, REDIS=6379`:

| Worktree | Offset | WEB | API | DB | REDIS |
|----------|--------|-----|-----|----|-------|
| main | 0 | 3000 | 4000 | 5432 | 6379 |
| env-init | 4270 | 7270 | 8270 | 9702 | 10649 |
| codex | 2380 | 5380 | 6380 | 7812 | 8759 |

If any computed port exceeds 65535 or is occupied, the free-port fallback engages.

## Handling Hardcoded Ports

If source code hardcodes ports (not reading from env), port injection cannot isolate those services. The skill must surface this to the user rather than silently refactor:

**Detection**:

```sh
# Scan source for hardcoded common ports
grep -rn -E ':\s*(3000|4000|5000|5432|6379|8080)\b' \
  --include='*.ts' --include='*.js' --include='*.py' --include='*.go' \
  src/ apps/ 2>/dev/null
```

Present findings to the user with options (refactor / skip / cancel). Do not auto-refactor production code.
