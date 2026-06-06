---
name: env-init
description: 为并行开发初始化每个 worktree 独立隔离的 runtime 环境。在创建新 worktree、dev server 因 port 或 database 冲突、或首次为某个项目搭建多 worktree 并行开发时使用。
---

# env-init：Worktree 隔离环境

## Overview

为每个 git worktree 生成独立隔离的 runtime 环境，让多个 worktree 可以同时运行而不会发生 port、database 或进程冲突。

**设计上非侵入式**：直接复用项目已有的 `.env` / `.env.example` 文件。检测 port 变量、注入每个 worktree 专属的值——不会强加一套新的配置 schema。

灵感来自 OpenAI 的 **per-worktree booting** 模式：每个 worktree 拥有自己的应用实例、日志和状态；当 worktree 被移除时，这一切都会被干净地拆除。

## When to Use

**适用于**：
- 创建一个需要运行 dev server 的新 worktree
- 并行的多个 worktree 之间发生 port 冲突
- 首次为某个项目搭建多 worktree 开发

**不适用于**：
- 从不并行运行的单 worktree 项目
- 没有 runtime 服务的纯 library 项目
- CI 环境（每个 job 天然隔离）

## Guiding Principles

1. **尊重项目已有配置**——有 `.env` / `.env.example` 就直接复用；不引入新的 schema
2. **Monorepo 意识**——每个 package 可能有自己的 `.env.example`；各自独立处理，但共享同一个 port offset
3. **改动源码是用户的决定**——若 port 被硬编码，建议重构；不强行替用户改
4. **足迹最小**——只新增 `scripts/env-*` 和 `.worktree-runtime/`；其余一律复用既有约定

## Process

### Step 1：发现已有的 Env 文件

找出项目中所有与 env 相关的文件：

```bash
# Root level
ls .env .env.example .env.local 2>/dev/null

# Monorepo: per-package
find . -name ".env.example" -not -path "./node_modules/*" -not -path "./.git/*"
find . -name ".env" -not -path "./node_modules/*" -not -path "./.git/*"
```

建立一份待管理的 env 文件清单：

| Path | 类型 | 说明 |
|------|------|-------|
| `./.env.example` | 已提交的模板 | 根目录的 source of truth |
| `./apps/web/.env.example` | Package 模板 | Next.js app |
| `./apps/api/.env.example` | Package 模板 | API server |

### Step 2：分析 Port 变量

对每个 env 文件，识别与 port 相关的变量：

```bash
grep -E '^(PORT|[A-Z_]+_PORT|[A-Z_]+PORT)=' .env.example
```

对每个变量分类：

| 类别 | 示例 | 处理方式 |
|----------|---------|--------|
| **已参数化** | env 中为 `PORT=${PORT:-3000}`，代码中为 `process.env.PORT` | 注入值，无需重构 |
| **env 中为固定默认值** | env 中为 `PORT=3000`，代码中为 `process.env.PORT` | 在生成的 `.env` 中覆盖 |
| **源码中硬编码** | `3000` 出现在源码里；不在 env 中 | 抛给用户，建议重构 |

**同时检查携带 port 的 URL**：
- `DATABASE_URL=postgresql://localhost:5432/...`
- `REDIS_URL=redis://localhost:6379`
- `API_URL=http://localhost:4000`

这些也需要做 port 替换。

### Step 3：抛出硬编码的 Port（若有）

若 Step 2 在源码中发现硬编码的 port，**停下来询问用户**：

> 以下 port 在源码中被硬编码，不重构就无法隔离：
>
> - `apps/web/next.config.js:23` -- 硬编码 port `3000`
> - `apps/api/src/server.ts:15` -- 硬编码 port `4000`
>
> **Option A**：重构为从 env 变量读取（`process.env.PORT`）。推荐——可启用 worktree 隔离。
>
> **Option B**：在 env-init 中跳过这些服务。只对 port 由 env 驱动的服务做 worktree 隔离。
>
> **Option C**：取消——我先手动重构。
>
> 选哪个？

记录这个决定；不要悄悄改动生产代码。

### Step 4：用户决策——Database 策略

呈现 database 隔离选项让用户选择。完整对比见 `references/database-strategy.md`。

> **本项目的 database 隔离策略：**
>
> **Option A：Multi-database** -- 同一个 DB server，每个 worktree 独立的 database 名。
> **Option B：Embedded database** -- 每个 worktree 一个 SQLite/DuckDB 文件。
>
> 本项目更适合哪一种？

把选择记录到 `.worktree-runtime/state.json`。

### Step 5：生成 Runtime 脚本

在 `scripts/` 下创建五个脚本：

| Script | 职责 |
|--------|----------------|
| `scripts/worktree-start.sh` | **新 worktree 的入口**。按 `.worktreeinclude` 从 main worktree 复制被 gitignore 的文件，再调用 `env-init`。幂等——手动调用或从 git hook 触发都安全。 |
| `scripts/env-init` | 推导 worktree ID、计算 port offset、**把算好的 port 写入已有的 `.env` 文件**（若 `.env` 缺失则从 `.env.example` 复制），创建 / provision database |
| `scripts/env-start` | 启动所有服务，把 PID 记录到 `.worktree-runtime/pids/`，把日志导向 `.worktree-runtime/logs/` |
| `scripts/env-stop` | SIGTERM -> 等待 -> SIGKILL，确认退出，清理 PID 文件 |
| `scripts/env-teardown` | `env-stop` + drop database + 移除容器 + 清理 `.worktree-runtime/` |

