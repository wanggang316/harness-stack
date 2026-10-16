# Port Allocation Strategy

## Philosophy

**非侵入式**：尊重项目已有的 `.env` 约定。脚本为本 worktree 计算 port 值，并**把它们注入 `.env`**（若缺失则从 `.env.example` 生成 `.env`）。不引入新的配置 schema，不引入 `.env.template`，除非用户明确同意，否则不改动源码。

## Worktree Identity

每个 worktree 从其目录名推导出唯一身份：

```sh
WORKTREE_ID=$(basename "$(git rev-parse --show-toplevel)")
```

对于 main worktree，使用 `main` 作为身份，以保持 base port 不变。

检测：

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

由 worktree ID 的 hash 推导出的确定性 offset：

```sh
if [ "$WORKTREE_ID" = "main" ]; then
  PORT_OFFSET=0
else
  HASH=$(printf '%s' "$WORKTREE_ID" | cksum | cut -d' ' -f1)
  PORT_OFFSET=$(( (HASH % 900 + 1) * 10 ))
fi
```

特性：
- **范围**：10 到 9000，步长 10
- **确定性**：同一个 worktree 名总是产生同一个 offset
- **Main worktree**：offset 为 0，保持原有的 base port（已有文档和书签仍可用）
- **步长 10**：每个项目可容纳至多 10 个服务而不会在 worktree 之间撞 port

## Port Detection Algorithm

`env-init` 必须检测 `.env.example` 中哪些变量代表 port：

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

对每个 port 变量，base port 取自 `.env.example` 中的值。

## Port Injection Algorithm

`env-init` 脚本不会从一个新模板生成 `.env`。相反：

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

实现草图：

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

若算出的 port 已被占用，则递增直到找到一个空闲 port：

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

在 monorepo 中，每个 package 可能有自己的 `.env.example`：

```
./.env.example                    ← root (shared config)
./apps/web/.env.example           ← web app
./apps/api/.env.example           ← API server
./apps/admin/.env.example         ← admin panel
```

**关键原则**：所有 package 共享同一个 `PORT_OFFSET`（由 worktree ID 推导）。每个 package 的 `.env` 各自独立 patch，但由于 offset 相同，跨服务的 URL 仍保持一致。

处理流程：

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

当 `apps/web/.env.example` 含 `NEXT_PUBLIC_API_URL=http://localhost:4000`，而 `apps/api/.env.example` 含 `PORT=4000` 时，注入后这两者必须保持同步。

策略：替换某个 URL 的 port 时，查的是对应服务 port 的**新**值（来自处理过程中构建的 port map），而非原始 offset。

在处理过程中维护一份 port map：

```sh
# Build port map from all .env.example files first
declare_port_map   # (portable stand-in: use a temp file with lines like "api=4000:4270")

# Then substitute URLs using the map
# API_URL=http://localhost:4000 → API_URL=http://localhost:4270
```

## Port Registration and Conflict Detection

注入完成后，把映射写入 `.worktree-runtime/ports.json`：

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

`env-init` 可扫描同级 worktree 的 `ports.json` 来对冲突发出告警：

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

对于 base port 为 `WEB=3000, API=4000, DB=5432, REDIS=6379` 的项目：

| Worktree | Offset | WEB | API | DB | REDIS |
|----------|--------|-----|-----|----|-------|
| main | 0 | 3000 | 4000 | 5432 | 6379 |
| env-init | 4270 | 7270 | 8270 | 9702 | 10649 |
| codex | 2380 | 5380 | 6380 | 7812 | 8759 |

若任何算出的 port 超过 65535 或已被占用，则启用 free-port fallback。

## Handling Hardcoded Ports

若源码硬编码 port（不从 env 读取），port 注入无法隔离这些服务。本技能必须把这一点抛给用户，而非悄悄重构：

**检测**：

```sh
# Scan source for hardcoded common ports
grep -rn -E ':\s*(3000|4000|5000|5432|6379|8080)\b' \
  --include='*.ts' --include='*.js' --include='*.py' --include='*.go' \
  src/ apps/ 2>/dev/null
```

把发现连同选项（refactor / skip / cancel）呈现给用户。不要自动重构生产代码。
