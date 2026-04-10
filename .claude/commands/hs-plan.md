Load and execute the hs-plan skill for planning and task breakdown.

Read the skill definition at skills/02-plan/plan/SKILL.md and follow its Process section step by step.

Steps:
1. Enter plan mode — read spec and codebase, do NOT write code
2. Identify the dependency graph between components
3. Slice vertically — each task delivers working end-to-end functionality
4. Write tasks with acceptance criteria, verification steps, dependencies, and file estimates
5. Order tasks by dependency, add checkpoints every 2-3 tasks
6. Ensure no task touches more than ~5 files
7. Present plan for human review before implementation

For complex features, consult the hs-architect subagent for architectural guidance.