**`env-init` 的关键行为**：它不会替换 `.env.example`。它把已有的 `.env.example` 复制成 `.env`（在 `.env` 缺失时），然后只覆盖与 port 相关的变量和 database URL 为 worktree 专属值。若 `.env` 已存在，则就地 patch，保留无关变量（尤其是 secrets）。

**`worktree-start.sh` 的关键行为**：它通过 `git worktree list --porcelain` 定位 main worktree，读取 `.worktreeinclude`，把匹配且被 gitignore 的文件（如 `.env.local`、证书）复制进当前 worktree，且不覆盖已存在的文件。随后委托给 `env-init`。这是引导一个全新 worktree 的唯一入口。

所有脚本均为 POSIX sh。给它们加可执行权限（`chmod +x`）。

脚本模板与 port 注入算法见 `references/runtime-lifecycle.md`。

### Step 6：生成 `.worktreeinclude` 与 Git Hook

配置两个文件，让全新的 worktree 能自动引导。

**`.worktreeinclude`**（repo 根目录，已提交）：列出必须复制进新 worktree 的、被 gitignore 的文件。使用 `.gitignore` 语法。只有既匹配某个 pattern **又**被 gitignore 的文件才会被复制，因此被追踪的文件永远不会重复。

从项目已有 `.gitignore` 中通常承载本地配置的条目（`.env`、`.env.local`、凭据、证书）来初始化它。把生成的清单呈现给用户审阅。

```text .worktreeinclude
.env
.env.local
config/secrets.json
```

**`.githooks/post-checkout`**（repo 根目录，已提交，可执行）：一个薄封装，在全新 worktree 创建时调用 `scripts/worktree-start.sh`。Git 的 `post-checkout` hook 在 `git checkout <branch>` 和 `git worktree add` 时都会触发；封装用 `.worktree-runtime/state.json` 作为哨兵，因此它只在全新 worktree 上运行，后续切分支时则为 no-op。

**告知用户**每个 clone 运行一次以激活该 hook（Git 把 `core.hooksPath` 存在本地配置里，不纳入版本管理）：

```bash
git config core.hooksPath .githooks
```

若用户创建 worktree 的工具绕过了 git hook，他们仍可在创建 worktree 后手动调用 `./scripts/worktree-start.sh`。

hook 与 `worktree-start.sh` 的模板见 `references/runtime-lifecycle.md`。

### Step 7：创建 Runtime 目录

为 runtime 状态搭建 `.worktree-runtime/`（已 gitignore）：

```
.worktree-runtime/
  worktree.id          # Worktree identifier
  ports.json           # Actual allocated ports per service
  state.json           # Lifecycle state + user decisions
  pids/                # PID files, one per service
  logs/                # Log files, one per service
  data/                # (Optional) embedded DB files
```

若 `.gitignore` 中尚无以下条目，则追加：
```
.worktree-runtime/
.env
.env.local
.env.*.local
```

### Step 8：验证

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

| 借口 | 现实 |
|---|---|
| “冲突的时候我手动改一下 port 就好” | 你会忘。下一个 agent 不知道你的 port。一次性把它自动化。 |
| “我们一次只跑一个 worktree” | 直到某天不是。env-init 花 5 分钟；debug 一次 port 冲突花 30 分钟。 |
| “Docker 已经隔离了一切” | Docker 隔离的是容器，不是映射到 host 的 port。两个 `ports: 3000:3000` 的 compose stack 在 host 上仍会冲突。 |
| “我把 database 在多个 worktree 间共享” | 直到分支 A 的 migration 删掉了分支 B 依赖的某列。每个 worktree 独立 database 是廉价的保险。 |
| “追踪 PID 是过度设计” | 没有 PID 你就无法干净地停止。孤儿 dev server 吃内存、占 port。 |
| “干脆加个 .env.template 来替换 .env.example” | 别。项目已有约定。顺着它来。 |

## Red Flags

- 源码中硬编码 port 数字（而非从 env 读取）
- `.env` 被提交进 git
- dev server 启动时没有 PID 追踪
- 没有 `env-stop` 脚本——服务只能靠关终端来杀
- Database URL 中没有 worktree 专属的 database 名
- 日志写到共享位置，而非 `.worktree-runtime/logs/`
- 项目已有 `.env.example` 却还引入一套新的 env schema

## Verification

- [ ] 所有已有的 `.env.example` 文件都被保留（未被替换）
- [ ] `.env` 文件包含算好的 worktree 专属 port 值
- [ ] `.env` 与 `.worktree-runtime/` 已在 `.gitignore` 中
- [ ] `scripts/worktree-start.sh`、`env-init`、`env-start`、`env-stop`、`env-teardown` 均存在且可执行
- [ ] `.worktreeinclude` 存在于 repo 根目录，并列出要传播的、被 gitignore 的文件
- [ ] `.githooks/post-checkout` 存在、可执行，并委托给 `scripts/worktree-start.sh`
- [ ] 已告知用户每个 clone 运行一次 `git config core.hooksPath .githooks`
- [ ] `.worktree-runtime/` 含有 ports.json 与 state.json
- [ ] 所有服务都在唯一的 port 上启动（与同级 worktree 无冲突）
- [ ] `env-stop` 不留任何孤儿进程
- [ ] 已就硬编码的 port 询问用户（若发现任何）
- [ ] 用户已明确选择 database 策略
