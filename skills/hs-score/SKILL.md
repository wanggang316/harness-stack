---
name: hs-score
description: Generate quality scorecard for harness-stack. Use when assessing project health, tracking improvement, or reporting quality metrics.
---

# hs-score: Quality Scorecard

## Overview

Generates a quality scorecard measuring harness-stack completeness, documentation health, and skill coverage. Produces a letter grade (A-F) with actionable improvement suggestions.

## When to Use

**Use when**:
- Assessing overall project health
- Tracking improvement over time
- Reporting quality metrics to team
- After adding new skills or docs

**Don't use when**:
- harness-stack not yet set up
- Need specific validation (use hs-check instead)

## Process

### Step 1: Measure Skill Coverage

```
Score each lifecycle phase (0-100):

Define:  Has hs-define-product? (+25) Has hs-define-architecture? (+25) Has hs-spec? (+25) Has hs-design? (+25)
Plan:    Has hs-planner? (+50) Has hs-exec-plan? (+50)
Build:   Has hs-tdd? (+100)
Verify:  Has hs-debug? (+100)
Review:  Has hs-review? (+50) Has hs-security? (+50)
Ship:    Has hs-git? (+50) Has hs-ship? (+50)

Lifecycle Coverage = average of all phases
```

### Step 2: Measure Skill Quality

For each SKILL.md, check completeness:
```
+15 points: Has Overview section
+15 points: Has When to Use section
+25 points: Has Process section (most important)
+20 points: Has Common Rationalizations table
+10 points: Has Red Flags section
+15 points: Has Verification section

Skill Quality = average across all skills
```

### Step 3: Measure Documentation Health

```
+20 points: AGENTS.md exists and ≤150 lines
+15 points: docs/index.md exists
+15 points: docs/golden-rules.md exists
+15 points: docs/architecture.md exists
+15 points: References directory has files
+10 points: No broken links
+10 points: All docs updated within 30 days

Documentation Health = sum of applicable points
```

### Step 4: Measure Agent Coverage

```
+34 points: hs-architect exists
+33 points: hs-code-reviewer exists
+33 points: hs-test-engineer exists

Agent Coverage = sum
```

### Step 5: Measure Integration

```
+30 points: .claude/commands/ has all commands
+30 points: .claude/hooks/hooks.json configured
+20 points: SessionStart hook loads AGENTS.md
+20 points: All commands map to valid skills

Integration Score = sum
```

### Step 6: Calculate Overall Grade

```
Overall = (Lifecycle × 0.30) + (Quality × 0.25) + (Docs × 0.20) + (Agents × 0.10) + (Integration × 0.15)

A: 90-100  |  B: 80-89  |  C: 70-79  |  D: 60-69  |  F: <60
```

### Step 7: Generate Report

```
=== hs-score Report ===

Lifecycle Coverage:  85/100  ████████░░
Skill Quality:       92/100  █████████░
Documentation:       70/100  ███████░░░
Agent Coverage:      100/100 ██████████
Integration:         90/100  █████████░

Overall: 87/100 — Grade: B

Top Improvements:
1. (+10) Create docs/architecture.md
2. (+5)  Add Common Rationalizations to hs-debug
3. (+5)  Fix 2 broken links in docs/
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Score doesn't matter, the code works" | Score tracks maintainability. Working code with poor harness rots fast. |
| "We'll improve the score later" | Technical debt compounds. Small improvements now prevent big problems later. |
| "100% is overkill" | Aim for A (90+). Perfection isn't needed, but completeness matters. |

## Red Flags

- Score declining over time
- Lifecycle phases with 0% coverage
- Skill quality below 70%
- Documentation health below 50%

## Verification

- [ ] Report generated with all 5 dimensions
- [ ] Letter grade calculated correctly
- [ ] Top improvements are actionable
- [ ] Scores match actual project state
