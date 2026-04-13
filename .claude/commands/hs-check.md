Load and execute the hs-check skill to validate harness-stack structure.

Read the skill definition at skills/hs-check/SKILL.md and follow its Process section step by step.

Steps:
1. Check AGENTS.md exists and is under 150 lines
2. Validate all SKILL.md files have required sections (Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification)
3. Validate YAML frontmatter (name and description fields)
4. Check all agent persona files exist and have required sections
5. Verify .claude/commands/ has all command files
6. Verify .claude/hooks/hooks.json is configured
7. Check docs/ structure is complete
8. Scan for broken internal links
9. Generate report with pass/fail and FIX: instructions for failures
