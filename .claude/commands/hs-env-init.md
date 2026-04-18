Load and execute the hs-env-init skill to initialize per-worktree isolated runtime environments.

Read the skill definition at skills/hs-env-init/SKILL.md and follow its Process section step by step.

Steps:
1. Detect project structure (single-package or monorepo)
2. Ask user to choose database strategy (multi-database or embedded)
3. Generate .env.template with parameterized ports
4. Generate runtime scripts (env-init, env-start, env-stop, env-teardown)
5. Create .worktree-runtime/ directory structure
6. Verify environment isolation

Load reference files on demand:
- references/port-strategy.md — for port offset algorithm and monorepo patterns
- references/database-strategy.md — for database isolation options
- references/runtime-lifecycle.md — for PID/log management and script templates
