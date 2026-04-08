Load and execute the h-build skill for incremental implementation.

Read the skill definition at skills/03-build/build/SKILL.md and follow its Process section step by step.

Steps:
1. Pick the next task from the plan
2. Implement the smallest complete piece of functionality
3. Test — run the test suite
4. Verify — confirm tests pass and build succeeds
5. Commit — save progress with a descriptive message
6. Repeat for the next slice

Rules:
- Simplicity first: "What is the simplest thing that could work?"
- Scope discipline: Touch only what the task requires
- One thing at a time: Each increment changes one logical thing
- Keep it compilable: Project must build after each increment
- Feature flags for incomplete features
