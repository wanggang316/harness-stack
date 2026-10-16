# {{PROJECT_NAME}}

## Quick Start

<!-- The 3-4 commands an agent needs to build, test, and lint -->
<!-- agent 用来 build、test、lint 的那 3-4 条命令 -->

```bash
{{BUILD_COMMAND}}
{{LINT_COMMAND}}
{{TEST_COMMAND}}
```

## Architecture Overview

<!-- One paragraph: what the system does, architectural style, key domains -->
<!-- 一段话：系统做什么、架构风格、关键领域 -->

domains、layers 和依赖规则见 [Architecture](docs/architecture.md)。

## Repository Structure

<!-- Directory tree with one-line comment per directory. Reflect actual layout -->
<!-- 目录树，每个目录一行注释。要反映实际布局 -->

```
{{PROJECT_NAME}}/
├── src/                        # Source
├── tests/                      # Test suites
├── docs/                       # Project documentation
└── .github/workflows/          # CI workflows
```

## Golden Rules

<!-- Top 5 rules inline. Link to full list for the rest -->
<!-- 内联给出最重要的 5 条规则。其余链到完整清单 -->

1. **AGENTS.md is a map, not a manual** —— 本文件保持在 150 行以内
2. **Validate boundaries** —— 在系统边界解析并校验数据，绝不臆测
3. **Prefer shared utilities** —— 集中不变量，避免手搓重复实现
4. **Every complex change runs feature-driven development** —— 构建前先做 contract-first 的 plan
5. **Fix the environment, not the prompt** —— agent 受阻时，补上缺失的工具 / 文档 / 护栏

完整清单连同其理由与 enforcement 见 [Golden Rules](docs/golden-rules.md)。

## Documentation

<!-- Table of docs/ subdirectories. Start with the area relevant to your task -->
<!-- docs/ 子目录一览表。从与你任务相关的区域开始 -->

| Directory | Purpose |
|---|---|
| [docs/architecture.md](docs/architecture.md) | 系统架构、domains、layers |
| [docs/golden-rules.md](docs/golden-rules.md) | 受约束的原则与约定 |
| [docs/design-docs/](docs/design-docs/) | 技术设计文档（人工撰写） |
| docs/user-test-patterns.md | 全项目测试约定（工具链、cost tier、personas） |
| [docs/references/](docs/references/) | 外部文档、API references |
| [docs/generated/](docs/generated/) | 自动生成的 artifacts |
| `.harness-runtime/` | 逐 plan 的 FDD 状态（plan、contract、feature）—— **被 gitignore**，不属于 docs |

## Working with This Repository

<!-- Key workflows and boundaries -->
<!-- 关键工作流与边界 -->

- 动手改动前，先读你所触及区域的相关文档
- 复杂工作开始前，先跑 feature-driven development（`harness-stack:fdd`）
- 提交 PR 前先跑 lint 与 test
- 遵循架构文档里的依赖规则
- 出问题时，问一句：「缺了什么能力？」—— 然后把它补上

## Build & Test Commands

<!-- Full commands with inline comments -->
<!-- 完整命令，带内联注释 -->

```bash
{{BUILD_COMMAND}}          # Build project
{{LINT_COMMAND}}           # Run linter
{{TEST_COMMAND}}           # Run tests
```

## Code Style & Conventions

<!-- Key coding conventions, one per line -->
<!-- 关键编码约定，每行一条 -->

- [Linter/formatter tool and key settings]
- [Key code patterns or conventions]
- [Naming conventions]
