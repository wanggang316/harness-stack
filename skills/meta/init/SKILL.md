---
name: h-init
description: Initialize harness-stack in any project. Use when setting up harness for the first time in a new or existing project.
---

# h-init: Initialize harness-stack

## Overview

Scaffolds the complete harness-stack structure into any project, creating skills, agents, docs, and Claude Code integration.

## When to Use

**Use when**:
- Setting up harness-stack in a new project
- Adding harness to an existing codebase
- Bootstrapping a fresh repository

**Don't use when**:
- harness-stack already exists (use h-check instead)
- Only need specific skills (copy manually)

## Process

### Step 1: Detect Project Type

```bash
# Check for framework indicators
if [ -f "next.config.js" ] || [ -f "next.config.ts" ]; then
  PROJECT_TYPE="nextjs"
elif [ -f "package.json" ] && grep -q "express" package.json; then
  PROJECT_TYPE="express"
elif [ -f "package.json" ] && grep -q "react" package.json; then
  PROJECT_TYPE="react"
else
  PROJECT_TYPE="generic"
fi
```

### Step 2: Create Directory Structure

```bash
mkdir -p skills/meta
mkdir -p skills/{01-define,02-plan,03-build,04-verify,05-review,06-ship}
mkdir -p agents
mkdir -p .claude/{commands,hooks}
mkdir -p docs/references
mkdir -p examples
```

### Step 3: Generate AGENTS.md

Create entry point map (100-150 lines) pointing to:
- Meta-skills (h-init, h-check, h-score, h-skill-create)
- Lifecycle skills by phase
- Subagents
- Documentation

### Step 4: Copy Skill Templates

Copy all SKILL.md files from harness-stack:
- `skills/meta/` → 4 meta-skills
- `skills/01-define/` → h-spec
- `skills/02-plan/` → h-plan, h-architecture
- `skills/03-build/` → h-build, h-tdd
- `skills/04-verify/` → h-debug
- `skills/05-review/` → h-review, h-security
- `skills/06-ship/` → h-git, h-ship

### Step 5: Copy Agent Personas

Copy agent definitions:
- `agents/h-architect.md`
- `agents/h-code-reviewer.md`
- `agents/h-test-engineer.md`

### Step 6: Configure Claude Code Integration

Create `.claude/commands/` for each skill:
```markdown
---
name: h-xxx
description: Brief description
---

Load and execute the h-xxx skill from skills/.../SKILL.md
```

Create `.claude/hooks/hooks.json`:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "cat AGENTS.md"
      }
    ]
  }
}
```

### Step 7: Create Documentation

- `docs/index.md` — Documentation hub
- `docs/golden-rules.md` — Core principles
- `docs/architecture.md` — System design
- `docs/references/` — Checklists

### Step 8: Verify Installation

Run h-check to validate structure:
```bash
# Check AGENTS.md exists and is under 150 lines
wc -l AGENTS.md

# Verify all skill directories exist
ls skills/meta/
ls skills/01-define/

# Test Claude Code integration
# In Claude Code: /h-check
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just copy the files I need" | Incomplete setup leads to broken references and missing dependencies. Use h-init for complete structure. |
| "I don't need all the skills" | You don't know what you'll need later. Install everything, use what you need. Disk space is cheap. |
| "I'll create the structure manually" | Manual setup is error-prone. h-init ensures consistency and completeness. |
| "My project is too different" | harness-stack is platform-agnostic. It adapts to your project type. |

## Red Flags

- AGENTS.md missing or over 150 lines
- Incomplete directory structure
- Missing .claude/hooks/hooks.json
- Skills copied but commands not created
- Documentation structure incomplete

## Verification

- [ ] AGENTS.md exists and is 100-150 lines
- [ ] All skill directories created (meta + 6 phases)
- [ ] All agent files exist (3 minimum)
- [ ] .claude/commands/ has 8+ command files
- [ ] .claude/hooks/hooks.json configured
- [ ] docs/ structure complete
- [ ] /h-check runs without errors
- [ ] SessionStart hook loads AGENTS.md

## Implementation Notes

**For Agent executing this skill**:

1. If harness-stack source is available locally, copy from it
2. Otherwise, generate files based on templates in this skill
3. Adapt AGENTS.md to detected project type
4. Preserve existing files (don't overwrite)
5. Report what was created and next steps

**Next steps after h-init**:
- Run `/h-check` to validate
- Read `docs/golden-rules.md`
- Try `/h-spec` for your first feature
