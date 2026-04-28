Load and execute the hs-changelog skill for changelog management.

Read the skill definition at skills/hs-changelog/SKILL.md and follow its Process section step by step.

Steps:
1. Check if CHANGELOG.md exists
2. If not, create it with Keep a Changelog format
3. If exists, ask user intent: extract changes to [Unreleased] or cut a release
4. Extract git changes, classify, and present for human confirmation before writing
