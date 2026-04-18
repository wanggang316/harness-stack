# Database Isolation Strategy

## Overview

When multiple worktrees run simultaneously, they must not share a database. Two strategies are available -- the user chooses based on their project's needs.

## Option A: Multi-Database

Same database server, per-worktree database name.

### How It Works

Each worktree creates its own database on the shared server:

```
app_main           ← main worktree
app_env_init       ← feature/env-init worktree
app_codex          ← feature/codex worktree
```

The naming convention: `{app_name}_{worktree_id}`, where worktree_id has hyphens replaced with underscores (database names don't allow hyphens in most engines).

### Setup (env-init)

```sh
DB_NAME="app_$(echo "$WORKTREE_ID" | tr '-' '_')"
DB_PORT=$((5432 + PORT_OFFSET))

# Postgres
if command -v createdb >/dev/null 2>&1; then
  createdb -p "$DB_PORT" "$DB_NAME" 2>/dev/null || true
fi

# MySQL
if command -v mysql >/dev/null 2>&1; then
  mysql -P "$DB_PORT" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`;" 2>/dev/null || true
fi

# Write to .env
DATABASE_URL="postgresql://localhost:${DB_PORT}/${DB_NAME}"
```

### Teardown (env-teardown)

```sh
DB_NAME="app_$(echo "$WORKTREE_ID" | tr '-' '_')"

# Postgres
dropdb -p "$DB_PORT" "$DB_NAME" 2>/dev/null || true

# MySQL
mysql -P "$DB_PORT" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;" 2>/dev/null || true
```

### Migration

Each worktree runs migrations independently:

```sh
# In env-init, after creating the database:
cd "$ROOT_DIR"
# Run project-specific migration command
# e.g., npx prisma migrate deploy
# e.g., npx drizzle-kit push
# e.g., python manage.py migrate
```

### Pros and Cons

| Dimension | Assessment |
|-----------|-----------|
| Fidelity | High -- same engine as production |
| Feature coverage | Full -- JSON operators, CTEs, window functions, etc. |
| Setup complexity | Medium -- requires running DB server |
| Cleanup | `dropdb` / `DROP DATABASE` |
| Migration compatibility | Full -- same as production |
| Disk usage | ~10MB per empty database |

---

## Option B: Embedded Database

Per-worktree database file, zero external dependencies.

### How It Works

Each worktree stores its database as a file inside `.worktree-runtime/`:

```
.worktree-runtime/
  data/
    app.db             ← SQLite database file
    app.db-wal         ← WAL file (auto-created)
    app.db-shm         ← Shared memory (auto-created)
```

### Setup (env-init)

```sh
DB_DIR="$ROOT_DIR/.worktree-runtime/data"
mkdir -p "$DB_DIR"

# SQLite
DATABASE_URL="file:${DB_DIR}/app.db"

# DuckDB
DATABASE_URL="duckdb://${DB_DIR}/app.duckdb"
```

No server to start, no port to allocate for the database.

### Teardown (env-teardown)

```sh
rm -rf "$ROOT_DIR/.worktree-runtime/data/"
```

### ORM Configuration

Most ORMs support switching database engines via environment variable:

**Prisma**:
```prisma
datasource db {
  provider = env("DB_PROVIDER")  // "postgresql" or "sqlite"
  url      = env("DATABASE_URL")
}
```

**Drizzle**:
```ts
// drizzle.config.ts
const driver = process.env.DB_PROVIDER === 'sqlite'
  ? { driver: 'better-sqlite3', dbCredentials: { url: process.env.DATABASE_URL } }
  : { driver: 'pg', dbCredentials: { connectionString: process.env.DATABASE_URL } };
```

**Django**:
```python
DATABASES = {
    'default': dj_database_url.parse(os.environ['DATABASE_URL'])
}
```

### Pros and Cons

| Dimension | Assessment |
|-----------|-----------|
| Fidelity | Medium -- some SQL dialects differ from production |
| Feature coverage | Limited -- no JSON operators (SQLite), no advanced types |
| Setup complexity | Zero -- no server needed |
| Cleanup | Delete files |
| Migration compatibility | May need separate migration files for different engines |
| Disk usage | ~0 until data is inserted |

---

## Decision Matrix

Answer these questions to choose:

| Question | If Yes → | If No → |
|----------|---------|---------|
| Does production use Postgres/MySQL? | Option A | Either |
| Does the app use DB-specific features (JSONB, arrays, full-text search)? | Option A | Either |
| Is a running DB server available on this machine? | Either | Option B |
| Is this a prototype or early-stage project? | Option B | Either |
| Do tests need DB-engine parity with production? | Option A | Either |
| Is zero-dependency setup a priority? | Option B | Either |

**Default recommendation**: Option A for projects that use Postgres/MySQL in production. Option B for prototypes and projects without DB-specific requirements.

## Hybrid Approach

Some teams use both:
- **Development**: Option B (fast, zero-dependency local dev)
- **CI / Integration tests**: Option A (production-fidelity)
- **Production**: External managed database

This requires the ORM/migration setup to support multiple engines. Record the chosen strategy in `.worktree-runtime/state.json`:

```json
{
  "db_strategy": "multi-db",
  "db_name": "app_env_init",
  "db_port": 9702
}
```
