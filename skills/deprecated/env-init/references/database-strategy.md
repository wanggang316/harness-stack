# Database Isolation Strategy

## Overview

当多个 worktree 同时运行时，它们绝不能共享一个 database。这里提供两种策略——由用户依据项目需要选择。

## Option A：Multi-Database

同一个 database server，每个 worktree 独立的 database 名。

### How It Works

每个 worktree 在共享的 server 上创建自己的 database：

```
app_main           ← main worktree
app_env_init       ← feature/env-init worktree
app_codex          ← feature/codex worktree
```

命名约定为 `{app_name}_{worktree_id}`，其中 worktree_id 把连字符替换为下划线（多数引擎的 database 名不允许连字符）。

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

每个 worktree 独立运行 migration：

```sh
# In env-init, after creating the database:
cd "$ROOT_DIR"
# Run project-specific migration command
# e.g., npx prisma migrate deploy
# e.g., npx drizzle-kit push
# e.g., python manage.py migrate
```

### Pros and Cons

| 维度 | 评估 |
|-----------|-----------|
| 保真度 | 高——与生产同款引擎 |
| 特性覆盖 | 完整——JSON 运算符、CTE、窗口函数等 |
| 搭建复杂度 | 中——需要运行中的 DB server |
| 清理 | `dropdb` / `DROP DATABASE` |
| Migration 兼容性 | 完整——与生产一致 |
| 磁盘占用 | 每个空 database 约 10MB |

---

## Option B：Embedded Database

每个 worktree 一个 database 文件，零外部依赖。

### How It Works

每个 worktree 把自己的 database 以文件形式存放在 `.worktree-runtime/` 内：

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

无需启动 server，也无需为 database 分配 port。

### Teardown (env-teardown)

```sh
rm -rf "$ROOT_DIR/.worktree-runtime/data/"
```

### ORM Configuration

多数 ORM 支持通过环境变量切换 database 引擎：

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

| 维度 | 评估 |
|-----------|-----------|
| 保真度 | 中——部分 SQL 方言与生产不同 |
| 特性覆盖 | 受限——无 JSON 运算符（SQLite），无高级类型 |
| 搭建复杂度 | 零——无需 server |
| 清理 | 删文件即可 |
| Migration 兼容性 | 不同引擎可能需要各自的 migration 文件 |
| 磁盘占用 | 插入数据前约为 0 |

---

## Decision Matrix

回答以下问题来做选择：

| 问题 | 若是 → | 若否 → |
|----------|---------|---------|
| 生产用 Postgres/MySQL 吗？ | Option A | 皆可 |
| 应用是否用到 DB 专属特性（JSONB、数组、全文检索）？ | Option A | 皆可 |
| 本机有运行中的 DB server 吗？ | 皆可 | Option B |
| 这是原型或早期项目吗？ | Option B | 皆可 |
| 测试是否需要与生产保持 DB 引擎一致？ | Option A | 皆可 |
| 零依赖搭建是否为优先项？ | Option B | 皆可 |

**默认推荐**：生产使用 Postgres/MySQL 的项目选 Option A。原型以及没有 DB 专属需求的项目选 Option B。

## Hybrid Approach

有些团队两者并用：
- **开发**：Option B（快、零依赖的本地开发）
- **CI / 集成测试**：Option A（贴近生产保真度）
- **生产**：外部托管 database

这要求 ORM/migration 配置支持多引擎。把选定的策略记录到 `.worktree-runtime/state.json`：

```json
{
  "db_strategy": "multi-db",
  "db_name": "app_env_init",
  "db_port": 9702
}
```
