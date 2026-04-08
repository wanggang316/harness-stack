# Architecture

## Overview

harness-stack implements the **harness methodology** from OpenAI's Codex team. It's a pure Agent-driven development framework where humans provide direction and agents execute.

## Core Philosophy

**Humans**: Design systems, clarify intent, build feedback loops  
**Agents**: Implement features, run tests, deploy code

## Three Pillars

### 1. Progressive Disclosure
- **AGENTS.md** as 100-150 line map (not encyclopedia)
- Short entry point → deep docs on demand
- Prevents context pollution

### 2. Repository Knowledge as System of Record
- All knowledge versioned in-repo
- What agents can't access doesn't exist
- Docs co-evolve with code

### 3. Pure Agent-Driven Architecture
- No external CLI tools
- Everything is Skill or Subagent
- Self-bootstrapping capability

## Architecture Layers

```
┌─────────────────────────────────────────┐
│  Entry Layer: AGENTS.md                 │
│  - Navigation map                        │
│  - Points to skills/agents/docs          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Execution Layer: Skills + Agents       │
│  - Meta-skills (manage harness)          │
│  - Lifecycle skills (6 phases)           │
│  - Specialized subagents                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Knowledge Layer: docs/                  │
│  - Golden rules                          │
│  - Reference checklists                  │
│  - Architecture docs                     │
└─────────────────────────────────────────┘
```

## Skill Organization

Skills organized by development lifecycle:

1. **Define** - Write specs before code
2. **Plan** - Break work into tasks
3. **Build** - Implement incrementally
4. **Verify** - Debug and test
5. **Review** - Ensure quality
6. **Ship** - Deploy and release

Plus **Meta-skills** that manage harness itself.

## Agent Personas

Specialized subagents for complex judgment:

- **h-architect** - System design, technical decisions
- **h-code-reviewer** - PR review, quality enforcement
- **h-test-engineer** - Test strategy, coverage analysis
- **h-security-auditor** - Security review, OWASP compliance
- **h-performance-engineer** - Performance optimization
- **h-doc-gardener** - Documentation maintenance

## Skill Anatomy

Every skill follows consistent structure:

```markdown
---
name: h-xxx
description: What + when to use
---

# Title

## Overview
What and why (1-2 sentences)

## When to Use
Positive triggers + negative exclusions

## Process
Step-by-step workflow with commands

## Common Rationalizations
| Excuse | Reality |
Preemptively address agent rationalizations

## Red Flags
Observable violations

## Verification
Exit criteria with evidence requirements
```

## Key Design Decisions

### 1. h- Prefix
All skills/agents use `h-` prefix to avoid conflicts with user's existing skills.

### 2. Anti-Rationalization Tables
Every skill includes table of excuses agents use to skip steps, with rebuttals.

### 3. Evidence-Based Verification
Every verification checklist requires concrete proof before proceeding.

### 4. Platform-Agnostic
Skills never hardcode framework commands. Read config or ask user once.

### 5. Self-Bootstrapping
harness can improve itself using its own skills (h-skill-create, h-check).

## Workflow Example

```
Human: "Implement user login"
  ↓
Agent: /h-spec (write specification)
  ↓
Agent: /h-plan (break into tasks, consult h-architect)
  ↓
Agent: /h-build (incremental implementation)
  ↓
Agent: /h-tdd (write tests)
  ↓
Agent: /h-review (quality check, consult h-code-reviewer)
  ↓
Agent: /h-ship (deploy, consult h-git)
  ↓
Result: Feature complete and deployed
```

## Integration

### Claude Code
- Slash commands in `.claude/commands/`
- SessionStart hook loads AGENTS.md
- Skills invoked via `/h-xxx`

### CI/CD
- GitHub Actions can run h-check
- Quality gates via h-score
- Automated validation

## References

- [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/)
- [Long-Running Application Development](https://openai.com/index/harness-design-for-long-running-application-development/)
