# fdd CLI：定位、调用、升级与基本使用

`fdd` 是 FDD 流程的确定性记账 CLI（源码在 `packages/fdd/`，包名 `@hs/fdd`）。它以**预构建单文件 bundle** 随插件分发：`packages/fdd/bin/fdd.mjs`，依赖（zod）已内联，只需 Node >= 20。**不安装到系统、不需要使用者现场编译。**

调用形式（skills 与 agent brief 里所有 `fdd <subcommand>` 写法都是它的简写）：

```bash
node "<plugin-root>/packages/fdd/bin/fdd.mjs" <subcommand> ...
```

**反合理化（先点名最可能的借口）：**

| 借口 | 现实 |
|---|---|
| 「`fdd` 不在 PATH 上，我直接手改 `features.json` 顶一下。」 | `fdd` 本来就不在 PATH 上——它经 `node <bundle>` 调用。手改 JSON 会绕过 schema 校验和状态机不变量（terminal 排序、coverage、gate）。 |
| 「找不到 bundle 路径，所以没法用。」 | 按下面的探测顺序找，三步以内必命中；本文档自身就在 `<plugin-root>/references/` 下，你能读到它就说明 bundle 在旁边。 |
| 「为了方便我把它 `npm install -g` 装到系统。」 | 不要。全局安装会随插件更新而过期、还污染使用者环境。bundle 随插件分发，永远与 skills 同版本。 |

## 1. 定位 bundle

按顺序探测，取第一个命中的：

```bash
# a) 插件上下文中的环境变量
[ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && ls "${CLAUDE_PLUGIN_ROOT}/packages/fdd/bin/fdd.mjs"

# b) Claude Code 插件安装目录中搜索
find ~/.claude/plugins -maxdepth 6 -type f -name fdd.mjs -path "*harness-stack*" 2>/dev/null | head -1

# c) 当前仓库就是 harness-stack 的开发 checkout
ls "$(git rev-parse --show-toplevel)/packages/fdd/bin/fdd.mjs"
```

验证（应输出 `Usage:` 开头的帮助）：

```bash
node "<bundle>" --help | head -1
```

会话内频繁调用时，可在每条 Bash 命令里内联定义简写：

```bash
FDD='node /abs/path/to/fdd.mjs'; $FDD next-feature
```

## 2. 升级

bundle 是仓库内提交的构建产物，随插件一起发版：插件更新（或 dev checkout `git pull`）后 bundle 自动就是新版，**使用者无事可做**。

仅 harness-stack 的**开发者**在改动 `packages/fdd/src/` 后需要重新生成并随源码一并提交：

```bash
pnpm --filter @hs/fdd build   # tsc + esbuild bundle -> packages/fdd/bin/fdd.mjs
```

源码与 bundle 不同步是开发侧 bug：若 `--help` 列出的子命令与 skill 文档不符，先重跑上面的 build。

## 3. 基本使用

状态根目录是 `<git-toplevel>/.harness-runtime`（可用 `$HS_PLAN_RUNTIME_DIR` 覆盖），每个 plan 一个子目录。任何命令都可用 `--plan <slug>` 覆盖当前 active plan。

```
# plan 管理
fdd init <slug>                     创建 plan 目录骨架并设为 active（slug 必须 kebab-case）
fdd use <slug> | active | list-plans

# feature 记账（execution 循环）
fdd next-feature                    第一条 pending feature："<id>\t<agent>\t<milestone>"
fdd set-status <id> <status>        terminal 状态会把 feature 挪到列表底部
fdd list-features | milestone-status <m>

# contract / 验证（planning + validate）
fdd init-state                      从 validation-contract.md 重新生成 validation-state.json
fdd contract-coverage               每条断言恰好被一个 feature 认领，否则 exit 2
fdd set-assertion <VAL-id> <status> [evidence]
fdd gate                            全部断言 passed 才 exit 0

# milestone / handoff
fdd seal-milestone <m> | is-sealed <m>
fdd write-handoff <feature-id> <json-file> | handoff <feature-id>
```

**Exit codes：** `0` 成功 · `1` 数据错误（无 active plan、文件缺失/非法、未知 id）· `2` 不变量违例（coverage / gate 未满足）· `3` 用法错误。脚本化调用时按 exit code 分支，不要解析报错文案。

完整命令语义见 `packages/fdd/README.md`；代码即真相之源（`packages/fdd/src/cli.ts`）。

## 4. 常见故障

| 症状 | 原因与处置 |
|---|---|
| `command not found: fdd` | 正常——`fdd` 不装进 PATH。改用 `node <bundle> ...`（第 1 节定位）。 |
| bundle 文件不存在 | 插件安装不完整或是老版本 → 更新插件；dev checkout 则 `pnpm --filter @hs/fdd build`。 |
| `node: command not found` 或 Node < 20 | 唯一的环境前提是 Node >= 20。请使用者安装 / 切换 Node（nvm、brew 等），这是仓库 `engines` 的要求。 |
| `error (data): no active plan` | 还没 `fdd init <slug>` 或 `.active` 丢失 → `fdd use <slug>`。 |
| `slug must be kebab-case` | slug 只允许小写字母、数字、连字符。 |
| 子命令与 skill 文档不符 | 源码与 bundle 漂移（开发侧）→ 第 2 节重新 build 并提交。 |
