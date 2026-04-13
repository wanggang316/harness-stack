---
name: hs-check
description: Validate harness-stack structure and documentation. Use when verifying project setup, before merging, or as part of CI.
---

# hs-check: Validate Structure

## Overview

Validates that harness-stack structure is complete and correct. Checks file existence, format compliance, link health, and documentation freshness. Returns agent-friendly errors with FIX: instructions.

## When to Use

**Use when**:
- After running hs-init to verify setup
- Before merging PRs that touch skills/docs
- As periodic health check
- In CI pipelines

**Don't use when**:
- harness-stack not yet initialized (use hs-init first)

## Process

### Step 1: Check AGENTS.md

```bash
# Must exist
test -f AGENTS.md || echo "FAIL: AGENTS.md missing. FIX: Run /hs-init"

# Must be under 150 lines
LINES=$(wc -l < AGENTS.md)
[ "$LINES" -le 150 ] || echo "FAIL: AGENTS.md is $LINES lines (max 150). FIX: Move content to docs/"
```

### Step 2: Validate Skill Structure

For each skill directory, verify:

1. **SKILL.md exists**
```bash
find skills/ -name "SKILL.md" | while read f; do
  echo "OK: $f"
done
```

2. **YAML frontmatter present** — Must have `name` and `description`
3. **Required sections exist**:
   - Overview
   - When to Use
   - Process
   - Common Rationalizations
   - Red Flags
   - Verification

### Step 3: Validate Agent Personas

For each agent file in `agents/`:
1. File exists and is non-empty
2. Has sections: Role, When to Use, Expertise, Process

### Step 4: Check Claude Code Integration

```bash
# Commands directory exists
test -d .claude/commands/ || echo "FAIL: .claude/commands/ missing"

# Each skill has a corresponding command
for skill in hs-init hs-check hs-score hs-spec hs-design hs-plan hs-build hs-review hs-ship; do
  test -f ".claude/commands/$skill.md" || echo "FAIL: Missing command $skill.md"
done

# Hooks configured
test -f .claude/hooks/hooks.json || echo "FAIL: hooks.json missing"
```

### Step 5: Check Documentation

```bash
# Required docs exist
for doc in docs/index.md docs/golden-rules.md; do
  test -f "$doc" || echo "FAIL: $doc missing. FIX: Create it"
done
```

### Step 6: Check Links

Scan all .md files for broken internal links:
```bash
grep -roh '\[.*\](.*\.md)' docs/ skills/ agents/ | while read link; do
  target=$(echo "$link" | sed 's/.*(\(.*\))/\1/')
  test -f "$target" || echo "WARN: Broken link: $target"
done
```

### Step 7: Generate Report

Output format:
```
=== hs-check Report ===
✓ AGENTS.md: OK (87 lines)
✓ Skills: 12/12 valid
✓ Agents: 3/3 valid
✓ Commands: 8/8 present
✓ Hooks: configured
✓ Docs: complete
✗ Links: 1 broken link found

FAIL: docs/references/testing-patterns.md referenced but missing
FIX: Create docs/references/testing-patterns.md or remove the link

Score: 11/12 checks passed
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's just a small change, no need to check" | Small changes break links and structure. Always check. |
| "I'll fix the warnings later" | Warnings become errors. Fix now while context is fresh. |
| "The CI will catch it" | CI runs hs-check too, but catching locally is faster. |

## Red Flags

- hs-check never run after changes
- Warnings ignored for multiple commits
- AGENTS.md growing beyond 150 lines
- Skills missing required sections

## Verification

- [ ] All checks pass (or failures have FIX: instructions)
- [ ] No broken internal links
- [ ] AGENTS.md under 150 lines
- [ ] All skills have required sections
- [ ] All commands map to existing skills
