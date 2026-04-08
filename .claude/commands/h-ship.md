Load and execute the h-ship skill for shipping and launch.

Read the skill definition at skills/06-ship/ship/SKILL.md and follow its Process section step by step.

Pre-launch checklist:
1. Code quality — all tests pass, build clean, linting clean
2. Security — h-security audit passed, no known vulnerabilities
3. Performance — load tested, no obvious bottlenecks
4. Documentation — README updated, API docs current
5. Git — clean history, descriptive commits (use h-git skill)
6. Monitoring — error tracking, logging, alerting configured
7. Rollback plan — know how to revert if something goes wrong

Staged rollout:
staging → production (flag off) → team → canary (5%) → gradual (25%→50%→100%)
