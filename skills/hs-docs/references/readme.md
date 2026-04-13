# README.md

The project entry point for humans. A developer should be able to clone, install, and run the project by reading only this file.

## When to Write

- New project initialization
- README is missing or says nothing useful
- Quick start instructions are wrong or incomplete

## Process

1. **Read the project** — Understand what it does, how to run it, what the key commands are
2. **Write one paragraph** — What this project does, in plain language
3. **Write Quick Start** — Clone → Install → Configure → Run, with exact commands that work
4. **List Commands** — Table of all dev commands with descriptions
5. **Describe Architecture** — Brief structure overview, link to ADRs for details
6. **Save** — Write to `README.md` in project root

## Structure

```markdown
# [Project Name]

One-paragraph description of what this project does.

## Quick Start

\```bash
git clone <repo-url>
cd <project>
npm install
cp .env.example .env
npm run dev
\```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm test` | Run tests |
| `npm run build` | Production build |
| `npm run lint` | Run linter |

## Architecture

Brief overview of the project structure and key design decisions.
Link to ADRs in `docs/adrs/` for details.

## Contributing

How to contribute, coding standards, PR process.
```

## Verification

- [ ] One-paragraph description exists and is accurate
- [ ] Quick start commands are correct and tested
- [ ] All key commands listed in table
- [ ] Architecture overview present with links to deeper docs
