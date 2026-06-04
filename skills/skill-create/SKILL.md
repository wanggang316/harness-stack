---
name: skill-create
description: Create new harness-stack skills. Use when adding a new skill to the framework, extending lifecycle coverage, or building custom skills.
---

# skill-create: Create New Skills

## Overview

Guided workflow for creating new harness-stack skills. Generates SKILL.md with all required sections, creates the corresponding slash command, and validates the result.

## When to Use

**Use when**:
- Adding a new skill to harness-stack
- Creating project-specific custom skills
- Extending lifecycle coverage to new domains

**Don't use when**:
- Modifying an existing skill (edit SKILL.md directly)
- Need a one-off script (not a reusable skill)

## Process

### Step 1: Gather Information

Ask the user:
1. **Name**: What should the skill be called? (bare name, no prefix — addressed as `harness-stack:{name}`)
2. **Phase**: Which lifecycle phase? (define/plan/build/verify/review/ship/meta)
3. **Purpose**: What does this skill do? (1-2 sentences)
4. **Trigger**: When should this skill be used?

### Step 2: Determine Location

All skills live directly under `skills/`; the directory name is the bare skill name (no prefix). The `harness-stack` plugin namespace makes it addressable as `harness-stack:{name}`:

```
skills/{name}/SKILL.md
```

### Step 3: Generate SKILL.md

Create `skills/{name}/SKILL.md`:

```markdown
---
name: {name}
description: {purpose}. Use when {trigger}.
---

# {name}: {Title}

## Overview
{purpose}

## When to Use
**Use when**:
- {trigger conditions}

**Don't use when**:
- {exclusion conditions}

## Process
### Step 1: {first step}
{details}

### Step 2: {second step}
{details}

## Common Rationalizations
| Rationalization | Reality |
|---|---|
| "{excuse 1}" | {rebuttal 1} |
| "{excuse 2}" | {rebuttal 2} |

## Red Flags
- {violation 1}
- {violation 2}

## Verification
- [ ] {exit criterion 1}
- [ ] {exit criterion 2}
```

### Step 4: Create Slash Command

Create `commands/{name}.md`:

```markdown
Load and execute the harness-stack:{name} skill.

Read the skill definition at skills/{name}/SKILL.md and follow its Process section step by step.

Context: {brief context about when this runs}
```

### Step 5: Update AGENTS.md

Add the new skill to the appropriate section in AGENTS.md.
Verify AGENTS.md stays under 150 lines.

### Step 6: Validate

Verify:
- SKILL.md has all required sections
- YAML frontmatter is valid
- Slash command exists
- AGENTS.md updated and under 150 lines

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just write a quick SKILL.md without all sections" | Incomplete skills get ignored. All sections serve a purpose. |
| "Common Rationalizations is overkill for this skill" | Every skill has excuses agents use to skip it. Think harder. |
| "I don't need a slash command" | Commands are how users discover and invoke skills. Always create one. |
| "I'll update AGENTS.md later" | If it's not in AGENTS.md, it doesn't exist for agents. Update now. |

## Red Flags

- SKILL.md missing required sections
- No Common Rationalizations table
- Slash command not created
- AGENTS.md not updated
- Skill name carries a redundant `hs-`/`harness-stack:` prefix (the directory name must be the bare skill name)

## Verification

- [ ] SKILL.md created with all 6 required sections
- [ ] YAML frontmatter has name and description
- [ ] Description starts with action verb and includes "Use when"
- [ ] Common Rationalizations has 2+ entries
- [ ] Slash command created in commands/
- [ ] AGENTS.md updated (and still under 150 lines)
- [ ] All validations pass
